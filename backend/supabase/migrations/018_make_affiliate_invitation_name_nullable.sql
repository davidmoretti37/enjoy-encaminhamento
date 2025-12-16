-- Migration: Make name column nullable in affiliate_invitations
-- Description: Admin no longer provides name, affiliate fills it during signup
-- Date: 2025-01-13

-- Make name column nullable since affiliate provides it during registration
ALTER TABLE public.affiliate_invitations
  ALTER COLUMN name DROP NOT NULL;

-- Also make city nullable since we now use cities array
ALTER TABLE public.affiliate_invitations
  ALTER COLUMN city DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN public.affiliate_invitations.name
  IS 'Legacy column - no longer used, affiliate provides name during registration';

COMMENT ON COLUMN public.affiliate_invitations.city
  IS 'Legacy column - replaced by cities array';
