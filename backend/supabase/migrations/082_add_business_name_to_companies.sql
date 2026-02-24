-- Add business_name column to companies table
-- Code references this column but it only existed on company_forms
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS business_name TEXT;
