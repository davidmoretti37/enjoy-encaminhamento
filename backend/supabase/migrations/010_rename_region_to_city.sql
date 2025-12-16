-- =====================================================
-- RENAME REGION TO CITY MIGRATION
-- =====================================================
-- Change 'region' to 'city' in affiliates and affiliate_invitations tables
-- to better reflect the business model where franchises manage cities

-- Rename column in affiliates table
ALTER TABLE public.affiliates
  RENAME COLUMN region TO city;

-- Rename column in affiliate_invitations table
ALTER TABLE public.affiliate_invitations
  RENAME COLUMN region TO city;

-- Update indexes
DROP INDEX IF EXISTS idx_affiliates_region;
CREATE INDEX IF NOT EXISTS idx_affiliates_city ON public.affiliates(city);

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
