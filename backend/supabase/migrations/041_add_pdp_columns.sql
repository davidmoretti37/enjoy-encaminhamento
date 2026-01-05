-- Add PDP (Personal Development Profile) columns to candidates table
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS pdp_intrapersonal JSONB;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS pdp_interpersonal JSONB;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS pdp_skills JSONB;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS pdp_competencies TEXT[];
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS pdp_top_10_competencies TEXT[];
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS pdp_develop_competencies TEXT[];
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS pdp_action_plans JSONB;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS pdp_completed_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.candidates.pdp_intrapersonal IS 'PDP Intrapersonal answers (question_id -> answer text)';
COMMENT ON COLUMN public.candidates.pdp_interpersonal IS 'PDP Interpersonal answers (question_id -> answer text)';
COMMENT ON COLUMN public.candidates.pdp_skills IS 'PDP Skills by category (category_id -> skill names array)';
COMMENT ON COLUMN public.candidates.pdp_competencies IS 'All competencies the candidate has (competency names)';
COMMENT ON COLUMN public.candidates.pdp_top_10_competencies IS 'Top 10 strongest competencies';
COMMENT ON COLUMN public.candidates.pdp_develop_competencies IS '5 competencies to develop';
COMMENT ON COLUMN public.candidates.pdp_action_plans IS 'Action plans for each development competency';
COMMENT ON COLUMN public.candidates.pdp_completed_at IS 'When the PDP assessment was completed';
