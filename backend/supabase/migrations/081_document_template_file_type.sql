-- Add file_type column to agency_document_templates to support DOCX uploads
ALTER TABLE agency_document_templates
ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'pdf';

-- Update existing templates based on file extension
UPDATE agency_document_templates
SET file_type = CASE
  WHEN file_url ILIKE '%.docx' THEN 'docx'
  ELSE 'pdf'
END
WHERE file_type IS NULL OR file_type = 'pdf';
