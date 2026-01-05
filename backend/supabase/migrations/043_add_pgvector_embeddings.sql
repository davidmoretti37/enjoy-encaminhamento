-- Enable pgvector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns to candidates table
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add embedding columns to jobs table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create indexes for fast similarity search (using cosine distance)
-- Note: IVFFlat indexes require some data to exist first, so we use HNSW which doesn't
CREATE INDEX IF NOT EXISTS candidates_embedding_idx ON public.candidates
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS jobs_embedding_idx ON public.jobs
USING hnsw (embedding vector_cosine_ops);

-- Add comments for documentation
COMMENT ON COLUMN public.candidates.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions) for semantic matching';
COMMENT ON COLUMN public.jobs.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions) for semantic matching';

-- Create a function to find matching candidates for a job
CREATE OR REPLACE FUNCTION match_candidates_for_job(
  job_id_input UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 50
)
RETURNS TABLE (
  candidate_id UUID,
  full_name TEXT,
  city TEXT,
  state TEXT,
  education_level TEXT,
  skills TEXT[],
  summary TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as candidate_id,
    c.full_name,
    c.city,
    c.state,
    c.education_level,
    c.skills,
    c.summary,
    1 - (c.embedding <=> j.embedding) as similarity
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

-- Create a function to find matching jobs for a candidate
CREATE OR REPLACE FUNCTION match_jobs_for_candidate(
  candidate_id_input UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  job_id UUID,
  title TEXT,
  description TEXT,
  contract_type TEXT,
  work_type TEXT,
  location TEXT,
  summary TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id as job_id,
    j.title,
    j.description,
    j.contract_type,
    j.work_type,
    j.location,
    j.summary,
    1 - (j.embedding <=> c.embedding) as similarity
  FROM jobs j, candidates c
  WHERE c.id = candidate_id_input
    AND c.embedding IS NOT NULL
    AND j.embedding IS NOT NULL
    AND j.status = 'open'
    AND 1 - (j.embedding <=> c.embedding) >= match_threshold
  ORDER BY j.embedding <=> c.embedding
  LIMIT match_count;
END;
$$;
