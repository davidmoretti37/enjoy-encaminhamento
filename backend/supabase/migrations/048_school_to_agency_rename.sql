-- Migration 048: Rename schools to agencies, affiliate role to admin
-- This is a comprehensive cleanup migration for production readiness

-- ============================================
-- STEP 1: Rename the schools table to agencies
-- ============================================

ALTER TABLE public.schools RENAME TO agencies;

-- Rename the primary column
ALTER TABLE public.agencies RENAME COLUMN school_name TO agency_name;

-- ============================================
-- STEP 2: Rename school_id columns across all tables
-- ============================================

-- Users table
ALTER TABLE public.users RENAME COLUMN school_id TO agency_id;

-- Companies table
ALTER TABLE public.companies RENAME COLUMN school_id TO agency_id;

-- Candidates table
ALTER TABLE public.candidates RENAME COLUMN school_id TO agency_id;

-- Jobs table
ALTER TABLE public.jobs RENAME COLUMN school_id TO agency_id;

-- Contracts table
ALTER TABLE public.contracts RENAME COLUMN school_id TO agency_id;

-- Scheduled meetings table
ALTER TABLE public.scheduled_meetings RENAME COLUMN school_id TO agency_id;

-- Candidate batches table
ALTER TABLE public.candidate_batches RENAME COLUMN school_id TO agency_id;

-- Email outreach table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_outreach' AND column_name = 'school_id') THEN
    ALTER TABLE public.email_outreach RENAME COLUMN school_id TO agency_id;
  END IF;
END $$;

-- Feedback table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feedback' AND column_name = 'school_id') THEN
    ALTER TABLE public.feedback RENAME COLUMN school_id TO agency_id;
  END IF;
END $$;

-- Payments table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'school_id') THEN
    ALTER TABLE public.payments RENAME COLUMN school_id TO agency_id;
  END IF;
END $$;

-- ============================================
-- STEP 3: Rename school-related tables
-- ============================================

-- School invitations -> Agency invitations
ALTER TABLE public.school_invitations RENAME TO agency_invitations;

-- School employee type settings -> Agency employee type settings
ALTER TABLE public.school_employee_type_settings RENAME TO agency_employee_type_settings;
ALTER TABLE public.agency_employee_type_settings RENAME COLUMN school_id TO agency_id;

-- Admin school context -> Admin agency context
ALTER TABLE public.admin_school_context RENAME TO admin_agency_context;
ALTER TABLE public.admin_agency_context RENAME COLUMN school_id TO agency_id;

-- ============================================
-- STEP 4: Update user roles
-- ============================================

-- Change 'affiliate' role to 'admin'
UPDATE public.users SET role = 'admin' WHERE role = 'affiliate';

-- Change 'school' role to 'agency'
UPDATE public.users SET role = 'agency' WHERE role = 'school';

-- ============================================
-- STEP 5: Update indexes
-- ============================================

-- Drop old indexes and create new ones
DROP INDEX IF EXISTS idx_schools_affiliate_id;
DROP INDEX IF EXISTS idx_schools_status;
DROP INDEX IF EXISTS idx_users_school_id;
DROP INDEX IF EXISTS idx_companies_school_id;
DROP INDEX IF EXISTS idx_candidates_school_id;
DROP INDEX IF EXISTS idx_jobs_school_id;
DROP INDEX IF EXISTS idx_contracts_school_id;
DROP INDEX IF EXISTS idx_candidate_batches_school_id;

-- Create new indexes with updated names
CREATE INDEX IF NOT EXISTS idx_agencies_affiliate_id ON public.agencies(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_agencies_status ON public.agencies(status);
CREATE INDEX IF NOT EXISTS idx_users_agency_id ON public.users(agency_id);
CREATE INDEX IF NOT EXISTS idx_companies_agency_id ON public.companies(agency_id);
CREATE INDEX IF NOT EXISTS idx_candidates_agency_id ON public.candidates(agency_id);
CREATE INDEX IF NOT EXISTS idx_jobs_agency_id ON public.jobs(agency_id);
CREATE INDEX IF NOT EXISTS idx_contracts_agency_id ON public.contracts(agency_id);
CREATE INDEX IF NOT EXISTS idx_candidate_batches_agency_id ON public.candidate_batches(agency_id);

-- ============================================
-- STEP 6: Fix any remaining franchise_id references
-- ============================================

-- Check if franchise_id column exists in candidates and rename to affiliate_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'candidates' AND column_name = 'franchise_id') THEN
    ALTER TABLE public.candidates RENAME COLUMN franchise_id TO affiliate_id;
  END IF;
END $$;

-- Check in jobs table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'franchise_id') THEN
    ALTER TABLE public.jobs RENAME COLUMN franchise_id TO affiliate_id;
  END IF;
END $$;

-- Check in job_matches table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'job_matches' AND column_name = 'franchise_id') THEN
    ALTER TABLE public.job_matches RENAME COLUMN franchise_id TO affiliate_id;
  END IF;
END $$;

-- Check in contracts table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'franchise_id') THEN
    ALTER TABLE public.contracts RENAME COLUMN franchise_id TO affiliate_id;
  END IF;
END $$;

-- Check in payments table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'franchise_id') THEN
    ALTER TABLE public.payments RENAME COLUMN franchise_id TO affiliate_id;
  END IF;
END $$;

-- ============================================
-- STEP 7: Update RLS policies
-- ============================================

-- Drop old policies on agencies (formerly schools)
DROP POLICY IF EXISTS "Schools, franchises, and super admins can view" ON public.agencies;
DROP POLICY IF EXISTS "Schools can view their own profile" ON public.agencies;
DROP POLICY IF EXISTS "Public can view active schools" ON public.agencies;
DROP POLICY IF EXISTS "Public can view active schools basic info" ON public.agencies;

-- Create new policies for agencies table
CREATE POLICY "Public can view active agencies"
  ON public.agencies FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can view all agencies"
  ON public.agencies FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.affiliates WHERE id = agencies.affiliate_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage agencies"
  ON public.agencies FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.affiliates WHERE id = agencies.affiliate_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- STEP 8: Clean up comments
-- ============================================

COMMENT ON TABLE public.agencies IS 'Regional recruitment agencies that manage companies and candidates in their area';
COMMENT ON COLUMN public.agencies.agency_name IS 'Display name of the agency (e.g., "Ipatinga-MG")';
COMMENT ON COLUMN public.agencies.affiliate_id IS 'Reference to the parent affiliate/admin organization';

-- ============================================
-- DONE: Summary of changes
-- ============================================
-- Tables renamed:
--   schools -> agencies
--   school_invitations -> agency_invitations
--   school_employee_type_settings -> agency_employee_type_settings
--   admin_school_context -> admin_agency_context
--
-- Columns renamed:
--   school_name -> agency_name (in agencies table)
--   school_id -> agency_id (in all referencing tables)
--   franchise_id -> affiliate_id (where still existed)
--
-- Roles updated:
--   affiliate -> admin
--   school -> agency
