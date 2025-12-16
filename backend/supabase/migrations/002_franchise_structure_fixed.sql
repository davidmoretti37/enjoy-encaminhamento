-- =====================================================
-- FRANCHISE STRUCTURE MIGRATION (FIXED)
-- =====================================================
-- This updates the schema to support:
-- Super Admin → Affiliates → Schools → Jobs/Candidates
-- =====================================================

-- STEP 1: Drop all RLS policies that depend on the role column
-- =====================================================

-- Drop policies on users table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Drop policies on companies/schools table
DROP POLICY IF EXISTS "Companies can view their own profile" ON public.companies;
DROP POLICY IF EXISTS "Companies can update their own profile" ON public.companies;
DROP POLICY IF EXISTS "Companies can insert their own profile" ON public.companies;

-- Drop policies on candidates table
DROP POLICY IF EXISTS "Candidates can view their own profile" ON public.candidates;
DROP POLICY IF EXISTS "Candidates can update their own profile" ON public.candidates;
DROP POLICY IF EXISTS "Candidates can insert their own profile" ON public.candidates;

-- Drop policies on jobs table
DROP POLICY IF EXISTS "Anyone can view open jobs" ON public.jobs;
DROP POLICY IF EXISTS "Companies can manage their own jobs" ON public.jobs;

-- Drop policies on applications table
DROP POLICY IF EXISTS "Users can view relevant applications" ON public.applications;
DROP POLICY IF EXISTS "Candidates can create applications" ON public.applications;
DROP POLICY IF EXISTS "Companies can update applications" ON public.applications;

-- Drop policies on contracts table
DROP POLICY IF EXISTS "Users can view relevant contracts" ON public.contracts;
DROP POLICY IF EXISTS "Companies can manage contracts" ON public.contracts;

-- Drop policies on feedback table
DROP POLICY IF EXISTS "Users can view relevant feedback" ON public.feedback;
DROP POLICY IF EXISTS "Companies can manage feedback" ON public.feedback;

-- Drop policies on payments table
DROP POLICY IF EXISTS "Users can view relevant payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;

-- Drop policies on documents table
DROP POLICY IF EXISTS "Users can view their documents" ON public.documents;
DROP POLICY IF EXISTS "Users can upload documents" ON public.documents;

-- Drop policies on notifications table
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;

-- STEP 2: Update user roles enum
-- =====================================================

-- Drop the old enum and create new one
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('super_admin', 'affiliate', 'school', 'candidate');

-- Update users table role column
ALTER TABLE public.users ALTER COLUMN role TYPE user_role USING
  CASE role::text
    WHEN 'admin' THEN 'super_admin'::user_role
    WHEN 'company' THEN 'school'::user_role
    WHEN 'candidate' THEN 'candidate'::user_role
    WHEN 'staff' THEN 'affiliate'::user_role
    ELSE 'candidate'::user_role
  END;

ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'candidate'::user_role;
ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;

-- STEP 3: Create affiliates table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(320) NOT NULL,
  contact_phone VARCHAR(20),
  region VARCHAR(100),
  commission_rate INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEP 4: Rename companies to schools
-- =====================================================

ALTER TABLE public.companies RENAME TO schools;

-- Add new columns to schools
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

-- Rename columns
ALTER TABLE public.schools RENAME COLUMN company_name TO school_name;
ALTER TABLE public.schools RENAME COLUMN company_size TO school_size;

-- Rename enum type
ALTER TYPE company_size RENAME TO school_size;
ALTER TYPE company_status RENAME TO school_status;

-- STEP 5: Update jobs table
-- =====================================================

-- Add posted_by column
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS posted_by_user_id UUID REFERENCES public.users(id);

-- Rename company_id to school_id
ALTER TABLE public.jobs RENAME COLUMN company_id TO school_id;

-- STEP 6: Update contracts table
-- =====================================================

ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES public.affiliates(id);
ALTER TABLE public.contracts RENAME COLUMN company_id TO school_id;

-- STEP 7: Update payments table
-- =====================================================

ALTER TABLE public.payments RENAME COLUMN company_id TO school_id;

-- STEP 8: Update feedback table
-- =====================================================

ALTER TABLE public.feedback RENAME COLUMN company_id TO school_id;

-- STEP 9: Update indexes
-- =====================================================

DROP INDEX IF EXISTS idx_companies_user_id;
DROP INDEX IF EXISTS idx_companies_status;

CREATE INDEX IF NOT EXISTS idx_schools_user_id ON public.schools(user_id);
CREATE INDEX IF NOT EXISTS idx_schools_affiliate_id ON public.schools(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_schools_status ON public.schools(status);
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON public.affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_created_by ON public.affiliates(created_by);
CREATE INDEX IF NOT EXISTS idx_affiliates_is_active ON public.affiliates(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by_user_id ON public.jobs(posted_by_user_id);

-- STEP 10: Recreate RLS policies with new structure
-- =====================================================

-- Users table policies
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Affiliates table policies
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Super admins and affiliates can update profile" ON public.affiliates
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Schools table policies
CREATE POLICY "Schools can view their own profile" ON public.schools
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.schools s
            JOIN public.affiliates a ON s.affiliate_id = a.id
            WHERE s.id = schools.id AND a.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Affiliates and super admins can create schools" ON public.schools
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.affiliates WHERE user_id = auth.uid() AND id = affiliate_id) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Schools, affiliates, and super admins can update" ON public.schools
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.affiliates WHERE user_id = auth.uid() AND id = schools.affiliate_id) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Jobs table policies
CREATE POLICY "Anyone can view open jobs" ON public.jobs
  FOR SELECT USING (
    status = 'open' OR
    EXISTS (SELECT 1 FROM public.schools WHERE schools.id = jobs.school_id AND schools.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.schools s
            JOIN public.affiliates a ON s.affiliate_id = a.id
            WHERE s.id = jobs.school_id AND a.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Schools, affiliates, and super admins can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.schools WHERE id = school_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.schools s
            JOIN public.affiliates a ON s.affiliate_id = a.id
            WHERE s.id = school_id AND a.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Schools, affiliates, and super admins can update jobs" ON public.jobs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.schools WHERE id = jobs.school_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.schools s
            JOIN public.affiliates a ON s.affiliate_id = a.id
            WHERE s.id = jobs.school_id AND a.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Candidates table policies
CREATE POLICY "Users can view candidates appropriately" ON public.candidates
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'affiliate', 'school'))
  );

CREATE POLICY "Candidates can update their profile" ON public.candidates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Candidates can create their profile" ON public.candidates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Applications table policies
CREATE POLICY "Users can view relevant applications" ON public.applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.candidates WHERE candidates.id = applications.candidate_id AND candidates.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.jobs JOIN public.schools ON jobs.school_id = schools.id WHERE jobs.id = applications.job_id AND schools.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.jobs JOIN public.schools s ON jobs.school_id = s.id JOIN public.affiliates a ON s.affiliate_id = a.id WHERE jobs.id = applications.job_id AND a.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Candidates can create applications" ON public.applications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.candidates WHERE id = candidate_id AND user_id = auth.uid())
  );

CREATE POLICY "Schools and affiliates can update applications" ON public.applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.jobs JOIN public.schools ON jobs.school_id = schools.id WHERE jobs.id = applications.job_id AND schools.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.jobs JOIN public.schools s ON jobs.school_id = s.id JOIN public.affiliates a ON s.affiliate_id = a.id WHERE jobs.id = applications.job_id AND a.user_id = auth.uid())
  );

-- Contracts table policies
CREATE POLICY "Users can view relevant contracts" ON public.contracts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.candidates WHERE candidates.id = contracts.candidate_id AND candidates.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.schools WHERE schools.id = contracts.school_id AND schools.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.affiliates WHERE affiliates.id = contracts.affiliate_id AND affiliates.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Affiliates and super admins can manage contracts" ON public.contracts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.affiliates WHERE id = affiliate_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Feedback, Payments, Documents, Notifications policies (simplified)
CREATE POLICY "Users can view relevant feedback" ON public.feedback
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.candidates WHERE candidates.id = feedback.candidate_id AND candidates.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.schools WHERE schools.id = feedback.school_id AND schools.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'affiliate'))
  );

CREATE POLICY "Schools and affiliates can manage feedback" ON public.feedback
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.schools WHERE id = school_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'affiliate'))
  );

CREATE POLICY "Users can view relevant payments" ON public.payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.schools WHERE schools.id = payments.school_id AND schools.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'affiliate'))
  );

CREATE POLICY "Super admins and affiliates can manage payments" ON public.payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'affiliate'))
  );

CREATE POLICY "Users can view their documents" ON public.documents
  FOR SELECT USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'affiliate'))
  );

CREATE POLICY "Users can upload documents" ON public.documents
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- STEP 11: Add updated_at trigger for affiliates
-- =====================================================

CREATE TRIGGER update_affiliates_updated_at BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
