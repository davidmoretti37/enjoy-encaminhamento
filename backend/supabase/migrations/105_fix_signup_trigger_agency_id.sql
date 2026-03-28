-- Migration 105: Fix handle_new_user() to also propagate agency_id from signup metadata
--
-- Problem: The trigger sets role correctly from metadata, but doesn't set agency_id.
-- Users who self-signup with an agency selection get agency_id=NULL in public.users.

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

  -- Extract agency_id from metadata (set during signup when user selects agency)
  BEGIN
    v_agency_id := (new.raw_user_meta_data ->> 'agency_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_agency_id := NULL;
  END;

  -- Create users row with correct role and agency_id
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
    agency_id = COALESCE(EXCLUDED.agency_id, public.users.agency_id);

  RETURN new;
END;
$$;

-- Backfill agency_id for existing users who have it in auth metadata but not in users table
UPDATE public.users pu
SET agency_id = (au.raw_user_meta_data ->> 'agency_id')::uuid
FROM auth.users au
WHERE pu.id = au.id
  AND pu.agency_id IS NULL
  AND au.raw_user_meta_data ->> 'agency_id' IS NOT NULL
  AND au.raw_user_meta_data ->> 'agency_id' != '';
