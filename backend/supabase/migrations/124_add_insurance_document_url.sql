-- =====================================================================
-- 124_add_insurance_document_url.sql
-- =====================================================================
-- ANEC report items #20/#23: the intern's life-insurance policy (apólice) needs
-- a document, uploaded and controlled by ANEC, that the company can view. Store
-- the Storage URL on the hiring process. Uploading it also flips insurance_status
-- off 'pending'.
-- =====================================================================
ALTER TABLE hiring_processes ADD COLUMN IF NOT EXISTS insurance_document_url TEXT;
COMMENT ON COLUMN hiring_processes.insurance_document_url IS
  'Supabase Storage (contracts bucket) URL for the intern life-insurance policy (apólice). Uploaded/controlled by ANEC via the agency portal; company has view-only access.';
