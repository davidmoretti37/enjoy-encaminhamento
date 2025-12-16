-- Migration: Change number_of_schools to cities array
-- Description: Store city names instead of just count, so affiliate knows which city each school is for
-- Date: 2025-01-13

-- Remove the old column and constraint
ALTER TABLE public.affiliate_invitations
  DROP CONSTRAINT IF EXISTS check_number_of_schools_positive;

ALTER TABLE public.affiliate_invitations
  DROP COLUMN IF EXISTS number_of_schools;

-- Add cities array column
ALTER TABLE public.affiliate_invitations
  ADD COLUMN IF NOT EXISTS cities TEXT[] NOT NULL DEFAULT '{}';

-- Add constraint to ensure at least one city and max 100 cities
ALTER TABLE public.affiliate_invitations
  ADD CONSTRAINT check_cities_length
  CHECK (array_length(cities, 1) > 0 AND array_length(cities, 1) <= 100);

-- Add comment
COMMENT ON COLUMN public.affiliate_invitations.cities
  IS 'Array of city names that the affiliate must register schools for during signup';
