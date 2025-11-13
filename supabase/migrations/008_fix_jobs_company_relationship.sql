-- =====================================================
-- FIX JOBS-COMPANY RELATIONSHIP
-- =====================================================
-- Purpose: Add company_id column to jobs table to fix relationship
-- The code expects company_id but the database has school_id
-- =====================================================

-- Check if company_id exists, if not add it
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'jobs' AND column_name = 'company_id') THEN
        ALTER TABLE public.jobs ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
        CREATE INDEX idx_jobs_company_id ON public.jobs(company_id);
    END IF;
END $$;

-- If jobs table has school_id but not company_id populated, you may want to migrate data
-- This depends on your business logic - are schools and companies the same thing?
-- Uncomment below if you want to copy school_id to company_id
-- UPDATE public.jobs SET company_id = school_id WHERE company_id IS NULL AND school_id IS NOT NULL;
