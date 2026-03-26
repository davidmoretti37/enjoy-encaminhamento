-- Migration 102: Fix schema issues found in full platform audit
-- Fixes: broken RLS, missing columns, missing table, wrong indexes, stale naming

-- ============================================
-- 1. FIX BROKEN RLS POLICY ON agency_document_templates
-- ============================================
-- The old policy compared agency_id to companies.id (wrong join).
-- Correct: compare agency_id to the company's agency_id.
DROP POLICY IF EXISTS "Companies can view agency templates" ON agency_document_templates;
CREATE POLICY "Companies can view agency templates" ON agency_document_templates
  FOR SELECT USING (
    agency_id IN (
      SELECT c.agency_id FROM companies c
      WHERE c.user_id = auth.uid() AND c.agency_id IS NOT NULL
    )
  );

-- ============================================
-- 2. ADD MISSING insurance_fee COLUMN TO contracts
-- ============================================
-- Migration 057 defined this but it was never applied to production.
-- Code in payments.ts checks contract.insurance_fee for estágio contracts.
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS insurance_fee INTEGER DEFAULT 0;

-- ============================================
-- 3. ADD PROPER INDEXES ON company_id COLUMNS
-- ============================================
-- Existing indexes with misleading names actually index the wrong columns:
--   idx_payments_company_id → indexes school_id
--   idx_jobs_company_id → indexes agency_id
--   idx_contracts_company_id → indexes agency_id
-- We add correct indexes on the actual company_id columns.
CREATE INDEX IF NOT EXISTS idx_jobs_company_id_v2 ON public.jobs(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_company_id_v2 ON public.contracts(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_company_id_v2 ON public.payments(company_id) WHERE company_id IS NOT NULL;

-- ============================================
-- 4. RENAME feedback.school_id → agency_id
-- ============================================
-- The school→agency migration (048) missed the feedback table.
ALTER TABLE public.feedback RENAME COLUMN school_id TO agency_id;

-- ============================================
-- 5. CREATE MISSING agency_employee_type_settings TABLE
-- ============================================
-- Migration 031 tried to create school_employee_type_settings referencing
-- the old `schools` table. Since schools was already renamed to agencies,
-- the table was never created. The code references agency_employee_type_settings.
CREATE TABLE IF NOT EXISTS public.agency_employee_type_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  employee_type VARCHAR(30) NOT NULL
    CHECK (employee_type IN ('estagio', 'clt', 'menor-aprendiz')),

  -- Contract template
  contract_template_type VARCHAR(10)
    CHECK (contract_template_type IN ('pdf', 'html')),
  contract_pdf_url TEXT,
  contract_pdf_key TEXT,
  contract_html TEXT,

  -- Payment configuration
  payment_frequency VARCHAR(20) NOT NULL DEFAULT 'one_time'
    CHECK (payment_frequency IN ('one_time', 'recurring')),
  default_unlock_fee NUMERIC(10,2) DEFAULT 0.00,
  monthly_fee NUMERIC(10,2) DEFAULT 0.00,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(agency_id, employee_type)
);

CREATE INDEX IF NOT EXISTS idx_agency_employee_settings_agency
  ON agency_employee_type_settings(agency_id);

-- RLS
ALTER TABLE agency_employee_type_settings ENABLE ROW LEVEL SECURITY;

-- Agencies can manage their own settings
CREATE POLICY "Agencies can manage employee type settings"
ON agency_employee_type_settings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.id = agency_employee_type_settings.agency_id
    AND a.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.id = agency_employee_type_settings.agency_id
    AND a.user_id = auth.uid()
  )
);

-- Admins have full access
CREATE POLICY "Admins can manage all employee type settings"
ON agency_employee_type_settings
FOR ALL USING (
  get_my_role() = ANY (ARRAY['admin', 'super_admin'])
) WITH CHECK (
  get_my_role() = ANY (ARRAY['admin', 'super_admin'])
);

-- Companies can view settings for their agency
CREATE POLICY "Companies can view agency employee type settings"
ON agency_employee_type_settings
FOR SELECT USING (
  agency_id IN (
    SELECT c.agency_id FROM companies c
    WHERE c.user_id = auth.uid() AND c.agency_id IS NOT NULL
  )
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON agency_employee_type_settings TO authenticated;

-- ============================================
-- 6. MIGRATE role='school' USERS → role='agency'
-- ============================================
-- The user_role enum has both 'school' and 'agency'. Old users might
-- still have 'school', causing RLS policies to not match.
UPDATE public.users SET role = 'agency' WHERE role = 'school';

-- ============================================
-- 7. DROP ORPHANED profiles TABLE
-- ============================================
-- This table has RLS policies but zero code references.
-- Leftover from a project template.
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP TABLE IF EXISTS public.profiles;

-- ============================================
-- 8. ADD candidate_statuses COLUMN TO candidate_batches
-- ============================================
-- Code references this JSONB column for per-candidate status tracking.
ALTER TABLE public.candidate_batches
  ADD COLUMN IF NOT EXISTS candidate_statuses JSONB DEFAULT '{}'::jsonb;
