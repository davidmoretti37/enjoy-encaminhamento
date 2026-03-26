-- Protect financial history from cascade deletes.
--
-- Problem: The FK chain auth.users → users → companies → jobs → applications → contracts → payments
-- uses ON DELETE CASCADE throughout. Deleting one auth.users record wipes all downstream
-- financial records permanently — contracts, payments, audit trails.
--
-- Fix: Change critical FK constraints to RESTRICT or SET NULL so that:
-- - A company cannot be deleted while it has jobs, contracts, or payments
-- - A contract cannot be deleted while it has payments
-- - Deleting an auth user orphans the profile row instead of cascading
--
-- Note: users.id → auth.users(id) FK is left alone. It is the PK of the users table
-- and managing its FK relationship to auth.users requires special care that is out of
-- scope for this migration.

-- 2. companies.user_id → users(id): CASCADE → SET NULL
--    Deleting a user profile should not delete the company and all its data
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_user_id_fkey1') THEN
    ALTER TABLE public.companies DROP CONSTRAINT companies_user_id_fkey1;
  ELSIF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_user_id_fkey') THEN
    ALTER TABLE public.companies DROP CONSTRAINT companies_user_id_fkey;
  END IF;
  ALTER TABLE public.companies ALTER COLUMN user_id DROP NOT NULL;
  ALTER TABLE public.companies ADD CONSTRAINT companies_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
END $$;

-- 3. jobs.company_id → companies(id): NO ACTION → RESTRICT
--    A company cannot be deleted while it has jobs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_company_id_fkey1') THEN
    ALTER TABLE public.jobs DROP CONSTRAINT jobs_company_id_fkey1;
  ELSIF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_company_id_fkey') THEN
    ALTER TABLE public.jobs DROP CONSTRAINT jobs_company_id_fkey;
  END IF;
  ALTER TABLE public.jobs ADD CONSTRAINT jobs_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;
END $$;

-- 4. contracts.company_id → companies(id): NO ACTION → RESTRICT
--    A company cannot be deleted while contracts exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_company_id_fkey1') THEN
    ALTER TABLE public.contracts DROP CONSTRAINT contracts_company_id_fkey1;
  ELSIF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_company_id_fkey') THEN
    ALTER TABLE public.contracts DROP CONSTRAINT contracts_company_id_fkey;
  END IF;
  ALTER TABLE public.contracts ADD CONSTRAINT contracts_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;
END $$;

-- 5. contracts.job_id → jobs(id): CASCADE → RESTRICT
--    A job cannot be deleted while contracts reference it
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_job_id_fkey') THEN
    ALTER TABLE public.contracts DROP CONSTRAINT contracts_job_id_fkey;
  END IF;
  ALTER TABLE public.contracts ADD CONSTRAINT contracts_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE RESTRICT;
END $$;

-- 6. contracts.application_id → applications(id): CASCADE → RESTRICT
--    An application cannot be deleted while contracts reference it
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_application_id_fkey') THEN
    ALTER TABLE public.contracts DROP CONSTRAINT contracts_application_id_fkey;
  END IF;
  ALTER TABLE public.contracts ADD CONSTRAINT contracts_application_id_fkey
    FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE RESTRICT;
END $$;

-- 7. contracts.candidate_id → candidates(id): CASCADE → RESTRICT
--    A candidate cannot be deleted while contracts reference them
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contracts_candidate_id_fkey') THEN
    ALTER TABLE public.contracts DROP CONSTRAINT contracts_candidate_id_fkey;
  END IF;
  ALTER TABLE public.contracts ADD CONSTRAINT contracts_candidate_id_fkey
    FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE RESTRICT;
END $$;

-- 8. payments.company_id → companies(id): CASCADE → RESTRICT
--    A company cannot be deleted while payments exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_company_id_fkey1') THEN
    ALTER TABLE public.payments DROP CONSTRAINT payments_company_id_fkey1;
  ELSIF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_company_id_fkey') THEN
    ALTER TABLE public.payments DROP CONSTRAINT payments_company_id_fkey;
  END IF;
  ALTER TABLE public.payments ADD CONSTRAINT payments_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;
END $$;

-- 9. payments.contract_id → contracts(id): CASCADE → RESTRICT
--    A contract cannot be deleted while payments exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_contract_id_fkey') THEN
    ALTER TABLE public.payments DROP CONSTRAINT payments_contract_id_fkey;
  END IF;
  ALTER TABLE public.payments ADD CONSTRAINT payments_contract_id_fkey
    FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE RESTRICT;
END $$;

-- Add soft delete support columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create indexes for soft delete queries
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON public.companies(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_deleted_at ON public.jobs(deleted_at) WHERE deleted_at IS NOT NULL;
