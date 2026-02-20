-- ============================================
-- Autentique Digital Signature Integration
-- Adds tracking for documents sent to Autentique API
-- ============================================

-- 1. Central tracking table for all Autentique documents
CREATE TABLE IF NOT EXISTS autentique_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autentique_document_id TEXT NOT NULL UNIQUE,
  document_name TEXT NOT NULL,

  -- Context: which flow this belongs to
  context_type TEXT NOT NULL CHECK (context_type IN ('outreach_contract', 'hiring_contract', 'onboarding_contract')),
  -- For outreach: scheduled_meetings.id. For hiring: hiring_processes.id
  context_id UUID NOT NULL,

  -- Template source
  template_id UUID REFERENCES agency_document_templates(id) ON DELETE SET NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'signed', 'refused', 'expired')),
  signed_pdf_url TEXT,

  -- Signer mapping: [{role, email, name, autentique_signer_id, sign_url, signed_at}]
  signers JSONB NOT NULL DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_autentique_docs_context
  ON autentique_documents(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_autentique_docs_autentique_id
  ON autentique_documents(autentique_document_id);

-- RLS
ALTER TABLE autentique_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on autentique_documents"
  ON autentique_documents FOR ALL
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger (reuse existing function if available)
CREATE OR REPLACE FUNCTION update_autentique_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_autentique_documents_updated_at
  BEFORE UPDATE ON autentique_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_autentique_documents_updated_at();

-- 2. Add Autentique tracking columns to signing_invitations
ALTER TABLE signing_invitations
  ADD COLUMN IF NOT EXISTS autentique_document_id TEXT,
  ADD COLUMN IF NOT EXISTS autentique_signer_id TEXT,
  ADD COLUMN IF NOT EXISTS autentique_sign_url TEXT;

CREATE INDEX IF NOT EXISTS idx_signing_inv_autentique_doc
  ON signing_invitations(autentique_document_id)
  WHERE autentique_document_id IS NOT NULL;

-- 3. Add Autentique tracking to hiring_processes
ALTER TABLE hiring_processes
  ADD COLUMN IF NOT EXISTS autentique_document_ids TEXT[] DEFAULT '{}';

-- 4. Add Autentique tracking to scheduled_meetings (outreach contracts)
ALTER TABLE scheduled_meetings
  ADD COLUMN IF NOT EXISTS autentique_document_ids TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS autentique_sign_url TEXT;
