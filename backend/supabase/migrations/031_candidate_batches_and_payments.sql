-- Migration 031: Add candidate batches and payment system for pre-selection
-- This implements the pay-to-unlock system for candidate pre-selections

-- ============================================
-- 1. CREATE CANDIDATE_BATCHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS candidate_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Top 15 candidate IDs from job_matches
  candidate_ids UUID[] NOT NULL,
  batch_size INTEGER NOT NULL DEFAULT 15,

  -- Payment tracking
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'overdue', 'failed', 'cancelled')),
  unlock_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,

  -- Lock/unlock status
  unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ,

  -- Meeting scheduling
  meeting_scheduled_at TIMESTAMPTZ,
  meeting_link TEXT,
  meeting_notes TEXT,
  meeting_completed_at TIMESTAMPTZ,

  -- Candidate selection after meeting
  selected_candidate_ids UUID[],
  selection_completed_at TIMESTAMPTZ,

  -- Status workflow
  status VARCHAR(30) NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',              -- School reviewing AI matches
      'sent',               -- Sent to company (payment required)
      'unlocked',           -- Company paid, can view details
      'meeting_scheduled',  -- Meeting scheduled
      'completed',          -- Company selected candidates
      'cancelled'           -- Batch cancelled
    )),

  -- Timestamps
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique index to allow only one non-completed batch per job
CREATE UNIQUE INDEX idx_one_active_batch_per_job
ON candidate_batches(job_id)
WHERE status NOT IN ('completed', 'cancelled');

-- Performance indexes
CREATE INDEX idx_batches_job ON candidate_batches(job_id);
CREATE INDEX idx_batches_school ON candidate_batches(school_id);
CREATE INDEX idx_batches_company ON candidate_batches(company_id);
CREATE INDEX idx_batches_status ON candidate_batches(status);
CREATE INDEX idx_batches_payment_status ON candidate_batches(payment_status)
  WHERE payment_status IN ('pending', 'overdue');
CREATE INDEX idx_batches_unlocked ON candidate_batches(unlocked)
  WHERE unlocked = TRUE;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_candidate_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_candidate_batches_updated_at
BEFORE UPDATE ON candidate_batches
FOR EACH ROW
EXECUTE FUNCTION update_candidate_batches_updated_at();

-- ============================================
-- 2. CREATE SCHOOL_EMPLOYEE_TYPE_SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS school_employee_type_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

  -- Employee type (estagio, clt, menor-aprendiz)
  employee_type VARCHAR(30) NOT NULL
    CHECK (employee_type IN ('estagio', 'clt', 'menor-aprendiz')),

  -- Contract template (PDF or HTML)
  contract_template_type VARCHAR(10)
    CHECK (contract_template_type IN ('pdf', 'html')),
  contract_pdf_url TEXT,
  contract_pdf_key TEXT,  -- S3 key for deletion if needed
  contract_html TEXT,

  -- Payment configuration
  payment_frequency VARCHAR(20) NOT NULL DEFAULT 'one_time'
    CHECK (payment_frequency IN ('one_time', 'recurring')),

  -- Default unlock fee (can be overridden per batch)
  default_unlock_fee NUMERIC(10,2) DEFAULT 0.00,

  -- Monthly fee after hire (for recurring payment types)
  monthly_fee NUMERIC(10,2) DEFAULT 0.00,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One configuration per school per employee type
  UNIQUE(school_id, employee_type)
);

-- Performance index
CREATE INDEX idx_school_employee_settings_school ON school_employee_type_settings(school_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_school_employee_type_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_school_employee_type_settings_updated_at
BEFORE UPDATE ON school_employee_type_settings
FOR EACH ROW
EXECUTE FUNCTION update_school_employee_type_settings_updated_at();

-- ============================================
-- 3. EXTEND PAYMENTS TABLE
-- ============================================

-- Add batch_id column to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES candidate_batches(id) ON DELETE SET NULL;

-- Add index for batch payments
CREATE INDEX IF NOT EXISTS idx_payments_batch ON payments(batch_id)
  WHERE batch_id IS NOT NULL;

-- Update payment_type constraint to include 'batch-unlock'
ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_payment_type_check;

ALTER TABLE payments
ADD CONSTRAINT payments_payment_type_check
CHECK (payment_type IN (
  'monthly-fee',
  'setup-fee',
  'penalty',
  'refund',
  'batch-unlock'
));

-- ============================================
-- 4. AUTO-UNLOCK BATCH ON PAYMENT
-- ============================================

-- Trigger to automatically unlock batch when payment is confirmed
CREATE OR REPLACE FUNCTION unlock_batch_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment status changes to 'paid' and it has a batch_id
  IF NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.batch_id IS NOT NULL THEN
    UPDATE candidate_batches
    SET
      unlocked = TRUE,
      unlocked_at = now(),
      payment_status = 'paid',
      status = CASE
        WHEN status IN ('sent', 'draft') THEN 'unlocked'
        ELSE status
      END
    WHERE id = NEW.batch_id;

    -- Log the unlock
    RAISE NOTICE 'Batch % unlocked due to payment %', NEW.batch_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_unlock_batch_on_payment
AFTER UPDATE ON payments
FOR EACH ROW
WHEN (NEW.batch_id IS NOT NULL)
EXECUTE FUNCTION unlock_batch_on_payment();

-- ============================================
-- 5. SYNC PAYMENT STATUS FROM BATCH TO PAYMENT
-- ============================================

-- Keep payment_status in sync between batches and payments tables
CREATE OR REPLACE FUNCTION sync_batch_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync payment status when batch payment_id is set
  IF NEW.payment_id IS NOT NULL AND OLD.payment_id IS DISTINCT FROM NEW.payment_id THEN
    -- Get payment status and update batch
    UPDATE candidate_batches cb
    SET payment_status = p.status
    FROM payments p
    WHERE cb.id = NEW.id AND p.id = NEW.payment_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_batch_payment_status
AFTER UPDATE ON candidate_batches
FOR EACH ROW
WHEN (NEW.payment_id IS NOT NULL)
EXECUTE FUNCTION sync_batch_payment_status();

-- ============================================
-- 6. RLS POLICIES FOR CANDIDATE_BATCHES
-- ============================================

-- Enable RLS
ALTER TABLE candidate_batches ENABLE ROW LEVEL SECURITY;

-- Policy: Schools can view their own batches
CREATE POLICY "Schools can view their own batches"
ON candidate_batches
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM schools s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = candidate_batches.school_id
    AND u.id = auth.uid()
  )
);

-- Policy: Companies can view batches sent to them
CREATE POLICY "Companies can view their batches"
ON candidate_batches
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM companies c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = candidate_batches.company_id
    AND u.id = auth.uid()
  )
);

-- Policy: Schools can create batches
CREATE POLICY "Schools can create batches"
ON candidate_batches
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM schools s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = candidate_batches.school_id
    AND u.id = auth.uid()
  )
);

-- Policy: Schools can update their own batches
CREATE POLICY "Schools can update their own batches"
ON candidate_batches
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM schools s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = candidate_batches.school_id
    AND u.id = auth.uid()
  )
);

-- Policy: Companies can update selection in their batches
CREATE POLICY "Companies can update their batch selections"
ON candidate_batches
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM companies c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = candidate_batches.company_id
    AND u.id = auth.uid()
  )
)
WITH CHECK (
  -- Companies can only update selection-related fields
  OLD.school_id = NEW.school_id AND
  OLD.company_id = NEW.company_id AND
  OLD.job_id = NEW.job_id AND
  OLD.candidate_ids = NEW.candidate_ids
);

-- ============================================
-- 7. RLS POLICIES FOR SCHOOL_EMPLOYEE_TYPE_SETTINGS
-- ============================================

-- Enable RLS
ALTER TABLE school_employee_type_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Schools can view and manage their own settings
CREATE POLICY "Schools can manage their employee type settings"
ON school_employee_type_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM schools s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = school_employee_type_settings.school_id
    AND u.id = auth.uid()
  )
);

-- Policy: Companies can view school settings (for contract templates)
CREATE POLICY "Companies can view school employee type settings"
ON school_employee_type_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM companies c
    JOIN schools s ON c.school_id = s.id
    JOIN users u ON c.user_id = u.id
    WHERE s.id = school_employee_type_settings.school_id
    AND u.id = auth.uid()
  )
);

-- ============================================
-- 8. ADD HELPER FUNCTIONS
-- ============================================

-- Function to get top N matches for a job
CREATE OR REPLACE FUNCTION get_top_matches_for_job(
  p_job_id UUID,
  p_limit INTEGER DEFAULT 15,
  p_min_score NUMERIC DEFAULT 50
)
RETURNS TABLE (
  match_id UUID,
  candidate_id UUID,
  composite_score NUMERIC,
  confidence_score NUMERIC,
  recommendation VARCHAR,
  match_reasoning TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    jm.id,
    jm.candidate_id,
    jm.composite_score,
    jm.confidence_score,
    jm.recommendation,
    jm.match_reasoning
  FROM job_matches jm
  WHERE jm.job_id = p_job_id
    AND jm.composite_score >= p_min_score
  ORDER BY jm.composite_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if batch can be unlocked
CREATE OR REPLACE FUNCTION can_unlock_batch(p_batch_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_payment_status VARCHAR;
BEGIN
  SELECT payment_status INTO v_payment_status
  FROM candidate_batches
  WHERE id = p_batch_id;

  RETURN v_payment_status = 'paid';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE candidate_batches IS 'Stores pre-selection batches of candidates sent to companies. Companies must pay to unlock candidate details.';
COMMENT ON COLUMN candidate_batches.candidate_ids IS 'Array of candidate UUIDs (top 15 from AI matching)';
COMMENT ON COLUMN candidate_batches.unlock_fee IS 'Amount company must pay to unlock and view candidate details';
COMMENT ON COLUMN candidate_batches.unlocked IS 'Whether company has paid and can view candidate details';
COMMENT ON COLUMN candidate_batches.status IS 'Workflow status: draft -> sent -> unlocked -> meeting_scheduled -> completed';

COMMENT ON TABLE school_employee_type_settings IS 'School configuration for contract templates and payment settings per employee type (estagio, clt, menor-aprendiz)';
COMMENT ON COLUMN school_employee_type_settings.payment_frequency IS 'Whether payments for this employee type are one_time or recurring';
COMMENT ON COLUMN school_employee_type_settings.default_unlock_fee IS 'Default fee to unlock candidate batch for this employee type';

COMMENT ON COLUMN payments.batch_id IS 'Reference to candidate_batch if this is a batch-unlock payment';

-- ============================================
-- 10. GRANT PERMISSIONS
-- ============================================

-- Grant permissions to authenticated users (RLS policies control access)
GRANT SELECT, INSERT, UPDATE ON candidate_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON school_employee_type_settings TO authenticated;
