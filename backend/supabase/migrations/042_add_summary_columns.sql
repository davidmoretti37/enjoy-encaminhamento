-- Add AI-generated summary columns to candidates and jobs tables

-- Candidate summary (generated after DISC + PDP completion)
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS summary_generated_at TIMESTAMPTZ;

-- Job summary (generated on job creation)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS summary_generated_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.candidates.summary IS 'AI-generated comprehensive profile summary for matching';
COMMENT ON COLUMN public.candidates.summary_generated_at IS 'When the AI summary was last generated';
COMMENT ON COLUMN public.jobs.summary IS 'AI-generated job description summary for matching';
COMMENT ON COLUMN public.jobs.summary_generated_at IS 'When the AI summary was last generated';
