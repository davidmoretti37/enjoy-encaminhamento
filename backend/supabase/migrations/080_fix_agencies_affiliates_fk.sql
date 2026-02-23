-- Fix the agencies -> affiliates FK relationship after table rename (schools -> agencies)
-- PostgREST schema cache lost track of the relationship after the rename

-- Drop the old FK constraint (may have the old name from when table was 'schools')
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'agencies'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'affiliate_id';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.agencies DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Re-add with an explicit name
ALTER TABLE public.agencies
  ADD CONSTRAINT agencies_affiliate_id_fkey
  FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE SET NULL;

-- Also fix agency_invitations -> affiliates FK if broken
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'agency_invitations'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'affiliate_id';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.agency_invitations DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.agency_invitations
  ADD CONSTRAINT agency_invitations_affiliate_id_fkey
  FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE CASCADE;

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
