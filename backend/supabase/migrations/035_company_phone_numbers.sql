-- Migration: Add company_phone_numbers table for multiple phone numbers with labels

-- Create phone_numbers table for companies
CREATE TABLE IF NOT EXISTS public.company_phone_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by company
CREATE INDEX IF NOT EXISTS idx_company_phone_numbers_company_id ON public.company_phone_numbers(company_id);

-- Enable RLS
ALTER TABLE public.company_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view phone numbers for companies they have access to
CREATE POLICY "Users can view company phone numbers" ON public.company_phone_numbers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'affiliate', 'school'))
  );

-- Policy: Company owners can insert their phone numbers
CREATE POLICY "Company owners can insert phone numbers" ON public.company_phone_numbers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid())
  );

-- Policy: Company owners can delete their phone numbers
CREATE POLICY "Company owners can delete phone numbers" ON public.company_phone_numbers
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid())
  );
