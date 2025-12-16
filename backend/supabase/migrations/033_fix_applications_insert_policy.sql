-- =====================================================
-- FIX APPLICATIONS INSERT POLICY
-- =====================================================
-- Purpose: Add missing INSERT policy for candidates to create applications
-- This policy was dropped in migration 003 and never recreated
-- =====================================================

-- Drop existing policy if it exists (to make migration idempotent)
DROP POLICY IF EXISTS "Candidates can create applications" ON public.applications;

-- Create INSERT policy for candidates
-- Candidates can only create applications for themselves
CREATE POLICY "Candidates can create applications" ON public.applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.candidates
      WHERE candidates.id = candidate_id
      AND candidates.user_id = auth.uid()
    )
  );
