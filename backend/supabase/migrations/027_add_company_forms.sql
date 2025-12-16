-- Migration: Add company_forms table
-- Description: Store company registration forms linked by email
-- Forms can be filled before or after booking a meeting

-- Ensure uuid extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create company_forms table
CREATE TABLE IF NOT EXISTS company_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,

  -- Company Data
  contact_person TEXT,
  contact_phone TEXT,
  cnpj TEXT NOT NULL,
  business_name TEXT,
  legal_name TEXT NOT NULL,
  landline_phone TEXT,
  mobile_phone TEXT,
  website TEXT,
  employee_count TEXT,
  social_media TEXT,
  cep TEXT,
  address TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,

  -- Job Opening Data
  job_title TEXT NOT NULL,
  compensation TEXT NOT NULL,
  main_activities TEXT NOT NULL,
  required_skills TEXT NOT NULL,
  employment_type TEXT,
  urgency TEXT,
  age_range TEXT,
  education_level TEXT NOT NULL,
  benefits TEXT[],
  work_schedule TEXT NOT NULL,
  positions_count TEXT,
  gender_preference TEXT,
  notes TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One form per company email per admin
  UNIQUE(admin_id, email)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_company_forms_admin_id ON company_forms(admin_id);
CREATE INDEX IF NOT EXISTS idx_company_forms_email ON company_forms(email);
CREATE INDEX IF NOT EXISTS idx_company_forms_admin_email ON company_forms(admin_id, email);
CREATE INDEX IF NOT EXISTS idx_company_forms_status ON company_forms(status);

-- Enable RLS
ALTER TABLE company_forms ENABLE ROW LEVEL SECURITY;

-- Admins can manage their own forms
DROP POLICY IF EXISTS "Admins can manage own company forms" ON company_forms;
CREATE POLICY "Admins can manage own company forms"
  ON company_forms FOR ALL
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- Public can insert forms (for the public form page)
DROP POLICY IF EXISTS "Public can insert company forms" ON company_forms;
CREATE POLICY "Public can insert company forms"
  ON company_forms FOR INSERT
  WITH CHECK (true);

-- Public can view forms (for checking if form exists)
DROP POLICY IF EXISTS "Public can view company forms" ON company_forms;
CREATE POLICY "Public can view company forms"
  ON company_forms FOR SELECT
  USING (true);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_company_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_company_forms_updated_at ON company_forms;
CREATE TRIGGER update_company_forms_updated_at
  BEFORE UPDATE ON company_forms
  FOR EACH ROW EXECUTE FUNCTION update_company_forms_updated_at();
