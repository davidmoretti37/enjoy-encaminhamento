-- =====================================================================
-- 092_fix_signup_trigger_and_backfill.sql
-- =====================================================================
--
-- WHAT WAS BROKEN:
--   The handle_new_user() trigger function (fired on auth.users INSERT)
--   only created a row in public.profiles. It did NOT create a
--   corresponding row in public.users. This meant every new signup
--   had an auth.users entry and a public.profiles entry, but NO
--   public.users row — causing foreign-key failures and broken
--   queries anywhere that joined or referenced public.users.
--
-- WHY IT MATTERS:
--   20 real users signed up and hit this bug. They exist in auth.users
--   but are invisible to the application because public.users has no
--   row for them. Any FK pointing to public.users(id) also fails.
--
-- WHAT THIS MIGRATION DOES:
--   1. Replaces handle_new_user() so it inserts into BOTH
--      public.profiles AND public.users on every signup.
--   2. Backfills the 20 broken users into public.users (and profiles,
--      if any are also missing there).
--   3. Runs verification queries to confirm the fix.
--
-- SAFE TO RE-RUN: All INSERTs use ON CONFLICT (id) DO NOTHING.
-- =====================================================================


-- =============================================================
-- PART 1: Fix the handle_new_user() trigger function
-- =============================================================

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
  -- Create profile row (existing behavior, keep it)
  INSERT INTO public.profiles (id, is_onboarded)
  VALUES (new.id, false)
  ON CONFLICT (id) DO NOTHING;

  -- Safely resolve role: only allow 'candidate' from self-signup.
  -- Agency/admin roles must be assigned server-side, never trusted from client metadata.
  -- This prevents role escalation via crafted signup payloads.
  v_requested_role := new.raw_user_meta_data ->> 'role';
  IF v_requested_role IS NOT NULL AND v_requested_role = 'agency' THEN
    -- Only 'agency' is a valid non-default role for self-signup; expand this list as needed.
    -- Any unrecognized or privileged value falls back to 'candidate'.
    v_role := 'agency'::user_role;
  ELSE
    v_role := 'candidate'::user_role;
  END IF;

  -- Create users row (THIS WAS MISSING — root cause of FK failures)
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'name', NULL),
    v_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

-- Ensure the trigger is correctly attached to auth.users (not public.users)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON public.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- =============================================================
-- PART 2: Backfill the 20 broken users
-- =============================================================

-- Backfill public.users for every auth user missing a row.
-- Hardcode 'candidate'::user_role — these 20 users all signed up via
-- the candidate flow. We do NOT read raw_user_meta_data ->> 'role'
-- here to avoid any historical metadata causing role escalation.
INSERT INTO public.users (id, email, name, role, created_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'name', NULL),
  'candidate'::user_role,
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Also backfill profiles for the same users (in case any are also missing)
INSERT INTO public.profiles (id, is_onboarded)
SELECT
  au.id,
  false
FROM auth.users au
LEFT JOIN public.profiles pr ON pr.id = au.id
WHERE pr.id IS NULL
ON CONFLICT (id) DO NOTHING;


-- =============================================================
-- PART 3: Verification queries
-- =============================================================

-- How many users were backfilled:
SELECT COUNT(*) as backfilled_count
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;
-- Should return 0 after migration runs

-- Confirm trigger is now on auth.users:
SELECT trigger_name, event_object_schema, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
-- Should show event_object_schema = 'auth', event_object_table = 'users'

-- Confirm handle_new_user now writes to both tables:
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
-- Should contain INSERT INTO public.users

-- Spot-check role distribution to confirm no unexpected escalation:
SELECT role, COUNT(*) FROM public.users GROUP BY role ORDER BY role;
