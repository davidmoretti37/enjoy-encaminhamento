-- Add direct job_id to payments table for proper vaga filtering
-- Previously payments only linked to jobs through contracts, but contract_id is nullable

ALTER TABLE payments ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;

-- Backfill job_id from existing contracts
UPDATE payments
SET job_id = c.job_id
FROM contracts c
WHERE payments.contract_id = c.id
  AND payments.job_id IS NULL
  AND c.job_id IS NOT NULL;

-- Index for filtering payments by company + job
CREATE INDEX IF NOT EXISTS idx_payments_company_job ON payments(company_id, job_id);
