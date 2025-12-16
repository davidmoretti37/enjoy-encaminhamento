-- Migration: Add contract signature fields to companies table
-- Description: Store initial onboarding contract signature on company record
-- Run this in Supabase SQL Editor

-- Add contract signature columns to companies
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS contract_signature TEXT,
ADD COLUMN IF NOT EXISTS contract_signer_name TEXT,
ADD COLUMN IF NOT EXISTS contract_signer_cpf TEXT,
ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ;

-- Index for filtering by contract status
CREATE INDEX IF NOT EXISTS idx_companies_contract_signed_at
ON companies(contract_signed_at);
