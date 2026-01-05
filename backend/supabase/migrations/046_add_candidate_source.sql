-- Add source column to candidates table
-- Values: 'internal' (from school) or 'external' (from outside)

ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'internal';

-- Create index for filtering by source
CREATE INDEX IF NOT EXISTS idx_candidates_source ON public.candidates(source);

-- Update existing candidates to have 'internal' as default
UPDATE public.candidates SET source = 'internal' WHERE source IS NULL;
