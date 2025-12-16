-- Add columns to jobs table for Excel import
-- These match the fields from the company onboarding form

-- Urgency of the job position
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS urgency TEXT;

-- Gender preference (if any)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS gender_preference TEXT;

-- Age range as text (e.g., "18-25", "17 21")
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS age_range TEXT;

-- Education level as text (more flexible than enum)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS education_level TEXT;

-- Notes/observations about the job
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS notes TEXT;
