-- =====================================================================
-- 113_fix_signup_trigger_remove_profiles_again.sql
-- =====================================================================
--
-- BUG: Migration 112 re-introduced `INSERT INTO public.profiles` in
-- handle_new_user(), but public.profiles was dropped in migration 102.
-- This causes every new signup to fail with:
--   "Database error saving new user"
--
-- FIX: Remove the profiles INSERT. Keep the agency_id logic from 112.
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
  v_agency_id uuid;
  v_agency_id_text text;
BEGIN
  -- Safely resolve role from signup metadata
  v_requested_role := new.raw_user_meta_data ->> 'role';

  IF v_requested_role = 'company' THEN
    v_role := 'company'::user_role;
  ELSIF v_requested_role = 'agency' THEN
    v_role := 'agency'::user_role;
  ELSE
    v_role := 'candidate'::user_role;
  END IF;

  -- Extract and validate agency_id from metadata
  v_agency_id_text := new.raw_user_meta_data ->> 'agency_id';
  v_agency_id := NULL;

  IF v_agency_id_text IS NOT NULL AND v_agency_id_text != '' THEN
    BEGIN
      v_agency_id := v_agency_id_text::uuid;
      -- Verify the agency actually exists to avoid FK violation
      IF NOT EXISTS (SELECT 1 FROM public.agencies WHERE id = v_agency_id) THEN
        v_agency_id := NULL;
      END IF;
    EXCEPTION WHEN invalid_text_representation THEN
      -- Not a valid UUID, ignore
      v_agency_id := NULL;
    END;
  END IF;

  -- Create users row with correct role AND agency_id
  INSERT INTO public.users (id, email, name, role, agency_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'name', NULL),
    v_role,
    v_agency_id
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    agency_id = COALESCE(public.users.agency_id, EXCLUDED.agency_id);

  RETURN new;
END;
$$;

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
