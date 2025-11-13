-- Migration: Update school_invitations to use affiliate_id
-- Description: Rename franchise_id to affiliate_id in school_invitations table
-- Date: 2025-01-12

-- Drop the old foreign key constraint
ALTER TABLE public.school_invitations
DROP CONSTRAINT IF EXISTS school_invitations_franchise_id_fkey;

-- Drop the old index
DROP INDEX IF EXISTS idx_school_invitations_franchise_id;

-- Rename the column
ALTER TABLE public.school_invitations
RENAME COLUMN franchise_id TO affiliate_id;

-- Add new foreign key constraint to affiliates table
ALTER TABLE public.school_invitations
ADD CONSTRAINT school_invitations_affiliate_id_fkey
FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id) ON DELETE CASCADE;

-- Add new index
CREATE INDEX idx_school_invitations_affiliate_id ON public.school_invitations(affiliate_id);

-- Update the comment
COMMENT ON COLUMN public.school_invitations.affiliate_id IS 'Affiliate (franchise) that this school will belong to';

-- Update RLS policy that references franchise
DROP POLICY IF EXISTS "Franchises can view their own invitations" ON public.school_invitations;

CREATE POLICY "Affiliates can view their own invitations"
  ON public.school_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'affiliate'
      AND users.id IN (
        SELECT user_id FROM public.affiliates WHERE affiliates.id = school_invitations.affiliate_id
      )
    )
  );
