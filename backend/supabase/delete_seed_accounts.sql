-- =====================================================
-- DELETE SEED/TEST ACCOUNTS
-- =====================================================
-- Deletes all accounts with emails ending in:
--   @seed.local, @test.local, @test.com
--
-- Run this in Supabase SQL Editor or via psql
-- =====================================================

BEGIN;

-- First, let's see what we're about to delete
SELECT 'Users to be deleted:' AS info;
SELECT id, name, email, role FROM public.users
WHERE email LIKE '%@seed.local'
   OR email LIKE '%@test.local'
   OR email LIKE '%@test.com';

-- Step 1: Delete notifications for seed users
DELETE FROM public.notifications
WHERE user_id IN (
  SELECT id FROM public.users
  WHERE email LIKE '%@seed.local'
     OR email LIKE '%@test.local'
     OR email LIKE '%@test.com'
);

-- Step 2: Delete documents uploaded by seed users
DELETE FROM public.documents
WHERE uploaded_by IN (
  SELECT id FROM public.users
  WHERE email LIKE '%@seed.local'
     OR email LIKE '%@test.local'
     OR email LIKE '%@test.com'
);

-- Step 3: Delete admin_availability for seed users
DELETE FROM public.admin_availability
WHERE admin_id IN (
  SELECT id FROM public.users
  WHERE email LIKE '%@seed.local'
     OR email LIKE '%@test.local'
     OR email LIKE '%@test.com'
);

-- Step 4: Delete scheduled_meetings for seed users
DELETE FROM public.scheduled_meetings
WHERE admin_id IN (
  SELECT id FROM public.users
  WHERE email LIKE '%@seed.local'
     OR email LIKE '%@test.local'
     OR email LIKE '%@test.com'
);

-- Step 5: Delete email_outreach for seed users
DELETE FROM public.email_outreach
WHERE sender_id IN (
  SELECT id FROM public.users
  WHERE email LIKE '%@seed.local'
     OR email LIKE '%@test.local'
     OR email LIKE '%@test.com'
);

-- Step 6: Delete company_forms for seed users
DELETE FROM public.company_forms
WHERE admin_id IN (
  SELECT id FROM public.users
  WHERE email LIKE '%@seed.local'
     OR email LIKE '%@test.local'
     OR email LIKE '%@test.com'
);

-- Step 7: Delete school_invitations created by seed users
DELETE FROM public.school_invitations
WHERE created_by IN (
  SELECT id FROM public.users
  WHERE email LIKE '%@seed.local'
     OR email LIKE '%@test.local'
     OR email LIKE '%@test.com'
);

-- Step 8: Delete affiliate_invitations created by seed users
DELETE FROM public.affiliate_invitations
WHERE created_by IN (
  SELECT id FROM public.users
  WHERE email LIKE '%@seed.local'
     OR email LIKE '%@test.local'
     OR email LIKE '%@test.com'
);

-- Step 9: Delete payments for contracts related to seed candidates/companies
DELETE FROM public.payments
WHERE contract_id IN (
  SELECT c.id FROM public.contracts c
  JOIN public.candidates cand ON c.candidate_id = cand.id
  JOIN public.users u ON cand.user_id = u.id
  WHERE u.email LIKE '%@seed.local'
     OR u.email LIKE '%@test.local'
     OR u.email LIKE '%@test.com'
);

-- Step 10: Delete feedback for seed candidates/companies
DELETE FROM public.feedback
WHERE candidate_id IN (
  SELECT cand.id FROM public.candidates cand
  JOIN public.users u ON cand.user_id = u.id
  WHERE u.email LIKE '%@seed.local'
     OR u.email LIKE '%@test.local'
     OR u.email LIKE '%@test.com'
);

-- Step 11: Delete contracts for seed candidates
DELETE FROM public.contracts
WHERE candidate_id IN (
  SELECT cand.id FROM public.candidates cand
  JOIN public.users u ON cand.user_id = u.id
  WHERE u.email LIKE '%@seed.local'
     OR u.email LIKE '%@test.local'
     OR u.email LIKE '%@test.com'
);

-- Step 12: Delete job_matches for seed candidates
DELETE FROM public.job_matches
WHERE candidate_id IN (
  SELECT cand.id FROM public.candidates cand
  JOIN public.users u ON cand.user_id = u.id
  WHERE u.email LIKE '%@seed.local'
     OR u.email LIKE '%@test.local'
     OR u.email LIKE '%@test.com'
);

-- Step 13: Delete applications for seed candidates
DELETE FROM public.applications
WHERE candidate_id IN (
  SELECT cand.id FROM public.candidates cand
  JOIN public.users u ON cand.user_id = u.id
  WHERE u.email LIKE '%@seed.local'
     OR u.email LIKE '%@test.local'
     OR u.email LIKE '%@test.com'
);

-- Step 14: Delete jobs created by seed companies
DELETE FROM public.jobs
WHERE company_id IN (
  SELECT comp.id FROM public.companies comp
  JOIN public.users u ON comp.user_id = u.id
  WHERE u.email LIKE '%@seed.local'
     OR u.email LIKE '%@test.local'
     OR u.email LIKE '%@test.com'
);

-- Step 15: Delete candidates (seed users)
DELETE FROM public.candidates
WHERE user_id IN (
  SELECT id FROM public.users
  WHERE email LIKE '%@seed.local'
     OR email LIKE '%@test.local'
     OR email LIKE '%@test.com'
);

-- Step 16: Delete companies/schools (seed users)
DELETE FROM public.companies
WHERE user_id IN (
  SELECT id FROM public.users
  WHERE email LIKE '%@seed.local'
     OR email LIKE '%@test.local'
     OR email LIKE '%@test.com'
);

-- Also delete by schools table if it exists separately
DELETE FROM public.schools
WHERE user_id IN (
  SELECT id FROM public.users
  WHERE email LIKE '%@seed.local'
     OR email LIKE '%@test.local'
     OR email LIKE '%@test.com'
);

-- Step 17: Delete franchises/affiliates (seed users)
DELETE FROM public.franchises
WHERE user_id IN (
  SELECT id FROM public.users
  WHERE email LIKE '%@seed.local'
     OR email LIKE '%@test.local'
     OR email LIKE '%@test.com'
);

DELETE FROM public.affiliates
WHERE user_id IN (
  SELECT id FROM public.users
  WHERE email LIKE '%@seed.local'
     OR email LIKE '%@test.local'
     OR email LIKE '%@test.com'
);

-- Step 18: Delete users from public.users
DELETE FROM public.users
WHERE email LIKE '%@seed.local'
   OR email LIKE '%@test.local'
   OR email LIKE '%@test.com';

-- Step 19: Delete from auth.users (Supabase auth)
DELETE FROM auth.users
WHERE email LIKE '%@seed.local'
   OR email LIKE '%@test.local'
   OR email LIKE '%@test.com';

COMMIT;

-- Verify deletion
SELECT 'Seed accounts deleted successfully!' AS message;
SELECT
  (SELECT COUNT(*) FROM public.users) AS remaining_users,
  (SELECT COUNT(*) FROM public.companies) AS remaining_companies,
  (SELECT COUNT(*) FROM public.candidates) AS remaining_candidates,
  (SELECT COUNT(*) FROM public.jobs) AS remaining_jobs;
