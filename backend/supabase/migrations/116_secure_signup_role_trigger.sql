-- =====================================================================
-- 116_secure_signup_role_trigger.sql
-- =====================================================================
--
-- SECURITY FIX (role escalation via self-service signup):
--   The handle_new_user() trigger mapped raw_user_meta_data->>'role'
--   directly to public.users.role, honoring 'agency'. Because
--   raw_user_meta_data is populated verbatim from the client's
--   supabase.auth.signUp({ options: { data: { role } } }) call, ANY
--   user could self-assign the privileged 'agency' role (RLS grants
--   agency broad candidate/company/job access). This was a real
--   privilege-escalation.
--
-- THIS MIGRATION redefines handle_new_user() so that:
--   * 'agency' (and any admin/super_admin) can NEVER be granted from
--     client metadata — those fall through to 'candidate'. Legitimate
--     agency accounts are created only server-side by acceptAgencyInvitation
--     (service role), which upserts role='agency' AFTER signup and thus
--     overrides the candidate default.
--   * 'company' remains allowed (low privilege: a company can only ever
--     reach its own company row; a bare company account sees nothing).
--   * ON CONFLICT never DOWNGRADES an already-privileged role — once a
--     row is agency/admin/super_admin/company (set server-side), a later
--     trigger fire cannot demote it back to candidate.
--
-- agency_id handling and the rest of the flow are unchanged.
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
  -- Resolve role from signup metadata — NEVER trust it for privileged roles.
  -- Only 'company' (low privilege) is honored; everything else, including
  -- 'agency'/'admin'/'super_admin', defaults to 'candidate'. Privileged roles
  -- are assigned exclusively by server-side (service-role) invitation flows.
  v_requested_role := new.raw_user_meta_data ->> 'role';

  IF v_requested_role = 'company' THEN
    v_role := 'company'::user_role;
  ELSE
    v_role := 'candidate'::user_role;
  END IF;

  -- Extract and validate agency_id from metadata (used for candidate region
  -- assignment; validated against a real agency to avoid FK violations).
  v_agency_id_text := new.raw_user_meta_data ->> 'agency_id';
  v_agency_id := NULL;

  IF v_agency_id_text IS NOT NULL AND v_agency_id_text != '' THEN
    BEGIN
      v_agency_id := v_agency_id_text::uuid;
      IF NOT EXISTS (SELECT 1 FROM public.agencies WHERE id = v_agency_id) THEN
        v_agency_id := NULL;
      END IF;
    EXCEPTION WHEN invalid_text_representation THEN
      v_agency_id := NULL;
    END;
  END IF;

  INSERT INTO public.users (id, email, name, role, agency_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'name', NULL),
    v_role,
    v_agency_id
  )
  ON CONFLICT (id) DO UPDATE SET
    -- Never downgrade an already-privileged role. Once a user has been
    -- promoted server-side (agency/admin/super_admin/company), keep it.
    role = CASE
      WHEN public.users.role IN ('agency','admin','super_admin','company')
        THEN public.users.role
      ELSE EXCLUDED.role
    END,
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    agency_id = COALESCE(public.users.agency_id, EXCLUDED.agency_id);

  RETURN new;
END;
$$;

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
