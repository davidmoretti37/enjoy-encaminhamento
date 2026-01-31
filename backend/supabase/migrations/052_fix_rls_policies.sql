-- Migration 052: Fix RLS policies for better data isolation
-- Addresses overly permissive policies and adds proper access control

-- ============================================
-- STEP 1: Fix scheduled_meetings - was allowing public access to ALL meetings
-- ============================================

DROP POLICY IF EXISTS "Public can view meetings by token" ON scheduled_meetings;
DROP POLICY IF EXISTS "Public can create meetings" ON scheduled_meetings;
DROP POLICY IF EXISTS "View meetings by token" ON scheduled_meetings;

-- Allow viewing meetings only if user is participant or admin
CREATE POLICY "Users can view their meetings"
  ON scheduled_meetings FOR SELECT
  USING (
    -- User is the admin who created it
    admin_id = auth.uid()
    -- Or user's email matches the company_email (the attendee)
    OR company_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    -- Or user is an admin role
    OR EXISTS (
      SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Allow creating meetings for authenticated users or public booking
CREATE POLICY "Create meetings"
  ON scheduled_meetings FOR INSERT
  WITH CHECK (
    -- Admin creating their slots
    admin_id = auth.uid()
    -- Or public booking (will be validated by API)
    OR admin_id IS NOT NULL
  );

-- Allow updates by owner or admin
CREATE POLICY "Update own meetings"
  ON scheduled_meetings FOR UPDATE
  USING (
    admin_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ============================================
-- STEP 2: Add candidate data isolation
-- ============================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Candidates can view own profile" ON candidates;
DROP POLICY IF EXISTS "Users can view candidates" ON candidates;
DROP POLICY IF EXISTS "Anyone can view candidates" ON candidates;
DROP POLICY IF EXISTS "Enable read access for all users" ON candidates;

-- Candidates can only see their own profile
-- Admins and agencies can see all candidates in their scope
CREATE POLICY "Candidates view own profile"
  ON candidates FOR SELECT
  USING (
    -- Own profile
    user_id = auth.uid()
    -- Or admin/agency role
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'agency')
    )
    -- Or company viewing candidates who applied to their jobs
    OR EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      WHERE a.candidate_id = candidates.id
      AND c.user_id = auth.uid()
    )
  );

-- Candidates can update only their own profile
DROP POLICY IF EXISTS "Candidates can update own profile" ON candidates;
CREATE POLICY "Candidates update own profile"
  ON candidates FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- STEP 3: Add company data isolation
-- ============================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Companies see own data" ON companies;
DROP POLICY IF EXISTS "Anyone can view companies" ON companies;
DROP POLICY IF EXISTS "Enable read access for all users" ON companies;

-- Companies can see their own data
-- Admins and agencies can see companies in their scope
CREATE POLICY "Companies view own data"
  ON companies FOR SELECT
  USING (
    -- Own company
    user_id = auth.uid()
    -- Or admin/agency role
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'agency')
    )
    -- Or same affiliate network
    OR EXISTS (
      SELECT 1 FROM companies c2
      WHERE c2.user_id = auth.uid()
      AND c2.affiliate_id = companies.affiliate_id
    )
  );

-- Companies can update only their own data
DROP POLICY IF EXISTS "Companies can update own data" ON companies;
CREATE POLICY "Companies update own data"
  ON companies FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
  ))
  WITH CHECK (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'
  ));

-- ============================================
-- STEP 4: Add job visibility restrictions
-- ============================================

DROP POLICY IF EXISTS "Jobs visibility" ON jobs;
DROP POLICY IF EXISTS "Anyone can view jobs" ON jobs;

-- Jobs can be viewed by:
-- - Their company owner
-- - Admins/agencies
-- - Candidates (for job browsing)
CREATE POLICY "Jobs visibility"
  ON jobs FOR SELECT
  USING (
    -- Job's company owner
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = jobs.company_id
      AND c.user_id = auth.uid()
    )
    -- Or admin/agency/candidate roles
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'agency', 'candidate')
    )
  );

-- ============================================
-- STEP 5: Add application data isolation
-- ============================================

DROP POLICY IF EXISTS "Applications visibility" ON applications;

-- Applications can be viewed by:
-- - The candidate who applied
-- - The company receiving the application
-- - Admins and agencies
CREATE POLICY "Applications visibility"
  ON applications FOR SELECT
  USING (
    -- Candidate who applied
    EXISTS (
      SELECT 1 FROM candidates c
      WHERE c.id = applications.candidate_id
      AND c.user_id = auth.uid()
    )
    -- Or company receiving application
    OR EXISTS (
      SELECT 1 FROM jobs j
      JOIN companies c ON j.company_id = c.id
      WHERE j.id = applications.job_id
      AND c.user_id = auth.uid()
    )
    -- Or admin/agency
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'agency')
    )
  );

-- ============================================
-- DONE
-- ============================================
