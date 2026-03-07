-- =====================================================
-- 091: Surgical RLS Fix — 8 Confirmed Bugs
-- =====================================================
--
-- BUG 1 — MASTER BUG: users table role-check subqueries fail silently.
--   Every EXISTS(SELECT 1 FROM users WHERE role = ...) in other tables'
--   policies hits RLS on the users table. While self-referencing policies
--   technically work in PostgreSQL, the pattern is fragile and slow.
--   FIX: Create get_my_role() SECURITY DEFINER function and a simple
--   users_select_own policy. Replace role-check subqueries in all new
--   policies with get_my_role() calls.
--
-- BUG 2 — payments table blocks admin and agency roles.
--   Current FOR ALL policy only allows 'super_admin' and 'affiliate'.
--   Admin role ('admin') users get RLS violations on INSERT.
--   FIX: Replace with explicit per-operation policies for admin,
--   super_admin, agency (full access) and company (SELECT only).
--
-- BUG 3 — jobs table missing UPDATE policy for company role.
--   Companies cannot edit their own job postings. Agency role also
--   missing from UPDATE. Stale policies reference renamed tables.
--   FIX: Drop stale policies, add UPDATE and INSERT for company
--   (scoped to own company_id) and admin/agency/super_admin.
--
-- BUG 4 — agencies table has RLS DISABLED entirely.
--   Any authenticated user can read/write all agency data.
--   FIX: Enable + force RLS, add scoped policies.
--
-- BUG 5 — admin_settings PIX keys not persisting.
--   FOR ALL policy may block granular writes.
--   FIX: Replace with explicit per-operation policies.
--
-- BUG 6 — candidates table: company role sees ALL candidates.
--   Over-permissive policy from migration 062.
--   FIX: Scope to candidates who applied to the company's jobs
--   using a SECURITY DEFINER function to avoid RLS recursion.
--
-- BUG 7 — DISC/PDP results not visible to candidates.
--   After fixing role checks, candidate SELECT must use
--   get_my_role() and user_id = auth.uid() for own profile.
--   FIX: Included in BUG 6 candidate policy rewrite.
--
-- BUG 8 — contracts table missing proper per-role RLS policies.
--   Stale policies reference renamed tables (schools, franchises).
--   FIX: Drop stale policies, add per-role SELECT/INSERT/UPDATE/DELETE.
-- =====================================================


-- =====================================================
-- BUG 1 FIX: SECURITY DEFINER helpers + users SELECT policy
-- =====================================================

-- get_my_role(): returns current user's role without triggering RLS
DROP FUNCTION IF EXISTS get_my_role();
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$ SELECT role::text FROM users WHERE id = auth.uid() $$;

-- get_my_company_id(): returns company.id for a company-role user
-- Companies table has user_id referencing users.id (migration 006)
DROP FUNCTION IF EXISTS get_my_company_id();
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$ SELECT id FROM companies WHERE user_id = auth.uid() LIMIT 1 $$;

-- get_my_agency_id(): returns agencies.id for an agency-role user
-- Agencies table has user_id referencing users.id (originally companies->schools->agencies)
DROP FUNCTION IF EXISTS get_my_agency_id();
CREATE OR REPLACE FUNCTION get_my_agency_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$ SELECT id FROM agencies WHERE user_id = auth.uid() LIMIT 1 $$;

-- get_my_candidate_id(): returns candidates.id for a candidate-role user
-- Candidates table has user_id referencing users.id (migration 001)
DROP FUNCTION IF EXISTS get_my_candidate_id();
CREATE OR REPLACE FUNCTION get_my_candidate_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$ SELECT id FROM candidates WHERE user_id = auth.uid() LIMIT 1 $$;

-- Replace the users SELECT policy with a simple own-row policy
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;

CREATE POLICY "users_select_own" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- ✓ BUG 1 FIXED


-- =====================================================
-- BUG 2 FIX: payments table per-operation policies
-- =====================================================

-- Drop all existing payment policies (from migrations 001, 002, 003)
DROP POLICY IF EXISTS "Users can view relevant payments" ON payments;
DROP POLICY IF EXISTS "Super admins and affiliates can manage payments" ON payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;
DROP POLICY IF EXISTS "payments_select_admin" ON payments;
DROP POLICY IF EXISTS "payments_select_company" ON payments;
DROP POLICY IF EXISTS "payments_insert_admin" ON payments;
DROP POLICY IF EXISTS "payments_update_admin" ON payments;
DROP POLICY IF EXISTS "payments_delete_admin" ON payments;

-- SELECT: admin/super_admin/agency see all payments
CREATE POLICY "payments_select_admin" ON payments
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('admin', 'super_admin', 'agency'));

-- SELECT: company sees only payments for their company
-- payments.company_id added in migration 074, references companies(id)
CREATE POLICY "payments_select_company" ON payments
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'company'
    AND company_id = get_my_company_id()
  );

-- INSERT: admin/super_admin/agency
CREATE POLICY "payments_insert_admin" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'super_admin', 'agency'));

-- UPDATE: admin/super_admin/agency
CREATE POLICY "payments_update_admin" ON payments
  FOR UPDATE TO authenticated
  USING (get_my_role() IN ('admin', 'super_admin', 'agency'))
  WITH CHECK (get_my_role() IN ('admin', 'super_admin', 'agency'));

-- DELETE: admin/super_admin/agency
CREATE POLICY "payments_delete_admin" ON payments
  FOR DELETE TO authenticated
  USING (get_my_role() IN ('admin', 'super_admin', 'agency'));

-- ✓ BUG 2 FIXED


-- =====================================================
-- BUG 3 FIX: jobs table UPDATE/INSERT policies
-- =====================================================

-- Drop stale policies from pre-rename era (schools/franchises/affiliates)
DROP POLICY IF EXISTS "Schools, franchises, and super admins can create jobs" ON jobs;
DROP POLICY IF EXISTS "Schools, franchises, and super admins can update jobs" ON jobs;
DROP POLICY IF EXISTS "Schools, affiliates, and super admins can create jobs" ON jobs;
DROP POLICY IF EXISTS "Schools, affiliates, and super admins can update jobs" ON jobs;
DROP POLICY IF EXISTS "Anyone can view open jobs in their franchise" ON jobs;
DROP POLICY IF EXISTS "Companies can manage their own jobs" ON jobs;
-- Drop idempotent guard for new policies
DROP POLICY IF EXISTS "jobs_update_company" ON jobs;
DROP POLICY IF EXISTS "jobs_update_admin" ON jobs;
DROP POLICY IF EXISTS "jobs_insert_company" ON jobs;
DROP POLICY IF EXISTS "jobs_insert_admin" ON jobs;
DROP POLICY IF EXISTS "jobs_delete_admin" ON jobs;

-- UPDATE: company role — scoped to own company_id
-- jobs.company_id references companies(id) (migration 006/008)
CREATE POLICY "jobs_update_company" ON jobs
  FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'company'
    AND company_id = get_my_company_id()
  )
  WITH CHECK (
    get_my_role() = 'company'
    AND company_id = get_my_company_id()
  );

-- UPDATE: admin/agency/super_admin — full access
CREATE POLICY "jobs_update_admin" ON jobs
  FOR UPDATE TO authenticated
  USING (get_my_role() IN ('admin', 'agency', 'super_admin'))
  WITH CHECK (get_my_role() IN ('admin', 'agency', 'super_admin'));

-- INSERT: company role — scoped to own company_id
CREATE POLICY "jobs_insert_company" ON jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'company'
    AND company_id = get_my_company_id()
  );

-- INSERT: admin/agency/super_admin — full access
CREATE POLICY "jobs_insert_admin" ON jobs
  FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('admin', 'agency', 'super_admin'));

-- DELETE: admin/agency/super_admin only
CREATE POLICY "jobs_delete_admin" ON jobs
  FOR DELETE TO authenticated
  USING (get_my_role() IN ('admin', 'agency', 'super_admin'));

-- NOTE: Existing "Jobs visibility" SELECT policy from migration 052 is preserved.

-- ✓ BUG 3 FIXED


-- =====================================================
-- BUG 4 FIX: agencies table — enable RLS + scoped policies
-- =====================================================

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies FORCE ROW LEVEL SECURITY;

-- Drop all existing agency policies
DROP POLICY IF EXISTS "Public can view active agencies" ON agencies;
DROP POLICY IF EXISTS "Admins can view all agencies" ON agencies;
DROP POLICY IF EXISTS "Admins can manage agencies" ON agencies;
DROP POLICY IF EXISTS "agencies_select_own" ON agencies;
DROP POLICY IF EXISTS "agencies_update_own" ON agencies;
DROP POLICY IF EXISTS "agencies_delete_own" ON agencies;
DROP POLICY IF EXISTS "agencies_admin_all" ON agencies;

-- Agency user: SELECT their own record
-- agencies.user_id is the agency owner's auth user id
CREATE POLICY "agencies_select_own" ON agencies
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Agency user: UPDATE their own record
CREATE POLICY "agencies_update_own" ON agencies
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Agency user: DELETE their own record
CREATE POLICY "agencies_delete_own" ON agencies
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Admin/super_admin: full access to all agency rows
CREATE POLICY "agencies_admin_all" ON agencies
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'super_admin'))
  WITH CHECK (get_my_role() IN ('admin', 'super_admin'));

-- ✓ BUG 4 FIXED


-- =====================================================
-- BUG 5 FIX: admin_settings — explicit per-operation policies
-- =====================================================

-- Ensure RLS is enabled (table created outside numbered migrations;
-- migration 079 added agency_id column to it)
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Drop any existing FOR ALL or named policies
DROP POLICY IF EXISTS "Admins can manage own settings" ON admin_settings;
DROP POLICY IF EXISTS "admin_settings_all" ON admin_settings;
DROP POLICY IF EXISTS "admin_settings_select" ON admin_settings;
DROP POLICY IF EXISTS "admin_settings_insert" ON admin_settings;
DROP POLICY IF EXISTS "admin_settings_update" ON admin_settings;
DROP POLICY IF EXISTS "admin_settings_delete" ON admin_settings;

-- admin_settings.admin_id is the owner column
CREATE POLICY "admin_settings_select" ON admin_settings
  FOR SELECT TO authenticated
  USING (admin_id = auth.uid());

CREATE POLICY "admin_settings_insert" ON admin_settings
  FOR INSERT TO authenticated
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "admin_settings_update" ON admin_settings
  FOR UPDATE TO authenticated
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "admin_settings_delete" ON admin_settings
  FOR DELETE TO authenticated
  USING (admin_id = auth.uid());

-- ✓ BUG 5 FIXED


-- =====================================================
-- BUG 6 + BUG 7 FIX: candidates table — scoped company access
--                      + candidate own-profile DISC/PDP visibility
-- =====================================================

-- SECURITY DEFINER function: returns candidate IDs who applied to
-- jobs owned by the current user's company.
-- Bypasses RLS internally to avoid recursion between
-- applications ↔ candidates policies (see migration 062).
DROP FUNCTION IF EXISTS get_my_applied_candidate_ids();
CREATE OR REPLACE FUNCTION get_my_applied_candidate_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT DISTINCT a.candidate_id
  FROM applications a
  JOIN jobs j ON j.id = a.job_id
  JOIN companies c ON c.id = j.company_id
  WHERE c.user_id = auth.uid()
$$;

-- Drop all existing candidate SELECT policies
DROP POLICY IF EXISTS "Candidates view own profile" ON candidates;
DROP POLICY IF EXISTS "Users can view candidates appropriately" ON candidates;
DROP POLICY IF EXISTS "Candidates and franchise staff can view" ON candidates;
DROP POLICY IF EXISTS "candidates_select_own" ON candidates;
DROP POLICY IF EXISTS "candidates_select_admin" ON candidates;
DROP POLICY IF EXISTS "candidates_select_company" ON candidates;

-- BUG 7: Candidate sees own profile (including DISC/PDP columns from
-- migrations 040, 041, 061). Uses user_id = auth.uid() directly —
-- no role check needed since every candidate owns exactly one record.
CREATE POLICY "candidates_select_own" ON candidates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admin/agency/super_admin: see all candidates
CREATE POLICY "candidates_select_admin" ON candidates
  FOR SELECT TO authenticated
  USING (get_my_role() IN ('admin', 'agency', 'super_admin'));

-- Company: see only candidates who applied to their jobs (BUG 6 fix)
CREATE POLICY "candidates_select_company" ON candidates
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'company'
    AND id IN (SELECT get_my_applied_candidate_ids())
  );

-- ✓ BUG 6 FIXED
-- ✓ BUG 7 FIXED


-- =====================================================
-- BUG 8 FIX: contracts table — proper per-role RLS
-- =====================================================

-- Drop stale policies (reference renamed tables: schools, franchises)
DROP POLICY IF EXISTS "Users can view relevant contracts" ON contracts;
DROP POLICY IF EXISTS "Users can view relevant contracts in their franchise" ON contracts;
DROP POLICY IF EXISTS "Companies can manage contracts" ON contracts;
DROP POLICY IF EXISTS "Affiliates and super admins can manage contracts" ON contracts;
DROP POLICY IF EXISTS "Franchises and super admins can manage contracts" ON contracts;
-- Idempotent guard for new policies
DROP POLICY IF EXISTS "contracts_admin_all" ON contracts;
DROP POLICY IF EXISTS "contracts_agency_select" ON contracts;
DROP POLICY IF EXISTS "contracts_agency_insert" ON contracts;
DROP POLICY IF EXISTS "contracts_agency_update" ON contracts;
DROP POLICY IF EXISTS "contracts_agency_delete" ON contracts;
DROP POLICY IF EXISTS "contracts_company_select" ON contracts;
DROP POLICY IF EXISTS "contracts_candidate_select" ON contracts;

-- Admin/super_admin: full access to all contracts
CREATE POLICY "contracts_admin_all" ON contracts
  FOR ALL TO authenticated
  USING (get_my_role() IN ('admin', 'super_admin'))
  WITH CHECK (get_my_role() IN ('admin', 'super_admin'));

-- Agency: full CRUD on contracts where agency_id matches their agency
-- contracts.agency_id references agencies(id) (renamed from school_id in migration 048)
CREATE POLICY "contracts_agency_select" ON contracts
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'agency'
    AND agency_id = get_my_agency_id()
  );

CREATE POLICY "contracts_agency_insert" ON contracts
  FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'agency'
    AND agency_id = get_my_agency_id()
  );

CREATE POLICY "contracts_agency_update" ON contracts
  FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'agency'
    AND agency_id = get_my_agency_id()
  )
  WITH CHECK (
    get_my_role() = 'agency'
    AND agency_id = get_my_agency_id()
  );

CREATE POLICY "contracts_agency_delete" ON contracts
  FOR DELETE TO authenticated
  USING (
    get_my_role() = 'agency'
    AND agency_id = get_my_agency_id()
  );

-- Company: SELECT only, scoped to contracts with their company_id
-- contracts.company_id references companies(id) (added in migration 014)
CREATE POLICY "contracts_company_select" ON contracts
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'company'
    AND company_id = get_my_company_id()
  );

-- Candidate: SELECT only, scoped to contracts with their candidate_id
-- contracts.candidate_id references candidates(id) (migration 001)
CREATE POLICY "contracts_candidate_select" ON contracts
  FOR SELECT TO authenticated
  USING (
    get_my_role() = 'candidate'
    AND candidate_id = get_my_candidate_id()
  );

-- ✓ BUG 8 FIXED


-- =====================================================
-- VERIFICATION QUERIES (run manually after applying migration):
-- =====================================================
-- 1. Check users table policies:
--    SELECT * FROM pg_policies WHERE tablename = 'users';
--
-- 2. Check get_my_role() exists:
--    SELECT proname FROM pg_proc WHERE proname = 'get_my_role';
--
-- 3. Check all SECURITY DEFINER helpers exist:
--    SELECT proname FROM pg_proc
--    WHERE proname IN ('get_my_role', 'get_my_company_id', 'get_my_agency_id',
--                      'get_my_candidate_id', 'get_my_applied_candidate_ids');
--
-- 4. Test payments insert as admin role user:
--    SET LOCAL role TO authenticated;
--    SET LOCAL request.jwt.claim.sub TO '<admin-user-uuid>';
--    INSERT INTO payments (contract_id, company_id, amount, payment_type, due_date, status)
--    VALUES (...);
--
-- 5. Check agencies RLS enabled:
--    SELECT relrowsecurity, relforcerowsecurity
--    FROM pg_class WHERE relname = 'agencies';
--
-- 6. Full policy audit:
--    SELECT tablename, policyname, cmd, qual
--    FROM pg_policies
--    WHERE tablename IN ('users', 'payments', 'jobs', 'agencies',
--                        'admin_settings', 'candidates', 'contracts')
--    ORDER BY tablename, policyname;
--
-- 7. Check no stale school/franchise policies remain:
--    SELECT tablename, policyname FROM pg_policies
--    WHERE policyname ILIKE '%school%' OR policyname ILIKE '%franchise%';
-- =====================================================
