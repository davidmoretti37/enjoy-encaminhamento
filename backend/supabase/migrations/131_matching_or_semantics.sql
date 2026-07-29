-- 131: Fix the matcher returning zero rows for every job.
--
-- 130 fixed the crashes (scalar required_skills, varchar/text mismatch) and the
-- function now runs cleanly on all 40 jobs — but returned 0 matches every time.
--
-- CAUSE
-- plainto_tsquery() joins every term with AND. The search text is
--   title + required_skills + requirements + specific_requirements
-- which for a real job is dozens of words, producing a tsquery like
--   'assistente' & 'administrativo' & 'excel' & 'atendimento' & ...
-- No candidate's profile contains ALL of those, so the @@ filter matched nobody.
-- The old function hid this behind the vector branch (which also returned
-- nothing, for lack of embeddings), so it looked like a vector problem.
--
-- FIX
-- Build an OR query instead: a candidate matching ANY term is a hit, and
-- ts_rank then orders them by how many terms they match and how strongly. That
-- is the behaviour you actually want from a recruitment matcher — rank the
-- field, don't require a perfect profile.
--
-- Lexemes are extracted via tsvector_to_array(to_tsvector(...)) rather than
-- naive string splitting, so they are already normalised and safe to join with
-- '|' (no injection risk, no need to escape punctuation).

BEGIN;

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

  -- OR semantics. Drop 1-2 char tokens (articles, stray initials) so they don't
  -- match everyone and flatten the ranking.
  SELECT COALESCE(NULLIF(string_agg(w, ' | '), '')::tsquery, NULL)
  INTO query_tsquery
  FROM (
    SELECT DISTINCT unnest(tsvector_to_array(to_tsvector('simple', search_text_val))) AS w
  ) lex
  WHERE length(w) > 2;

  RETURN QUERY
  WITH cand AS (
    SELECT
      c.*,
      to_tsvector('simple',
        COALESCE(c.summary, '') || ' ' ||
        COALESCE(CASE WHEN jsonb_typeof(c.skills) = 'array'
                      THEN (SELECT string_agg(e, ' ') FROM jsonb_array_elements_text(c.skills) AS e)
                      ELSE COALESCE(c.skills #>> '{}', '') END, '') || ' ' ||
        COALESCE(CASE WHEN jsonb_typeof(c.experience) = 'array'
                      THEN (SELECT string_agg(e, ' ') FROM jsonb_array_elements_text(c.experience) AS e)
                      ELSE '' END, '') || ' ' ||
        COALESCE(c.education_level::text, '') || ' ' ||
        COALESCE(c.city, '')
      ) AS doc
    FROM candidates c
    WHERE c.status = 'active'
  ),
  text_ranked AS (
    SELECT cand.id, ts_rank(cand.doc, query_tsquery)::double precision AS txt_score
    FROM cand
    WHERE query_tsquery IS NOT NULL AND cand.doc @@ query_tsquery
  ),
  vec_ranked AS (
    SELECT c.id, (1 - (c.embedding <=> j.embedding))::double precision AS vec_score
    FROM candidates c
    CROSS JOIN (SELECT embedding FROM jobs WHERE id = job_id_input) j
    WHERE has_job_vec AND c.embedding IS NOT NULL AND c.status = 'active'
      AND 1 - (c.embedding <=> j.embedding) >= match_threshold
  ),
  combined AS (
    SELECT
      COALESCE(t.id, v.id) AS cid,
      COALESCE(t.txt_score, 0) * 0.6 + COALESCE(v.vec_score, 0) * 0.4 AS blended,
      COALESCE(v.vec_score, COALESCE(t.txt_score, 0)) AS reported
    FROM text_ranked t
    FULL OUTER JOIN vec_ranked v ON v.id = t.id
  )
  SELECT
    c.id,
    c.full_name::text, c.email::text, c.phone::text, c.city::text, c.state::text,
    c.education_level::text, c.skills, c.languages, c.experience, c.summary,
    c.disc_dominante::numeric, c.disc_influente::numeric,
    c.disc_estavel::numeric, c.disc_conforme::numeric,
    to_jsonb(c.pdp_top_10_competencies),
    c.available_for_internship, c.available_for_clt, c.available_for_apprentice,
    c.preferred_work_type::text,
    -- ts_rank returns small numbers (~0.0x). Scale into a 0-1 band so the
    -- downstream soft-scoring model sees a usable spread, then add a same-city
    -- boost — location is the strongest non-AI signal ANEC has (270/274
    -- candidates have a city).
    LEAST(1.0, GREATEST(0.0,
      (cb.reported * 8.0)
      + CASE WHEN job_city IS NOT NULL AND c.city IS NOT NULL
                  AND job_city ILIKE '%' || c.city || '%' THEN 0.15 ELSE 0 END
    ))::double precision AS semantic_similarity
  FROM combined cb
  JOIN candidates c ON c.id = cb.cid
  ORDER BY cb.blended DESC, c.updated_at DESC NULLS LAST
  LIMIT match_count;
END;
$function$;

COMMIT;
