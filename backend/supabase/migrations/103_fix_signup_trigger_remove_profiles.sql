-- Migration 103: Fix handle_new_user() trigger broken by profiles table drop
--
-- WHAT WAS BROKEN:
--   Migration 102 dropped public.profiles, but handle_new_user() (from 093)
--   still inserts into public.profiles as its first step. This causes the
--   entire trigger to fail on every new signup → no public.users row is
--   created → "Database error saving new user".
--
-- FIX:
--   Remove the profiles INSERT from handle_new_user(). The rest of the
--   function (users upsert with correct role) is unchanged.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
  v_requested_role text;
BEGIN
  -- Safely resolve role from signup metadata.
  -- Only 'candidate', 'company', and 'agency' are valid for self-signup.
  -- 'admin' and 'super_admin' are NEVER trusted from client metadata.
  v_requested_role := new.raw_user_meta_data ->> 'role';

  IF v_requested_role = 'company' THEN
    v_role := 'company'::user_role;
  ELSIF v_requested_role = 'agency' THEN
    v_role := 'agency'::user_role;
  ELSE
    -- Default: candidate (covers null, empty, or any privileged value)
    v_role := 'candidate'::user_role;
  END IF;

  -- Create users row with correct role
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'name', NULL),
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name);

  RETURN new;
END;
$$;

-- Backfill: create public.users rows for anyone who signed up after
-- migration 102 was applied and hit the broken trigger.
INSERT INTO public.users (id, email, name, role, created_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'name', NULL),
  CASE
    WHEN au.raw_user_meta_data ->> 'role' = 'company' THEN 'company'::user_role
    WHEN au.raw_user_meta_data ->> 'role' = 'agency' THEN 'agency'::user_role
    ELSE 'candidate'::user_role
  END,
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- VERIFICATION
-- Should return 0 (no orphaned auth users):
SELECT COUNT(*) as orphaned_users
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;
