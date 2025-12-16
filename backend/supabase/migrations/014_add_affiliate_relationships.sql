-- =====================================================
-- ADD AFFILIATE RELATIONSHIPS FOR REGIONAL DATA
-- =====================================================

-- The franchise system needs to track:
-- 1. Schools belong to affiliates (franchise owners) ✓ Already exists
-- 2. Companies belong to affiliates (same city/region)
-- 3. Jobs belong to companies (which belong to affiliates)
-- 4. Candidates can be associated with a city/affiliate
-- 5. Applications link candidates to jobs
-- 6. Contracts link candidates to companies

-- =====================================================
-- STEP 1: Add affiliate_id to companies table
-- =====================================================

-- Companies should belong to a franchise owner (affiliate) in their city
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES public.affiliates(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_companies_affiliate_id ON public.companies(affiliate_id);

COMMENT ON COLUMN public.companies.affiliate_id IS 'Reference to the affiliate (franchise owner) managing companies in this city';

-- =====================================================
-- STEP 2: Add city to candidates table (for regional association)
-- =====================================================

-- Candidates don't "belong" to affiliates, but we can track which city they're from
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_candidates_city ON public.candidates(city);

COMMENT ON COLUMN public.candidates.city IS 'City where the candidate is located (for franchise filtering)';

-- =====================================================
-- STEP 3: Ensure jobs table has company_id (should already exist)
-- =====================================================

-- Jobs should have company_id to link to companies
-- This should already exist from previous migrations, but let's ensure it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'jobs' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN company_id UUID REFERENCES public.companies(id);
  END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON public.jobs(company_id);

-- =====================================================
-- STEP 4: Ensure applications link candidates to jobs (should already exist)
-- =====================================================

-- Applications should link candidates to jobs
-- This should already exist, just ensuring it's there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'candidate_id'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN candidate_id UUID REFERENCES public.candidates(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'applications' AND column_name = 'job_id'
  ) THEN
    ALTER TABLE public.applications ADD COLUMN job_id UUID REFERENCES public.jobs(id);
  END IF;
END $$;

-- =====================================================
-- STEP 5: Ensure contracts have company_id
-- =====================================================

-- Contracts should link to companies (which link to affiliates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contracts' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.contracts ADD COLUMN company_id UUID REFERENCES public.companies(id);
  END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON public.contracts(company_id);

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================

-- Data Flow:
-- Affiliate (Franchise Owner)
--   └─> Schools (educational institutions in their city)
--   └─> Companies (businesses in their city)
--       └─> Jobs (posted by companies)
--           └─> Applications (candidates applying to jobs)
--               └─> Contracts (when candidate is hired)

-- Regional Queries:
-- - Affiliate can see all schools where school.affiliate_id = affiliate.id
-- - Affiliate can see all companies where company.affiliate_id = affiliate.id
-- - Affiliate can see all jobs through companies.jobs
-- - Affiliate can see all applications through companies.jobs.applications
-- - Affiliate can see all contracts through companies.contracts
-- - Affiliate can see candidates by filtering by city
