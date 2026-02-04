-- ============================================
-- 057: Payment Tracking Enhancements
-- ============================================
-- Adds receipt tracking, insurance-fee payment type,
-- and insurance_fee field on contracts.

-- 1. Add receipt columns to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS receipt_key TEXT,
ADD COLUMN IF NOT EXISTS receipt_status VARCHAR(20) DEFAULT NULL
  CHECK (receipt_status IN ('pending-review', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS receipt_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS receipt_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS receipt_verified_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS ai_verification_result JSONB;

-- 2. Add 'insurance-fee' to payment_type check constraint
ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_payment_type_check;

ALTER TABLE payments
ADD CONSTRAINT payments_payment_type_check
CHECK (payment_type IN (
  'monthly-fee',
  'setup-fee',
  'insurance-fee',
  'penalty',
  'refund',
  'batch-unlock'
));

-- 3. Add insurance_fee column to contracts table
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS insurance_fee INTEGER DEFAULT 0;

-- 4. Add billing_period column to payments for display (e.g. '2026-02')
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS billing_period VARCHAR(7);

-- 5. Performance indexes
CREATE INDEX IF NOT EXISTS idx_payments_company_status
ON payments(company_id, status)
WHERE status IN ('pending', 'overdue');

CREATE INDEX IF NOT EXISTS idx_payments_company_due_date
ON payments(company_id, due_date)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_payments_receipt_status
ON payments(receipt_status)
WHERE receipt_status = 'pending-review';

CREATE INDEX IF NOT EXISTS idx_payments_due_date_status
ON payments(due_date, status)
WHERE status IN ('pending', 'overdue');
