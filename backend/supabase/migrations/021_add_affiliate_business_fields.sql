-- =====================================================
-- Add business fields to affiliates table
-- =====================================================

ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS trade_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(2),
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10),
  ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- Create index on CNPJ for faster lookups
CREATE INDEX IF NOT EXISTS idx_affiliates_cnpj ON public.affiliates(cnpj);

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
