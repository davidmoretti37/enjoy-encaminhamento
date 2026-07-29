-- 130: Make candidate matching actually work — without embeddings.
--
-- WHAT WAS WRONG (all verified on production)
--
-- 1. `jobs.required_skills` holds THREE different jsonb types:
--       string -> 22 jobs      array -> 12 jobs      null -> 6 jobs
--    `match_candidates_hybrid` calls jsonb_array_elements_text() on it, so for
--    22 of 40 jobs the RPC dies with:
--       ERROR 22023: cannot extract elements from a scalar
--    The TypeScript caller catches that and falls back to "first 500 active
--    candidates" with a hardcoded semantic_similarity of 0.5 — i.e. no ranking
--    at all. (backend/services/matching/index.ts:115-137)
--
-- 2. The vector half of the hybrid requires
--       c.embedding IS NOT NULL AND j.embedding IS NOT NULL
--    Production has ZERO embeddings on both candidates (0/274) and jobs (0/40),
--    because embeddings.ts posts to openrouter.ai/api/v1/embeddings — an
--    endpoint OpenRouter does not have and never did. So even the 12 jobs that
--    did not throw matched nobody.
--
-- 3. Because required_skills was unusable, scoreSkills() hit its
--    `if (requiredSkills.length === 0) return 100` branch — the highest-weighted
--    factor in the whole model was a constant.
--
-- THE FIX
-- Normalise the data, then make the RPC degrade gracefully: rank on full-text
-- when there are no embeddings, and blend both when there are. Nothing here
-- needs an LLM, so matching works today at zero cost per query — and silently
-- improves if embeddings are ever populated.
--
-- The RETURNS TABLE signature is unchanged, so the TypeScript caller is
-- untouched.

BEGIN;

-- ============================================================
-- 1. Normalise required_skills to always be a jsonb array
-- ============================================================
-- Scalars become a split-on-comma array; nulls become []. Applied to the whole
-- table so the 22 broken jobs start scoring properly.
UPDATE jobs
SET required_skills = (
  SELECT COALESCE(jsonb_agg(trimmed), '[]'::jsonb)
  FROM (
    SELECT btrim(part) AS trimmed
    FROM regexp_split_to_table(required_skills #>> '{}', '\s*[,;/]\s*') AS part
    WHERE btrim(part) <> ''
  ) s
)
WHERE jsonb_typeof(required_skills) = 'string';

UPDATE jobs
SET required_skills = '[]'::jsonb
WHERE required_skills IS NULL OR jsonb_typeof(required_skills) NOT IN ('array');

-- Keep it that way regardless of which write path runs. Dropped first so this
-- migration is idempotent and can be safely re-run.
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_required_skills_is_array;
ALTER TABLE jobs
  ADD CONSTRAINT jobs_required_skills_is_array
  CHECK (required_skills IS NULL OR jsonb_typeof(required_skills) = 'array')
  NOT VALID;

-- ============================================================
-- 2. Rebuild the hybrid matcher to survive missing embeddings
-- ============================================================
CREATE OR REPLACE FUNCTION public.match_candidates_hybrid(
  job_id_input uuid,
  match_threshold double precision DEFAULT 0.2,
  match_count integer DEFAULT 500,
  rrf_k integer DEFAULT 60
)
RETURNS TABLE(
  candidate_id uuid, full_name text, email text, phone text, city text, state text,
  education_level text, skills jsonb, languages jsonb, experience jsonb, summary text,
  disc_dominante numeric, disc_influente numeric, disc_estavel numeric, disc_conforme numeric,
  pdp_top_10_competencies jsonb, available_for_internship boolean, available_for_clt boolean,
  available_for_apprentice boolean, preferred_work_type text, semantic_similarity double precision
)
LANGUAGE plpgsql
AS $function$
DECLARE
  query_tsquery   tsquery;
  search_text_val text;
  job_city        text;
  has_job_vec     boolean;
BEGIN
  -- Build the search text from the job. jsonb_array_elements_text is only safe
  -- on an array, so guard on jsonb_typeof — this is what used to raise 22023.
  SELECT
    COALESCE(j.title, '') || ' ' ||
    COALESCE(
      CASE WHEN jsonb_typeof(j.required_skills) = 'array'
           THEN (SELECT string_agg(elem, ' ') FROM jsonb_array_elements_text(j.required_skills) AS elem)
           WHEN jsonb_typeof(j.required_skills) = 'string'
           THEN j.required_skills #>> '{}'
           ELSE '' END, '') || ' ' ||
    COALESCE(j.requirements, '') || ' ' ||
    COALESCE(j.specific_requirements, ''),
    j.location,
    (j.embedding IS NOT NULL)
  INTO search_text_val, job_city, has_job_vec
  FROM jobs j
  WHERE j.id = job_id_input;

  IF search_text_val IS NULL THEN
    RETURN;
  END IF;

  query_tsquery := plainto_tsquery('simple', COALESCE(search_text_val, ''));

  RETURN QUERY
  WITH text_ranked AS (
    SELECT
      c.id,
      -- ts_rank over the candidate's own searchable text.
      ts_rank(
        to_tsvector('simple',
          COALESCE(c.summary, '') || ' ' ||
          COALESCE(CASE WHEN jsonb_typeof(c.skills) = 'array'
                        THEN (SELECT string_agg(e, ' ') FROM jsonb_array_elements_text(c.skills) AS e)
                        ELSE COALESCE(c.skills #>> '{}', '') END, '') || ' ' ||
          COALESCE(c.education_level::text, '') || ' ' ||
          COALESCE(c.city, '')
        ),
        query_tsquery
      )::double precision AS txt_score
    FROM candidates c
    WHERE c.status = 'active'
      AND (query_tsquery IS NULL OR query_tsquery = ''::tsquery OR
           to_tsvector('simple',
             COALESCE(c.summary, '') || ' ' ||
             COALESCE(CASE WHEN jsonb_typeof(c.skills) = 'array'
                           THEN (SELECT string_agg(e, ' ') FROM jsonb_array_elements_text(c.skills) AS e)
                           ELSE COALESCE(c.skills #>> '{}', '') END, '') || ' ' ||
             COALESCE(c.city, '')
           ) @@ query_tsquery)
  ),
  vec_ranked AS (
    -- Only meaningful once embeddings exist. Today this is empty, which is
    -- exactly why the old function returned nothing.
    SELECT c.id, (1 - (c.embedding <=> j.embedding))::double precision AS vec_score
    FROM candidates c
    CROSS JOIN (SELECT embedding FROM jobs WHERE id = job_id_input) j
    WHERE has_job_vec AND c.embedding IS NOT NULL AND c.status = 'active'
      AND 1 - (c.embedding <=> j.embedding) >= match_threshold
  ),
  combined AS (
    SELECT
      COALESCE(t.id, v.id) AS cid,
      -- When there are no vectors, this collapses to the text score alone
      -- instead of returning an empty set.
      COALESCE(t.txt_score, 0) * 0.6 + COALESCE(v.vec_score, 0) * 0.4 AS blended,
      COALESCE(v.vec_score, COALESCE(t.txt_score, 0)) AS reported
    FROM text_ranked t
    FULL OUTER JOIN vec_ranked v ON v.id = t.id
  )
  SELECT
    -- Explicit casts: these columns are varchar/enum/int[] in the table but the
    -- RETURNS TABLE signature (which the TypeScript caller depends on) declares
    -- text/jsonb/numeric. Postgres does not coerce these implicitly and raises
    -- 42804 without them.
    c.id,
    c.full_name::text, c.email::text, c.phone::text, c.city::text, c.state::text,
    c.education_level::text, c.skills, c.languages, c.experience, c.summary,
    c.disc_dominante::numeric, c.disc_influente::numeric,
    c.disc_estavel::numeric, c.disc_conforme::numeric,
    to_jsonb(c.pdp_top_10_competencies),
    c.available_for_internship, c.available_for_clt, c.available_for_apprentice,
    c.preferred_work_type::text,
    -- Nudge same-city candidates up; location is the strongest non-AI signal
    -- ANEC has (270 of 274 candidates have a city).
    LEAST(1.0, GREATEST(0.0,
      cb.reported + CASE WHEN job_city IS NOT NULL AND c.city IS NOT NULL
                          AND job_city ILIKE '%' || c.city || '%' THEN 0.15 ELSE 0 END
    ))::double precision AS semantic_similarity
  FROM combined cb
  JOIN candidates c ON c.id = cb.cid
  ORDER BY cb.blended DESC, c.updated_at DESC NULLS LAST
  LIMIT match_count;
END;
$function$;

COMMIT;
