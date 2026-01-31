-- Migration 050: Fix remaining school references in functions, triggers, and policies
-- This fixes the "Database error querying schema" issue

-- ============================================
-- STEP 1: Fix functions
-- ============================================

-- Drop old function (CASCADE drops dependent triggers)
DROP FUNCTION IF EXISTS update_school_employee_type_settings_updated_at() CASCADE;

-- Create new function with correct name
CREATE OR REPLACE FUNCTION update_agency_employee_type_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 2: Recreate trigger on renamed table
-- ============================================

DROP TRIGGER IF EXISTS trigger_update_school_employee_type_settings_updated_at ON agency_employee_type_settings;
DROP TRIGGER IF EXISTS trigger_update_agency_employee_type_settings_updated_at ON agency_employee_type_settings;

CREATE TRIGGER trigger_update_agency_employee_type_settings_updated_at
BEFORE UPDATE ON agency_employee_type_settings
FOR EACH ROW
EXECUTE FUNCTION update_agency_employee_type_settings_updated_at();

-- ============================================
-- STEP 3: Fix RLS policies on candidate_batches
-- ============================================

-- Drop old policies that reference 'schools'
DROP POLICY IF EXISTS "Schools and affiliates can manage batches" ON candidate_batches;
DROP POLICY IF EXISTS "Schools can view their batches" ON candidate_batches;
DROP POLICY IF EXISTS "Companies can view their batches" ON candidate_batches;
DROP POLICY IF EXISTS "Affiliates can view batches" ON candidate_batches;
DROP POLICY IF EXISTS "Schools can manage batches" ON candidate_batches;

-- Recreate with correct table references
CREATE POLICY "Agencies and affiliates can manage batches"
ON candidate_batches FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.id = candidate_batches.agency_id
    AND (
      a.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM affiliates af
        WHERE af.id = a.affiliate_id
        AND af.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
      )
    )
  )
);

CREATE POLICY "Companies can view their batches"
ON candidate_batches FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = candidate_batches.company_id
    AND c.user_id = auth.uid()
  )
);

-- ============================================
-- STEP 4: Fix RLS policies on agency_employee_type_settings
-- ============================================

DROP POLICY IF EXISTS "Affiliates and schools can manage settings" ON agency_employee_type_settings;
DROP POLICY IF EXISTS "Companies can view school employee type settings" ON agency_employee_type_settings;
DROP POLICY IF EXISTS "Schools can manage their settings" ON agency_employee_type_settings;

CREATE POLICY "Agencies and affiliates can manage settings"
ON agency_employee_type_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM agencies a
    WHERE a.id = agency_employee_type_settings.agency_id
    AND (
      a.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM affiliates af
        WHERE af.id = a.affiliate_id
        AND af.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
      )
    )
  )
);

CREATE POLICY "Companies can view agency employee type settings"
ON agency_employee_type_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM companies c
    JOIN agencies a ON c.agency_id = a.id
    WHERE c.user_id = auth.uid()
    AND a.id = agency_employee_type_settings.agency_id
  )
);

-- ============================================
-- DONE
-- ============================================
