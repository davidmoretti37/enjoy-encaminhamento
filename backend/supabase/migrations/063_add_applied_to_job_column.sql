-- Add applied_to_job column to job_matches table
-- This tracks whether the candidate applied directly to the job
-- Used to highlight proactive candidates in matching results

ALTER TABLE job_matches ADD COLUMN IF NOT EXISTS applied_to_job BOOLEAN DEFAULT FALSE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_matches_applied ON job_matches(job_id, applied_to_job) WHERE applied_to_job = TRUE;

-- Add index on applications for faster candidate lookups
CREATE INDEX IF NOT EXISTS idx_applications_job_candidate ON applications(job_id, candidate_id);
