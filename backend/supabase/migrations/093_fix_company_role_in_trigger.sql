-- =====================================================================
-- 093_fix_company_role_in_trigger.sql
-- =====================================================================
--
-- WHAT WAS BROKEN:
--   The handle_new_user() trigger in migration 092 only allowed
--   'candidate' and 'agency' roles from signup metadata.
--   Users signing up as 'company' fell through to the default
--   'candidate' role, causing "Acesso Negado" on the company dashboard.
--
-- THE RACE CONDITION:
--   1. Supabase fires handle_new_user() trigger → inserts role='candidate'
--   2. Frontend calls /api/trpc/auth.createProfile → tries to insert role='company'
--   3. Duplicate key error → frontend thinks signup failed → wrong redirect
--
-- WHAT THIS FIXES:
--   1. Trigger now correctly handles 'company' role from metadata
--   2. createUserProfile in backend/db/index.ts now uses UPSERT so
--      the frontend call UPDATES the role instead of crashing
-- =====================================================================

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

-- Verify trigger is still correctly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- VERIFICATION
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
-- Should contain 'company' in the role check
