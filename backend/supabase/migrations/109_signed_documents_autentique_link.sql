-- Link signed_documents to autentique_documents for tracking
-- Allow nullable signer_cpf and signature for Autentique-sourced records
ALTER TABLE signed_documents ALTER COLUMN signer_cpf DROP NOT NULL;
ALTER TABLE signed_documents ALTER COLUMN signature DROP NOT NULL;
ALTER TABLE signed_documents ADD COLUMN IF NOT EXISTS autentique_document_id UUID REFERENCES autentique_documents(id);
CREATE INDEX IF NOT EXISTS idx_signed_docs_autentique ON signed_documents(autentique_document_id) WHERE autentique_document_id IS NOT NULL;
