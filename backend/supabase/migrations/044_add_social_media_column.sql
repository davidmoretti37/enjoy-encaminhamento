-- Add social_media column to candidates table
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS social_media TEXT;

-- Add experiences column to candidates table (array of strings for simple experience entries)
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS experiences TEXT[];
