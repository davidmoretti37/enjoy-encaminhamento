-- =====================================================
-- Rename franchise columns to affiliate throughout the database
-- =====================================================

-- Rename franchise_id to affiliate_id in schools table
ALTER TABLE public.schools RENAME COLUMN franchise_id TO affiliate_id;

-- Rename franchise_id to affiliate_id in candidates table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'candidates' AND column_name = 'franchise_id') THEN
    ALTER TABLE public.candidates RENAME COLUMN franchise_id TO affiliate_id;
  END IF;
END $$;

-- Rename franchise_id to affiliate_id in jobs table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'jobs' AND column_name = 'franchise_id') THEN
    ALTER TABLE public.jobs RENAME COLUMN franchise_id TO affiliate_id;
  END IF;
END $$;

-- Rename franchise_id to affiliate_id in job_matches table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'job_matches' AND column_name = 'franchise_id') THEN
    ALTER TABLE public.job_matches RENAME COLUMN franchise_id TO affiliate_id;
  END IF;
END $$;

-- Rename franchise_id to affiliate_id in contracts table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'contracts' AND column_name = 'franchise_id') THEN
    ALTER TABLE public.contracts RENAME COLUMN franchise_id TO affiliate_id;
  END IF;
END $$;

-- Rename franchise_id to affiliate_id in payments table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'payments' AND column_name = 'franchise_id') THEN
    ALTER TABLE public.payments RENAME COLUMN franchise_id TO affiliate_id;
  END IF;
END $$;

-- Rename franchise_id to affiliate_id in school_invitations table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'school_invitations' AND column_name = 'franchise_id') THEN
    ALTER TABLE public.school_invitations RENAME COLUMN franchise_id TO affiliate_id;
  END IF;
END $$;

-- Update indexes
DROP INDEX IF EXISTS idx_schools_franchise_id;
CREATE INDEX IF NOT EXISTS idx_schools_affiliate_id ON public.schools(affiliate_id);

DROP INDEX IF EXISTS idx_candidates_franchise_id;
CREATE INDEX IF NOT EXISTS idx_candidates_affiliate_id ON public.candidates(affiliate_id);

DROP INDEX IF EXISTS idx_jobs_franchise_id;
CREATE INDEX IF NOT EXISTS idx_jobs_affiliate_id ON public.jobs(affiliate_id);

DROP INDEX IF EXISTS idx_job_matches_franchise_id;
CREATE INDEX IF NOT EXISTS idx_job_matches_affiliate_id ON public.job_matches(affiliate_id);

DROP INDEX IF EXISTS idx_payments_franchise_id;
CREATE INDEX IF NOT EXISTS idx_payments_affiliate_id ON public.payments(affiliate_id);

DROP INDEX IF EXISTS idx_school_invitations_franchise_id;
CREATE INDEX IF NOT EXISTS idx_school_invitations_affiliate_id ON public.school_invitations(affiliate_id);

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
