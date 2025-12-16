-- =====================================================
-- COMPANY PIPELINE STATUS MIGRATION
-- =====================================================
-- Purpose: Add pipeline status for tracking company journey
-- from outreach to contract signing
-- =====================================================

-- Make user_id nullable so companies can be created before they have an account
ALTER TABLE companies ALTER COLUMN user_id DROP NOT NULL;

-- Add pipeline status for tracking company journey through onboarding
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pipeline_status TEXT
  DEFAULT 'lead'
  CHECK (pipeline_status IN (
    'lead',              -- Initial contact / email sent
    'form_sent',         -- Form link sent to company
    'form_filled',       -- Company completed the form
    'meeting_scheduled', -- Meeting booked
    'meeting_done',      -- Meeting completed
    'contract_sent',     -- Contract link sent
    'contract_signed'    -- Contract signed, ready for account activation
  ));

-- Add contract fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contract_token UUID DEFAULT gen_random_uuid();
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contract_signature TEXT; -- Base64 signature image
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contract_signer_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contract_signer_cpf TEXT;

-- Add registration token for account creation after contract approval
ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_token UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS registration_token_expires_at TIMESTAMPTZ;

-- Create index for contract token lookups
CREATE INDEX IF NOT EXISTS idx_companies_contract_token ON public.companies(contract_token);
CREATE INDEX IF NOT EXISTS idx_companies_pipeline_status ON public.companies(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_companies_registration_token ON public.companies(registration_token) WHERE registration_token IS NOT NULL;

-- Grant public access to companies table for contract signing (anonymous access)
-- This is needed so unauthenticated users can sign contracts via token
CREATE POLICY "Anyone can view company by contract token"
  ON public.companies
  FOR SELECT
  TO anon
  USING (contract_token IS NOT NULL);

CREATE POLICY "Anyone can update company contract signature"
  ON public.companies
  FOR UPDATE
  TO anon
  USING (contract_token IS NOT NULL)
  WITH CHECK (contract_token IS NOT NULL);
