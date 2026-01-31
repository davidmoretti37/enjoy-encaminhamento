-- Fix column name in match_candidates_broad function
-- The candidates table uses pdp_top_10_competencies (with underscores around 10)
-- but migration 047 incorrectly referenced pdp_top10_competencies

CREATE OR REPLACE FUNCTION public.match_candidates_broad(
  job_id_input UUID,
  match_threshold FLOAT DEFAULT 0.2,
  match_count INT DEFAULT 500
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
BEGIN
  RETURN QUERY
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
    1 - (c.embedding <=> j.embedding) as semantic_similarity
  FROM candidates c, jobs j
  WHERE j.id = job_id_input
    AND c.embedding IS NOT NULL
    AND j.embedding IS NOT NULL
    AND c.status = 'active'
    AND 1 - (c.embedding <=> j.embedding) >= match_threshold
  ORDER BY c.embedding <=> j.embedding
  LIMIT match_count;
END;
$$;
