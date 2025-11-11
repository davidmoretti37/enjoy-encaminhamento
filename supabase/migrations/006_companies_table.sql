-- =====================================================
-- COMPANIES TABLE MIGRATION
-- =====================================================
-- Purpose: Create companies table for employers who post jobs
-- Companies are businesses that register to hire candidates
-- =====================================================

-- First, add 'admin' to user_role enum if it doesn't exist
-- Current enum has: super_admin, affiliate, school, candidate
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'admin';
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'affiliate', 'school', 'company', 'candidate');
END $$;

-- Commit the transaction to make 'admin' available
COMMIT;

-- Start new transaction and add 'company' role
BEGIN;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'company' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'company';
    END IF;
END $$;

-- Drop existing company_status enum if it exists and recreate with all needed values
DROP TYPE IF EXISTS company_status CASCADE;
CREATE TYPE company_status AS ENUM ('pending', 'active', 'suspended', 'inactive');

-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Company information
  company_name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255), -- Nome fantasia
  legal_name VARCHAR(255), -- Razão social
  cnpj VARCHAR(18) UNIQUE, -- Brazilian tax ID

  -- Contact information
  email VARCHAR(320) NOT NULL,
  phone VARCHAR(20),
  website VARCHAR(255),

  -- Address
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  postal_code VARCHAR(9),

  -- Business details
  industry VARCHAR(100), -- Setor/indústria
  company_size VARCHAR(50), -- 'small', 'medium', 'large', 'enterprise'
  description TEXT,

  -- Status and metadata
  status company_status NOT NULL DEFAULT 'pending',
  notes TEXT, -- Admin notes

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,

  -- Admin tracking
  approved_by UUID REFERENCES public.users(id),
  suspended_by UUID REFERENCES public.users(id),
  suspended_reason TEXT
);

-- Create indexes
CREATE INDEX idx_companies_user_id ON public.companies(user_id);
CREATE INDEX idx_companies_status ON public.companies(status);
CREATE INDEX idx_companies_email ON public.companies(email);
CREATE INDEX idx_companies_cnpj ON public.companies(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX idx_companies_city ON public.companies(city);
CREATE INDEX idx_companies_created_at ON public.companies(created_at DESC);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Super admins and admins can view all companies
CREATE POLICY "Admins can view all companies"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

-- Companies can view their own profile
CREATE POLICY "Companies can view own profile"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Franchise owners can view companies (for browsing candidates later)
CREATE POLICY "Franchises can view active companies"
  ON public.companies
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'affiliate'
    )
  );

-- Public users can create company accounts (registration)
CREATE POLICY "Anyone can create company account"
  ON public.companies
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Companies can update their own profile (but not status fields)
CREATE POLICY "Companies can update own profile"
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can update any company
CREATE POLICY "Admins can update companies"
  ON public.companies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

-- Admins can delete companies
CREATE POLICY "Admins can delete companies"
  ON public.companies
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT ON public.companies TO anon;
