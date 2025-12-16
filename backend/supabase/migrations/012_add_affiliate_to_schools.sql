-- =====================================================
-- ADD AFFILIATE_ID TO SCHOOLS TABLE
-- =====================================================

-- Add affiliate_id column to schools table
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES public.affiliates(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_schools_affiliate_id ON public.schools(affiliate_id);

-- Add comment
COMMENT ON COLUMN public.schools.affiliate_id IS 'Reference to the affiliate (franchise owner) managing this school';

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
