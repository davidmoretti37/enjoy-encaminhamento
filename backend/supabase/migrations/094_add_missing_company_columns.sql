-- =====================================================================
-- ADD MISSING COLUMNS TO COMPANIES TABLE
-- =====================================================================
-- The onboarding flow (company.submitOnboarding) writes these fields
-- to the companies table, but they were never added after 006_companies_table.sql
-- created a new companies table without them.
-- These fields exist in company_forms (027) but not in companies itself.
-- =====================================================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS landline_phone TEXT,
  ADD COLUMN IF NOT EXISTS mobile_phone TEXT,
  ADD COLUMN IF NOT EXISTS employee_count TEXT,
  ADD COLUMN IF NOT EXISTS social_media TEXT;
