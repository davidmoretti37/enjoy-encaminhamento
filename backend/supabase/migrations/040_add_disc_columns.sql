-- Add DISC personality profile columns to candidates table
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS disc_influente INTEGER DEFAULT 0;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS disc_estavel INTEGER DEFAULT 0;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS disc_dominante INTEGER DEFAULT 0;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS disc_conforme INTEGER DEFAULT 0;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS disc_completed_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN public.candidates.disc_influente IS 'DISC Influente percentage (0-100)';
COMMENT ON COLUMN public.candidates.disc_estavel IS 'DISC Estavel percentage (0-100)';
COMMENT ON COLUMN public.candidates.disc_dominante IS 'DISC Dominante percentage (0-100)';
COMMENT ON COLUMN public.candidates.disc_conforme IS 'DISC Conforme percentage (0-100)';
COMMENT ON COLUMN public.candidates.disc_completed_at IS 'When the DISC assessment was completed';
