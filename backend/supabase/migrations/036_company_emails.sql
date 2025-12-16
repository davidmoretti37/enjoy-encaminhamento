-- Migration: Add company_emails table for multiple email addresses

-- Create emails table for companies
CREATE TABLE IF NOT EXISTS public.company_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups by company
CREATE INDEX IF NOT EXISTS idx_company_emails_company_id ON public.company_emails(company_id);

-- Enable RLS
ALTER TABLE public.company_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view emails for companies they have access to
CREATE POLICY "Users can view company emails" ON public.company_emails
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'affiliate', 'school'))
  );

-- Policy: Company owners can insert their emails
CREATE POLICY "Company owners can insert emails" ON public.company_emails
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid())
  );

-- Policy: Company owners can delete their emails
CREATE POLICY "Company owners can delete emails" ON public.company_emails
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid())
  );

-- Policy: Company owners can update their emails
CREATE POLICY "Company owners can update emails" ON public.company_emails
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.user_id = auth.uid())
  );
