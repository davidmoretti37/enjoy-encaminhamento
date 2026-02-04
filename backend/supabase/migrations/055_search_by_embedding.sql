-- Search candidates by embedding vector (for AI-powered smart search)
-- Takes a query embedding and finds candidates with similar embeddings

CREATE OR REPLACE FUNCTION search_candidates_by_embedding(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 50
)
RETURNS TABLE (
  candidate_id UUID,
  full_name TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as candidate_id,
    c.full_name,
    (1 - (c.embedding <=> query_embedding))::FLOAT as similarity
  FROM public.candidates c
  WHERE c.embedding IS NOT NULL
    AND c.status = 'active'
    AND 1 - (c.embedding <=> query_embedding) >= match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Search companies via their jobs' embeddings (for AI-powered smart search)
-- Takes a query embedding, finds matching jobs, returns the associated companies
-- Returns the best-matching job per company

CREATE OR REPLACE FUNCTION search_companies_by_job_embedding(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 50
)
RETURNS TABLE (
  company_id UUID,
  company_name TEXT,
  job_id UUID,
  job_title TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (co.id)
    co.id as company_id,
    co.company_name,
    j.id as job_id,
    j.title::TEXT as job_title,
    (1 - (j.embedding <=> query_embedding))::FLOAT as similarity
  FROM public.jobs j
  INNER JOIN public.companies co ON j.company_id = co.id
  WHERE j.embedding IS NOT NULL
    AND 1 - (j.embedding <=> query_embedding) >= match_threshold
  ORDER BY co.id, j.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
