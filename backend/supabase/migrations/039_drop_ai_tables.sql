-- Drop AI matching tables
DROP TABLE IF EXISTS public.job_matches;
DROP TABLE IF EXISTS public.job_matching_progress;

-- Drop AI score column from applications (if exists)
ALTER TABLE public.applications DROP COLUMN IF EXISTS ai_match_score;
