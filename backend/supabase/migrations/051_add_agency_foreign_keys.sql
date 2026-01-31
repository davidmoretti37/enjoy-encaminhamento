-- Migration 051: Add foreign key constraints for agency_id columns
-- This ensures referential integrity for agency relationships

-- ============================================
-- STEP 1: Clean up any orphaned agency_id references first
-- ============================================

-- Set invalid agency_id values to NULL before adding constraints
UPDATE users SET agency_id = NULL
WHERE agency_id IS NOT NULL
AND agency_id NOT IN (SELECT id FROM agencies);

UPDATE candidates SET agency_id = NULL
WHERE agency_id IS NOT NULL
AND agency_id NOT IN (SELECT id FROM agencies);

UPDATE companies SET agency_id = NULL
WHERE agency_id IS NOT NULL
AND agency_id NOT IN (SELECT id FROM agencies);

UPDATE jobs SET agency_id = NULL
WHERE agency_id IS NOT NULL
AND agency_id NOT IN (SELECT id FROM agencies);

-- ============================================
-- STEP 2: Add foreign key constraints
-- ============================================

-- Users -> Agencies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_users_agency' AND table_name = 'users'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT fk_users_agency
      FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Candidates -> Agencies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_candidates_agency' AND table_name = 'candidates'
  ) THEN
    ALTER TABLE candidates
      ADD CONSTRAINT fk_candidates_agency
      FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Companies -> Agencies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_companies_agency' AND table_name = 'companies'
  ) THEN
    ALTER TABLE companies
      ADD CONSTRAINT fk_companies_agency
      FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Jobs -> Agencies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_jobs_agency' AND table_name = 'jobs'
  ) THEN
    ALTER TABLE jobs
      ADD CONSTRAINT fk_jobs_agency
      FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- STEP 3: Fix franchise_id -> affiliate_id in job_matches if still exists
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'job_matches' AND column_name = 'franchise_id'
  ) THEN
    ALTER TABLE job_matches RENAME COLUMN franchise_id TO affiliate_id;
  END IF;
END $$;

-- ============================================
-- DONE
-- ============================================
