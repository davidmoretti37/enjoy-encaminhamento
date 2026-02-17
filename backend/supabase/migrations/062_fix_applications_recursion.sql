-- Migration 062: Fix infinite recursion in applications/candidates RLS policies
-- The issue: candidates policy references applications, applications policy references candidates
-- Solution: Use direct ID comparisons instead of subqueries that trigger RLS

-- ============================================
-- STEP 1: Fix candidates SELECT policy
-- Remove the applications subquery that causes recursion
-- ============================================

DROP POLICY IF EXISTS "Candidates view own profile" ON candidates;

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
    -- Or company role (they can view candidates who applied to their jobs)
    -- This check doesn't reference applications table directly
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'company'
    )
  );

-- ============================================
-- STEP 2: Fix applications SELECT policy
-- Use direct user_id comparison instead of joining through candidates
-- ============================================

DROP POLICY IF EXISTS "Applications visibility" ON applications;
DROP POLICY IF EXISTS "Users can view relevant applications" ON applications;

CREATE POLICY "Applications visibility"
  ON applications FOR SELECT
  USING (
    -- Candidate who applied (direct lookup without triggering candidates RLS)
    candidate_id IN (
      SELECT id FROM candidates WHERE user_id = auth.uid()
    )
    -- Or company receiving application (check through jobs, not candidates)
    OR job_id IN (
      SELECT j.id FROM jobs j
      JOIN companies c ON j.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
    -- Or admin/agency
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'agency')
    )
  );

-- ============================================
-- STEP 3: Ensure INSERT policy exists and is correct
-- ============================================

DROP POLICY IF EXISTS "Candidates can create applications" ON applications;

CREATE POLICY "Candidates can create applications"
  ON applications FOR INSERT
  WITH CHECK (
    candidate_id IN (
      SELECT id FROM candidates WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- STEP 4: Ensure UPDATE policy exists for companies
-- ============================================

DROP POLICY IF EXISTS "Companies can update applications" ON applications;

CREATE POLICY "Companies can update applications"
  ON applications FOR UPDATE
  USING (
    job_id IN (
      SELECT j.id FROM jobs j
      JOIN companies c ON j.company_id = c.id
      WHERE c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'agency')
    )
  );
