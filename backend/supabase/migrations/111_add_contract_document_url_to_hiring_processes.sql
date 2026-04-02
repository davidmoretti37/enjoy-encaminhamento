-- Add contract_document_url column to hiring_processes
-- This stores the URL of the uploaded contract PDF for active employees
ALTER TABLE hiring_processes ADD COLUMN IF NOT EXISTS contract_document_url TEXT;
