-- Migration 099: Fix scheduled_meetings RLS — remove anonymous write access
-- SECURITY FIX: The "Public can update meetings for contract signing" policy
-- grants FOR UPDATE with USING(true) to anon, allowing any unauthenticated
-- request to modify any meeting record (including contract_pdf_url and status).

-- ============================================
-- STEP 1: Drop all overly permissive policies on scheduled_meetings
-- ============================================

-- From migration 026 — the critical vulnerability
DROP POLICY IF EXISTS "Public can update meetings for contract signing" ON scheduled_meetings;

-- From migration 026 — redundant SELECT, already covered by 052
DROP POLICY IF EXISTS "Public can view meetings by contract token" ON scheduled_meetings;

-- From migration 023 — original permissive policies (may have been dropped in 052, but be safe)
DROP POLICY IF EXISTS "Public can create meetings" ON scheduled_meetings;
DROP POLICY IF EXISTS "Public can view meetings by token" ON scheduled_meetings;

-- From migration 052 — these target authenticated users, drop and recreate tighter versions
DROP POLICY IF EXISTS "Users can view their meetings" ON scheduled_meetings;
DROP POLICY IF EXISTS "Create meetings" ON scheduled_meetings;
DROP POLICY IF EXISTS "Update own meetings" ON scheduled_meetings;

-- From migration 023 — admin ALL policy
DROP POLICY IF EXISTS "Admins can manage own meetings" ON scheduled_meetings;

-- ============================================
-- STEP 2: Create anon policies — SELECT and INSERT only, NO UPDATE/DELETE
-- ============================================

-- Anon can read meetings (public booking page needs to check available slots)
CREATE POLICY "anon_read_meetings"
  ON scheduled_meetings FOR SELECT
  TO anon
  USING (true);

-- Anon can create meetings (public booking flow)
CREATE POLICY "anon_book_meeting"
  ON scheduled_meetings FOR INSERT
  TO anon
  WITH CHECK (true);

-- ============================================
-- STEP 3: Create authenticated policies — scoped by ownership
-- ============================================

-- Authenticated users can view meetings they participate in
CREATE POLICY "authenticated_read_meetings"
  ON scheduled_meetings FOR SELECT
  TO authenticated
  USING (
    -- Admin who created the meeting
    admin_id = auth.uid()
    -- Company user whose email matches
    OR company_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    -- Agency user whose agency matches
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'agency'
      AND u.agency_id = scheduled_meetings.agency_id
    )
    -- Admin role can see all
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Authenticated users can create meetings
CREATE POLICY "authenticated_create_meetings"
  ON scheduled_meetings FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = auth.uid()
    OR admin_id IS NOT NULL
  );

-- Only meeting owner, agency member, or admin can update
CREATE POLICY "authenticated_update_meetings"
  ON scheduled_meetings FOR UPDATE
  TO authenticated
  USING (
    admin_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'agency'
      AND u.agency_id = scheduled_meetings.agency_id
    )
    OR company_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Only admin can delete meetings
CREATE POLICY "authenticated_delete_meetings"
  ON scheduled_meetings FOR DELETE
  TO authenticated
  USING (
    admin_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );
