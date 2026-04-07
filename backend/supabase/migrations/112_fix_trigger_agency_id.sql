-- =====================================================================
-- 112_fix_trigger_agency_id.sql
-- =====================================================================
--
-- BUG: handle_new_user() trigger never mapped agency_id from signup
-- metadata to the public.users row. This caused all candidates to have
-- agency_id = NULL, making them invisible to their agency.
--
-- The race condition:
--   1. User signs up with agency_id in metadata
--   2. Trigger fires → inserts users row WITHOUT agency_id
--   3. createProfile sees existing row → returns early
--   4. agency_id is never set → candidate invisible to agency
--
-- FIX: Include agency_id in both INSERT and ON CONFLICT UPDATE.
--      Validate it references an existing agency to avoid FK violations.
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
  -- Create profile row (existing behavior, keep it)
  INSERT INTO public.profiles (id, is_onboarded)
  VALUES (new.id, false)
  ON CONFLICT (id) DO NOTHING;

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
