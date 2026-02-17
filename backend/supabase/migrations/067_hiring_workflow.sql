-- Hiring Workflow Tables
-- Supports complete hiring funnel from interview to employee management
-- Handles different flows for Estágio (4-party signing, recurring) vs CLT (one-time payment)

-- ============================================
-- 1. EXTEND CANDIDATES WITH PARENT/SCHOOL INFO
-- ============================================

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS parent_guardian_name TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS parent_guardian_cpf VARCHAR(14);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS parent_guardian_email TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS parent_guardian_phone VARCHAR(20);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS educational_institution_name TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS educational_institution_email TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS educational_institution_contact TEXT;

-- ============================================
-- 2. HIRING PROCESSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS hiring_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES candidate_batches(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Type and status
  hiring_type VARCHAR(20) NOT NULL CHECK (hiring_type IN ('estagio', 'clt', 'menor-aprendiz')),
  status VARCHAR(30) NOT NULL DEFAULT 'pending_signatures'
    CHECK (status IN ('pending_signatures', 'pending_payment', 'active', 'completed', 'cancelled')),

  -- Fee calculation
  is_first_intern BOOLEAN DEFAULT false,
  calculated_fee INTEGER NOT NULL, -- In cents

  -- 4-party signature tracking (for estágio)
  company_signed BOOLEAN DEFAULT false,
  company_signed_at TIMESTAMPTZ,
  company_signer_name TEXT,
  company_signer_cpf VARCHAR(14),

  candidate_signed BOOLEAN DEFAULT false,
  candidate_signed_at TIMESTAMPTZ,
  candidate_signer_cpf VARCHAR(14),

  parent_signed BOOLEAN DEFAULT false,
  parent_signed_at TIMESTAMPTZ,
  parent_signer_name TEXT,
  parent_signer_cpf VARCHAR(14),

  school_signed BOOLEAN DEFAULT false,
  school_signed_at TIMESTAMPTZ,
  school_signer_name TEXT,
  school_signer_contact TEXT,

  -- Contract dates
  start_date DATE NOT NULL,
  end_date DATE, -- NULL for CLT (indefinite)
  monthly_salary INTEGER, -- In cents

  -- Insurance tracking (estágio)
  insurance_status VARCHAR(20) CHECK (insurance_status IN ('pending', 'active', 'expired')),
  insurance_expires_at DATE,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. SIGNING INVITATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS signing_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hiring_process_id UUID NOT NULL REFERENCES hiring_processes(id) ON DELETE CASCADE,
  signer_role VARCHAR(30) NOT NULL CHECK (signer_role IN ('candidate', 'parent_guardian', 'educational_institution')),
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_phone VARCHAR(20),
  token UUID DEFAULT gen_random_uuid() UNIQUE,

  -- Status
  email_sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signature TEXT, -- Base64 signature image
  signer_cpf VARCHAR(14),
  signer_ip TEXT,

  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. FOLLOW-UP SCHEDULE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS follow_up_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hiring_process_id UUID REFERENCES hiring_processes(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  scheduled_at TIMESTAMPTZ NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('monthly', 'bimonthly', 'clt_30_day', 'contract_expiring', 'insurance_expiring')),

  -- Tracking
  notification_sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  feedback_received BOOLEAN DEFAULT false,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. EXTEND SIGNED_DOCUMENTS
-- ============================================

ALTER TABLE signed_documents ADD COLUMN IF NOT EXISTS signer_role VARCHAR(30);
ALTER TABLE signed_documents ADD COLUMN IF NOT EXISTS hiring_process_id UUID REFERENCES hiring_processes(id) ON DELETE SET NULL;
ALTER TABLE signed_documents ADD COLUMN IF NOT EXISTS signer_ip TEXT;

-- ============================================
-- 6. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_hiring_processes_application ON hiring_processes(application_id);
CREATE INDEX IF NOT EXISTS idx_hiring_processes_company ON hiring_processes(company_id);
CREATE INDEX IF NOT EXISTS idx_hiring_processes_candidate ON hiring_processes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_hiring_processes_status ON hiring_processes(status);
CREATE INDEX IF NOT EXISTS idx_hiring_processes_type ON hiring_processes(hiring_type);

CREATE INDEX IF NOT EXISTS idx_signing_invitations_token ON signing_invitations(token);
CREATE INDEX IF NOT EXISTS idx_signing_invitations_hiring ON signing_invitations(hiring_process_id);
CREATE INDEX IF NOT EXISTS idx_signing_invitations_pending ON signing_invitations(hiring_process_id)
  WHERE signed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_follow_up_scheduled ON follow_up_schedule(scheduled_at)
  WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_follow_up_company ON follow_up_schedule(company_id);

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE hiring_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE signing_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_schedule ENABLE ROW LEVEL SECURITY;

-- Hiring processes policies
CREATE POLICY "Companies can view their hiring processes"
  ON hiring_processes FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Companies can insert hiring processes"
  ON hiring_processes FOR INSERT
  WITH CHECK (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Companies can update their hiring processes"
  ON hiring_processes FOR UPDATE
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

CREATE POLICY "Candidates can view their hiring processes"
  ON hiring_processes FOR SELECT
  USING (candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid()));

-- Signing invitations policies
CREATE POLICY "Companies can view signing invitations for their processes"
  ON signing_invitations FOR SELECT
  USING (hiring_process_id IN (
    SELECT id FROM hiring_processes WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Companies can insert signing invitations"
  ON signing_invitations FOR INSERT
  WITH CHECK (hiring_process_id IN (
    SELECT id FROM hiring_processes WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

-- Public access for signing by token (handled by service role in backend)
CREATE POLICY "Anyone can view invitation by token"
  ON signing_invitations FOR SELECT
  USING (true); -- Token validation happens in backend

CREATE POLICY "Anyone can update invitation by token"
  ON signing_invitations FOR UPDATE
  USING (true); -- Token validation happens in backend

-- Follow-up policies
CREATE POLICY "Companies can view their follow-ups"
  ON follow_up_schedule FOR SELECT
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- Service role bypass
CREATE POLICY "Service role full access on hiring_processes"
  ON hiring_processes FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on signing_invitations"
  ON signing_invitations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on follow_up_schedule"
  ON follow_up_schedule FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 8. UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_hiring_processes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_hiring_processes_updated_at
  BEFORE UPDATE ON hiring_processes
  FOR EACH ROW
  EXECUTE FUNCTION update_hiring_processes_updated_at();

-- ============================================
-- 9. AUTO-ACTIVATE ON ALL SIGNATURES (ESTÁGIO)
-- ============================================

CREATE OR REPLACE FUNCTION check_hiring_signatures_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for estágio with all 4 signatures
  IF NEW.hiring_type = 'estagio'
     AND NEW.company_signed = true
     AND NEW.candidate_signed = true
     AND NEW.parent_signed = true
     AND NEW.school_signed = true
     AND NEW.status = 'pending_signatures' THEN
    NEW.status = 'active';
  END IF;

  -- For CLT, only company signature needed (contract is external)
  IF NEW.hiring_type = 'clt'
     AND NEW.company_signed = true
     AND NEW.status = 'pending_signatures' THEN
    NEW.status = 'pending_payment';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_signatures
  BEFORE UPDATE ON hiring_processes
  FOR EACH ROW
  EXECUTE FUNCTION check_hiring_signatures_complete();
