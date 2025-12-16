-- Migration: Add number_of_schools to affiliate_invitations
-- Description: Allow admin to specify how many schools an affiliate must register
-- Date: 2025-01-13

-- Add number_of_schools column
ALTER TABLE public.affiliate_invitations
  ADD COLUMN IF NOT EXISTS number_of_schools INTEGER NOT NULL DEFAULT 1;

-- Add constraint to ensure positive number within reasonable range
ALTER TABLE public.affiliate_invitations
  ADD CONSTRAINT check_number_of_schools_positive
  CHECK (number_of_schools > 0 AND number_of_schools <= 100);

-- Add comment
COMMENT ON COLUMN public.affiliate_invitations.number_of_schools
  IS 'Number of schools the affiliate must register during signup';
