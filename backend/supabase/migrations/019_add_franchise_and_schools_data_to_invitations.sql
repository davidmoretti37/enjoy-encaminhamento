-- Migration: Add franchise and schools data to affiliate invitations
-- Description: Store complete franchise and schools data so admin fills everything
-- Date: 2025-01-13

-- Add JSONB columns for franchise and schools data
ALTER TABLE public.affiliate_invitations
  ADD COLUMN IF NOT EXISTS franchise_data JSONB;

ALTER TABLE public.affiliate_invitations
  ADD COLUMN IF NOT EXISTS schools_data JSONB;

-- Add comments
COMMENT ON COLUMN public.affiliate_invitations.franchise_data
  IS 'Complete franchise business details provided by admin (name, cnpj, contact, address, etc.)';

COMMENT ON COLUMN public.affiliate_invitations.schools_data
  IS 'Array of complete school details provided by admin for each city';
