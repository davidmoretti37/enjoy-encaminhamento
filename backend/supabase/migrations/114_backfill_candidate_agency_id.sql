-- =====================================================================
-- 114_backfill_candidate_agency_id.sql
-- =====================================================================
--
-- CONTEXT:
--   The handle_new_user() trigger before migration 113 did NOT copy
--   agency_id from auth metadata → public.users. This left every
--   candidate who signed up with a region selected as agency_id = NULL,
--   making them invisible to their agency.
--
--   Migration 113 fixed the trigger going forward, but existing rows
--   were never backfilled.
--
-- THIS MIGRATION:
--   1. Ensures the trigger is correct (idempotent safety net for 113)
--   2. Backfills agency_id for all existing users where it's NULL
--      but present in their auth metadata
--   3. Reports how many rows were fixed
-- =====================================================================

-- ─── 1. Ensure trigger includes agency_id (idempotent with 113) ─────

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
  -- Resolve role from signup metadata
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
      -- Verify agency exists to avoid FK violation
      IF NOT EXISTS (SELECT 1 FROM public.agencies WHERE id = v_agency_id) THEN
        v_agency_id := NULL;
      END IF;
    EXCEPTION WHEN invalid_text_representation THEN
      v_agency_id := NULL;
    END;
  END IF;

  -- Create users row with role AND agency_id
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

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ─── 2. Backfill agency_id from auth metadata ──────────────────────

-- Count before (for reporting)
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.users u
  JOIN auth.users au ON au.id = u.id
  WHERE u.agency_id IS NULL
    AND au.raw_user_meta_data ->> 'agency_id' IS NOT NULL
    AND au.raw_user_meta_data ->> 'agency_id' != '';
  RAISE NOTICE '[114] Users with NULL agency_id but metadata present: %', v_count;
END $$;

-- Backfill: set agency_id from auth metadata where valid
UPDATE public.users u
SET agency_id = (au.raw_user_meta_data ->> 'agency_id')::uuid
FROM auth.users au
WHERE u.id = au.id
  AND u.agency_id IS NULL
  AND au.raw_user_meta_data ->> 'agency_id' IS NOT NULL
  AND au.raw_user_meta_data ->> 'agency_id' != ''
  AND EXISTS (
    SELECT 1 FROM public.agencies a
    WHERE a.id = (au.raw_user_meta_data ->> 'agency_id')::uuid
  );

-- Count after (verification)
DO $$
DECLARE
  v_remaining integer;
BEGIN
  SELECT COUNT(*) INTO v_remaining
  FROM public.users u
  JOIN auth.users au ON au.id = u.id
  WHERE u.agency_id IS NULL
    AND au.raw_user_meta_data ->> 'agency_id' IS NOT NULL
    AND au.raw_user_meta_data ->> 'agency_id' != '';
  RAISE NOTICE '[114] Users still missing agency_id after backfill: % (these have invalid/deleted agency refs)', v_remaining;
END $$;


-- ─── 3. Also backfill orphaned auth users with no public.users row ──

INSERT INTO public.users (id, email, name, role, agency_id, created_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data ->> 'name', NULL),
  CASE
    WHEN au.raw_user_meta_data ->> 'role' = 'company' THEN 'company'::user_role
    WHEN au.raw_user_meta_data ->> 'role' = 'agency' THEN 'agency'::user_role
    ELSE 'candidate'::user_role
  END,
  CASE
    WHEN au.raw_user_meta_data ->> 'agency_id' IS NOT NULL
         AND au.raw_user_meta_data ->> 'agency_id' != ''
         AND EXISTS (SELECT 1 FROM public.agencies WHERE id = (au.raw_user_meta_data ->> 'agency_id')::uuid)
    THEN (au.raw_user_meta_data ->> 'agency_id')::uuid
    ELSE NULL
  END,
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;
