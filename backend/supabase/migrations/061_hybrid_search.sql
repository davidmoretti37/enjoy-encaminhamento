-- Hybrid Search: Keyword (tsvector) + Vector (pgvector) with Reciprocal Rank Fusion
-- Improves Stage 1 retrieval by catching exact keyword matches that vector search alone might miss

-- Step 1: Add tsvector column for full-text search
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS search_text tsvector;

-- Step 2: Create GIN index for fast text search
CREATE INDEX IF NOT EXISTS idx_candidates_search_text
ON public.candidates USING GIN(search_text);

-- Step 3: Function to build tsvector from candidate data
CREATE OR REPLACE FUNCTION build_candidate_search_text(
  p_skills JSONB,
  p_summary TEXT,
  p_education_level TEXT,
  p_experience JSONB,
  p_languages JSONB,
  p_city TEXT,
  p_state TEXT
)
RETURNS tsvector
LANGUAGE plpgsql
AS $$
DECLARE
  skills_text TEXT := '';
  experience_text TEXT := '';
  languages_text TEXT := '';
BEGIN
  -- Extract skills as text
  IF p_skills IS NOT NULL AND jsonb_typeof(p_skills) = 'array' THEN
    SELECT string_agg(elem::text, ' ')
    INTO skills_text
    FROM jsonb_array_elements_text(p_skills) AS elem;
  END IF;

  -- Extract experience roles/companies
  IF p_experience IS NOT NULL AND jsonb_typeof(p_experience) = 'array' THEN
    SELECT string_agg(
      COALESCE(elem->>'role', '') || ' ' ||
      COALESCE(elem->>'position', '') || ' ' ||
      COALESCE(elem->>'company', ''),
      ' '
    )
    INTO experience_text
    FROM jsonb_array_elements(p_experience) AS elem;
  END IF;

  -- Extract languages
  IF p_languages IS NOT NULL AND jsonb_typeof(p_languages) = 'array' THEN
    SELECT string_agg(elem::text, ' ')
    INTO languages_text
    FROM jsonb_array_elements_text(p_languages) AS elem;
  END IF;

  -- Combine with weighting: A = most important, D = least
  -- Use 'simple' config for skills (preserves tech terms like "React", "JavaScript")
  -- Use 'portuguese' config for natural language text
  RETURN
    setweight(to_tsvector('simple', COALESCE(skills_text, '')), 'A') ||
    setweight(to_tsvector('portuguese', COALESCE(p_summary, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(experience_text, '')), 'B') ||
    setweight(to_tsvector('portuguese', COALESCE(p_education_level, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(languages_text, '')), 'C') ||
    setweight(to_tsvector('portuguese', COALESCE(p_city, '') || ' ' || COALESCE(p_state, '')), 'D');
END;
$$;

-- Step 4: Trigger to auto-update search_text on INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_candidate_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := build_candidate_search_text(
    NEW.skills, NEW.summary, NEW.education_level::TEXT,
    NEW.experience, NEW.languages, NEW.city, NEW.state
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_candidate_search_text ON public.candidates;

CREATE TRIGGER trigger_update_candidate_search_text
BEFORE INSERT OR UPDATE OF skills, summary, education_level, experience, languages, city, state
ON public.candidates
FOR EACH ROW
EXECUTE FUNCTION update_candidate_search_text();

-- Step 5: Backfill existing rows
UPDATE public.candidates
SET search_text = build_candidate_search_text(
  skills, summary, education_level::TEXT, experience, languages, city, state
)
WHERE search_text IS NULL;

-- Step 6: Hybrid search RPC function using Reciprocal Rank Fusion (RRF)
CREATE OR REPLACE FUNCTION match_candidates_hybrid(
  job_id_input UUID,
  match_threshold FLOAT DEFAULT 0.2,
  match_count INT DEFAULT 500,
  rrf_k INT DEFAULT 60
)
RETURNS TABLE (
  candidate_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  education_level TEXT,
  skills JSONB,
  languages JSONB,
  experience JSONB,
  summary TEXT,
  disc_dominante NUMERIC,
  disc_influente NUMERIC,
  disc_estavel NUMERIC,
  disc_conforme NUMERIC,
  pdp_top_10_competencies JSONB,
  available_for_internship BOOLEAN,
  available_for_clt BOOLEAN,
  available_for_apprentice BOOLEAN,
  preferred_work_type TEXT,
  semantic_similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_tsquery tsquery;
  search_text_val TEXT;
BEGIN
  -- Build search query from job skills + title
  SELECT
    COALESCE(j.title, '') || ' ' ||
    COALESCE(
      (SELECT string_agg(elem::text, ' ')
       FROM jsonb_array_elements_text(j.required_skills) AS elem),
      ''
    )
  INTO search_text_val
  FROM jobs j WHERE j.id = job_id_input;

  -- Build tsquery using 'simple' config to match tech terms exactly
  query_tsquery := plainto_tsquery('simple', COALESCE(search_text_val, ''));

  RETURN QUERY
  WITH vector_results AS (
    SELECT
      c.id,
      1 - (c.embedding <=> j.embedding) as vec_similarity,
      ROW_NUMBER() OVER (ORDER BY c.embedding <=> j.embedding) as vec_rank
    FROM candidates c, jobs j
    WHERE j.id = job_id_input
      AND c.embedding IS NOT NULL
      AND j.embedding IS NOT NULL
      AND c.status = 'active'
      AND 1 - (c.embedding <=> j.embedding) >= match_threshold
    ORDER BY c.embedding <=> j.embedding
    LIMIT match_count * 2
  ),
  text_results AS (
    SELECT
      c.id,
      ts_rank_cd(c.search_text, query_tsquery, 32) as txt_rank,
      ROW_NUMBER() OVER (ORDER BY ts_rank_cd(c.search_text, query_tsquery, 32) DESC) as text_rank_num
    FROM candidates c
    WHERE c.status = 'active'
      AND c.search_text IS NOT NULL
      AND c.search_text @@ query_tsquery
    LIMIT match_count * 2
  ),
  combined AS (
    SELECT
      COALESCE(v.id, t.id) as cid,
      COALESCE(v.vec_similarity, 0) as vec_sim,
      -- RRF fusion: combines vector rank and text rank
      (1.0 / (rrf_k + COALESCE(v.vec_rank, match_count * 2))) +
      (1.0 / (rrf_k + COALESCE(t.text_rank_num, match_count * 2))) as rrf_score
    FROM vector_results v
    FULL OUTER JOIN text_results t ON v.id = t.id
  )
  SELECT
    c.id as candidate_id,
    c.full_name,
    c.email,
    c.phone,
    c.city,
    c.state,
    c.education_level::TEXT,
    c.skills::JSONB,
    c.languages::JSONB,
    c.experience::JSONB,
    c.summary,
    c.disc_dominante,
    c.disc_influente,
    c.disc_estavel,
    c.disc_conforme,
    c.pdp_top_10_competencies::JSONB,
    c.available_for_internship,
    c.available_for_clt,
    c.available_for_apprentice,
    c.preferred_work_type::TEXT,
    cb.vec_sim as semantic_similarity
  FROM combined cb
  JOIN candidates c ON c.id = cb.cid
  ORDER BY cb.rrf_score DESC
  LIMIT match_count;
END;
$$;
