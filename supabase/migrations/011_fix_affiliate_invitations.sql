-- =====================================================
-- FIX AFFILIATE INVITATIONS TABLE
-- =====================================================

-- First, rename the column if it hasn't been renamed yet
DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name='affiliate_invitations'
    AND column_name='region'
  ) THEN
    ALTER TABLE public.affiliate_invitations RENAME COLUMN region TO city;
  END IF;
END $$;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Super admins can view invitations" ON public.affiliate_invitations;
DROP POLICY IF EXISTS "Super admins can create invitations" ON public.affiliate_invitations;
DROP POLICY IF EXISTS "Super admins can update invitations" ON public.affiliate_invitations;
DROP POLICY IF EXISTS "Anyone can verify invitations by token" ON public.affiliate_invitations;

-- Recreate RLS policies with better checks
CREATE POLICY "Super admins can view invitations" ON public.affiliate_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can create invitations" ON public.affiliate_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update invitations" ON public.affiliate_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- Allow anyone to verify invitations by token (needed for public invitation acceptance page)
CREATE POLICY "Anyone can verify invitations by token" ON public.affiliate_invitations
  FOR SELECT USING (true);

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
