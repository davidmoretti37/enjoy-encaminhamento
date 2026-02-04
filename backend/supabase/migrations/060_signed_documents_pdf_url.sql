-- Migration 060: Add signed_pdf_url to store the generated PDF with embedded signature
ALTER TABLE public.signed_documents
  ADD COLUMN IF NOT EXISTS signed_pdf_url TEXT;
