-- Update payments table schema for hiring process payments
-- The legacy schema used school_id/franchise_id; the new hiring flow uses company_id

-- Make legacy columns nullable
ALTER TABLE payments ALTER COLUMN contract_id DROP NOT NULL;
ALTER TABLE payments ALTER COLUMN school_id DROP NOT NULL;

-- Add columns needed by the application
ALTER TABLE payments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS billing_period VARCHAR(10);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_key TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_status VARCHAR(20);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_verified_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_verified_by UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS ai_verification_result JSONB;

-- Index for company payment lookups
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payments(company_id);
