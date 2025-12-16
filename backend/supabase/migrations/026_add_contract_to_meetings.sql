-- Migration: Add contract fields to scheduled_meetings
-- Description: Track contract status directly on meetings
-- Run this in Supabase SQL Editor

-- Ensure uuid extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add contract columns to scheduled_meetings
ALTER TABLE scheduled_meetings
ADD COLUMN IF NOT EXISTS contract_token UUID,
ADD COLUMN IF NOT EXISTS contract_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS contract_signature TEXT,
ADD COLUMN IF NOT EXISTS contract_signer_name TEXT,
ADD COLUMN IF NOT EXISTS contract_signer_cpf TEXT;

-- Set default for contract_token (separate statement for compatibility)
ALTER TABLE scheduled_meetings
ALTER COLUMN contract_token SET DEFAULT uuid_generate_v4();

-- Generate tokens for existing rows that don't have one
UPDATE scheduled_meetings
SET contract_token = uuid_generate_v4()
WHERE contract_token IS NULL;

-- Index for contract token lookups (for the public signing page)
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_contract_token
ON scheduled_meetings(contract_token);

-- Index for filtering by contract status
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_contract_sent_at
ON scheduled_meetings(contract_sent_at);

CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_contract_signed_at
ON scheduled_meetings(contract_signed_at);

-- Drop existing policy if it exists, then create new one
-- This allows public access to update meetings for contract signing
DO $$
BEGIN
    -- Drop the policy if it exists
    DROP POLICY IF EXISTS "Public can update meetings for contract signing" ON scheduled_meetings;

    -- Create the policy
    CREATE POLICY "Public can update meetings for contract signing"
        ON scheduled_meetings
        FOR UPDATE
        USING (true)
        WITH CHECK (true);
EXCEPTION
    WHEN undefined_object THEN
        -- Policy doesn't exist, create it
        CREATE POLICY "Public can update meetings for contract signing"
            ON scheduled_meetings
            FOR UPDATE
            USING (true)
            WITH CHECK (true);
END $$;

-- Also ensure public can select meetings by contract token (for viewing contract details)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public can view meetings by contract token" ON scheduled_meetings;

    CREATE POLICY "Public can view meetings by contract token"
        ON scheduled_meetings
        FOR SELECT
        USING (contract_token IS NOT NULL);
EXCEPTION
    WHEN undefined_object THEN
        CREATE POLICY "Public can view meetings by contract token"
            ON scheduled_meetings
            FOR SELECT
            USING (contract_token IS NOT NULL);
END $$;
