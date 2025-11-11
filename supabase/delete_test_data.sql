-- =====================================================
-- DELETE TEST DATA
-- =====================================================
-- Run this to remove all mock/test data
-- This will NOT delete your admin user or the schema
-- =====================================================

-- Delete in reverse order due to foreign key constraints

-- Step 1: Delete test contracts
DELETE FROM public.contracts
WHERE contract_number IN ('CTR-2025-001', 'CTR-2025-002');

-- Step 2: Delete test applications
DELETE FROM public.applications
WHERE candidate_id IN (
  'b1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222',
  'b3333333-3333-3333-3333-333333333333',
  'b4444444-4444-4444-4444-444444444444',
  'b5555555-5555-5555-5555-555555555555'
);

-- Step 3: Delete test jobs
DELETE FROM public.jobs
WHERE company_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333'
);

-- Step 4: Delete test candidates
DELETE FROM public.candidates
WHERE id IN (
  'b1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222',
  'b3333333-3333-3333-3333-333333333333',
  'b4444444-4444-4444-4444-444444444444',
  'b5555555-5555-5555-5555-555555555555'
);

-- Step 5: Delete test companies
DELETE FROM public.companies
WHERE id IN (
  'a1111111-1111-1111-1111-111111111111',
  'a2222222-2222-2222-2222-222222222222',
  'a3333333-3333-3333-3333-333333333333'
);

-- Step 6: Delete test users (NOT your admin!)
DELETE FROM public.users
WHERE id IN (
  'c1111111-1111-1111-1111-111111111111',
  'c2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
  'd1111111-1111-1111-1111-111111111111',
  'd2222222-2222-2222-2222-222222222222',
  'd3333333-3333-3333-3333-333333333333',
  'd4444444-4444-4444-4444-444444444444',
  'd5555555-5555-5555-5555-555555555555'
);

-- Verify deletion
SELECT 'Test data deleted successfully!' AS message;
SELECT
  (SELECT COUNT(*) FROM public.companies) AS remaining_companies,
  (SELECT COUNT(*) FROM public.candidates) AS remaining_candidates,
  (SELECT COUNT(*) FROM public.jobs) AS remaining_jobs,
  (SELECT COUNT(*) FROM public.applications) AS remaining_applications,
  (SELECT COUNT(*) FROM public.contracts) AS remaining_contracts,
  (SELECT COUNT(*) FROM public.users WHERE role != 'super_admin') AS remaining_non_admin_users;
