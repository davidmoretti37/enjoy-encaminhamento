-- =====================================================
-- FRANCHISE STRUCTURE MIGRATION
-- =====================================================
-- This updates the schema to support:
-- Super Admin → Affiliates → Schools → Jobs/Candidates
-- =====================================================

-- Update user roles to match new structure
ALTER TYPE user_role RENAME TO user_role_old;
CREATE TYPE user_role AS ENUM ('super_admin', 'affiliate', 'school', 'candidate');

-- Migrate existing users
ALTER TABLE public.users ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN role TYPE user_role USING
  CASE role::text
    WHEN 'admin' THEN 'super_admin'::user_role
    WHEN 'company' THEN 'school'::user_role
    WHEN 'candidate' THEN 'candidate'::user_role
    WHEN 'staff' THEN 'affiliate'::user_role
  END;
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'candidate'::user_role;

-- Drop old type
DROP TYPE user_role_old;

-- =====================================================
-- AFFILIATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(320) NOT NULL,
  contact_phone VARCHAR(20),
  region VARCHAR(100), -- Geographic region they cover
  commission_rate INTEGER, -- Commission percentage in basis points (e.g., 1500 = 15%)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.users(id), -- Super admin who created them
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

-- =====================================================
-- UPDATE COMPANIES TABLE TO SCHOOLS
-- =====================================================
-- Rename companies to schools and add affiliate relationship
ALTER TABLE public.companies RENAME TO schools;

-- Add affiliate_id column
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL;

-- Add created_by column
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

-- Update column names to be more appropriate
ALTER TABLE public.schools RENAME COLUMN company_name TO school_name;
ALTER TABLE public.schools RENAME COLUMN company_size TO school_size;

-- Update the size enum if needed
ALTER TYPE company_size RENAME TO school_size;

-- =====================================================
-- UPDATE JOBS TABLE
-- =====================================================
-- Add posted_by_user_id to track who posted the job
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS posted_by_user_id UUID REFERENCES public.users(id);

-- Rename company_id to school_id for clarity
ALTER TABLE public.jobs RENAME COLUMN company_id TO school_id;

-- Update foreign key
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_company_id_fkey;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

-- =====================================================
-- UPDATE CONTRACTS TABLE
-- =====================================================
-- Add affiliate_id to contracts
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES public.affiliates(id);

-- Rename company_id to school_id
ALTER TABLE public.contracts RENAME COLUMN company_id TO school_id;

-- Update foreign key
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_company_id_fkey;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

-- =====================================================
-- UPDATE PAYMENTS TABLE
-- =====================================================
-- Rename company_id to school_id
ALTER TABLE public.payments RENAME COLUMN company_id TO school_id;

-- Update foreign key
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_company_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

-- =====================================================
-- UPDATE FEEDBACK TABLE
-- =====================================================
-- Rename company_id to school_id
ALTER TABLE public.feedback RENAME COLUMN company_id TO school_id;

-- Update foreign key
ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_company_id_fkey;
ALTER TABLE public.feedback ADD CONSTRAINT feedback_school_id_fkey
  FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;

-- =====================================================
-- UPDATE INDEXES
-- =====================================================
-- Drop old indexes
DROP INDEX IF EXISTS idx_companies_user_id;
DROP INDEX IF EXISTS idx_companies_status;

-- Create new indexes for schools
CREATE INDEX IF NOT EXISTS idx_schools_user_id ON public.schools(user_id);
CREATE INDEX IF NOT EXISTS idx_schools_affiliate_id ON public.schools(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_schools_status ON public.schools(status);

-- Create indexes for affiliates
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_created_by ON public.affiliates(created_by);
CREATE INDEX IF NOT EXISTS idx_affiliates_is_active ON public.affiliates(is_active);

-- Create index for posted_by
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by_user_id ON public.jobs(posted_by_user_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on affiliates
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- Affiliates table policies
CREATE POLICY "Super admins can view all affiliates" ON public.affiliates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Affiliates can view their own profile" ON public.affiliates
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Super admins can create affiliates" ON public.affiliates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Super admins and affiliates can update their profile" ON public.affiliates
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Update schools (formerly companies) policies
DROP POLICY IF EXISTS "Companies can view their own profile" ON public.schools;
DROP POLICY IF EXISTS "Companies can update their own profile" ON public.schools;
DROP POLICY IF EXISTS "Companies can insert their own profile" ON public.schools;

CREATE POLICY "Schools can view their own profile" ON public.schools
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.schools s
            JOIN public.affiliates a ON s.affiliate_id = a.id
            WHERE s.id = schools.id AND a.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Affiliates can create schools" ON public.schools
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.affiliates WHERE user_id = auth.uid() AND id = affiliate_id) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Schools and their affiliates can update profile" ON public.schools
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.affiliates WHERE user_id = auth.uid() AND id = schools.affiliate_id) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Update jobs policies for new structure
DROP POLICY IF EXISTS "Companies can manage their own jobs" ON public.jobs;

CREATE POLICY "Schools and affiliates can view relevant jobs" ON public.jobs
  FOR SELECT USING (
    status = 'open' OR
    EXISTS (SELECT 1 FROM public.schools WHERE schools.id = jobs.school_id AND schools.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.schools s
            JOIN public.affiliates a ON s.affiliate_id = a.id
            WHERE s.id = jobs.school_id AND a.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Schools and affiliates can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.schools WHERE id = school_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.schools s
            JOIN public.affiliates a ON s.affiliate_id = a.id
            WHERE s.id = school_id AND a.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Schools and affiliates can update their jobs" ON public.jobs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.schools WHERE id = jobs.school_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.schools s
            JOIN public.affiliates a ON s.affiliate_id = a.id
            WHERE s.id = jobs.school_id AND a.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Add updated_at trigger for affiliates
CREATE TRIGGER update_affiliates_updated_at BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get affiliate for a user
CREATE OR REPLACE FUNCTION get_user_affiliate(user_uuid UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM public.affiliates WHERE user_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get schools managed by an affiliate
CREATE OR REPLACE FUNCTION get_affiliate_schools(affiliate_uuid UUID)
RETURNS SETOF public.schools AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.schools WHERE affiliate_id = affiliate_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access school
CREATE OR REPLACE FUNCTION can_access_school(user_uuid UUID, school_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.schools s
    LEFT JOIN public.affiliates a ON s.affiliate_id = a.id
    LEFT JOIN public.users u ON u.id = user_uuid
    WHERE s.id = school_uuid
    AND (
      s.user_id = user_uuid OR
      a.user_id = user_uuid OR
      u.role = 'super_admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- New structure:
-- users (super_admin, affiliate, school, candidate)
-- ├── affiliates (created by super_admin)
-- │   └── schools (created by affiliate or super_admin)
-- │       └── jobs (posted by school or affiliate)
-- │           └── applications (from candidates)
-- │               └── contracts (managed by affiliate)
-- └── candidates (self-registered)
-- =====================================================
