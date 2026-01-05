-- Add AI-generated summary columns to companies table

-- Company summary (generated on company registration/onboarding)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS summary_generated_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.companies.summary IS 'AI-generated company profile summary for matching';
COMMENT ON COLUMN public.companies.summary_generated_at IS 'When the AI summary was last generated';
