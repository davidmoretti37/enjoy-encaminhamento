-- Migration: Add contract PDF columns to scheduled_meetings
-- Description: Allow storing uploaded signed contract PDFs

ALTER TABLE scheduled_meetings
ADD COLUMN IF NOT EXISTS contract_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS contract_pdf_key TEXT;

-- Add comment for documentation
COMMENT ON COLUMN scheduled_meetings.contract_pdf_url IS 'URL of the uploaded signed contract PDF';
COMMENT ON COLUMN scheduled_meetings.contract_pdf_key IS 'Storage key for the uploaded contract PDF';
