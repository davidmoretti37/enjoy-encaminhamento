-- =====================================================
-- FRANCHISE STRUCTURE MIGRATION V3 (FINAL FIX)
-- =====================================================

-- STEP 1: Drop all RLS policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Companies can view their own profile" ON public.companies;
DROP POLICY IF EXISTS "Companies can update their own profile" ON public.companies;
DROP POLICY IF EXISTS "Companies can insert their own profile" ON public.companies;
DROP POLICY IF EXISTS "Candidates can view their own profile" ON public.candidates;
DROP POLICY IF EXISTS "Candidates can update their own profile" ON public.candidates;
DROP POLICY IF EXISTS "Candidates can insert their own profile" ON public.candidates;
DROP POLICY IF EXISTS "Anyone can view open jobs" ON public.jobs;
DROP POLICY IF EXISTS "Companies can manage their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can view relevant applications" ON public.applications;
DROP POLICY IF EXISTS "Candidates can create applications" ON public.applications;
DROP POLICY IF EXISTS "Companies can update applications" ON public.applications;
DROP POLICY IF EXISTS "Users can view relevant contracts" ON public.contracts;
DROP POLICY IF EXISTS "Companies can manage contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can view relevant feedback" ON public.feedback;
DROP POLICY IF EXISTS "Companies can manage feedback" ON public.feedback;
DROP POLICY IF EXISTS "Users can view relevant payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their documents" ON public.documents;
DROP POLICY IF EXISTS "Users can upload documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;

-- STEP 2: Add temporary role_text column
-- =====================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role_text TEXT;
UPDATE public.users SET role_text = role::text;

-- STEP 3: Drop the old role column and enum
-- =====================================================

ALTER TABLE public.users DROP COLUMN role;
DROP TYPE IF EXISTS user_role CASCADE;

-- STEP 4: Create new enum and add role column back
-- =====================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'affiliate', 'school', 'candidate');

ALTER TABLE public.users ADD COLUMN role user_role NOT NULL DEFAULT 'candidate';

-- STEP 5: Migrate data from role_text to role
-- =====================================================

UPDATE public.users SET role =
  CASE role_text
    WHEN 'admin' THEN 'super_admin'::user_role
    WHEN 'company' THEN 'school'::user_role
    WHEN 'candidate' THEN 'candidate'::user_role
    WHEN 'staff' THEN 'affiliate'::user_role
    ELSE 'candidate'::user_role
  END;

-- STEP 6: Drop temporary column
-- =====================================================

ALTER TABLE public.users DROP COLUMN role_text;

-- STEP 7: Create affiliates table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
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

-- STEP 8: Rename companies to schools
-- =====================================================

ALTER TABLE public.companies RENAME TO schools;

-- Add new columns
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

-- Rename columns
ALTER TABLE public.schools RENAME COLUMN company_name TO school_name;
ALTER TABLE public.schools RENAME COLUMN company_size TO school_size;

-- Rename enum types
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_size') THEN
    ALTER TYPE company_size RENAME TO school_size;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_status') THEN
    ALTER TYPE company_status RENAME TO school_status;
  END IF;
END $$;

-- STEP 9: Update jobs table
-- =====================================================

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS posted_by_user_id UUID REFERENCES public.users(id);
ALTER TABLE public.jobs RENAME COLUMN company_id TO school_id;

-- STEP 10: Update contracts, payments, feedback tables
-- =====================================================

ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES public.affiliates(id);
ALTER TABLE public.contracts RENAME COLUMN company_id TO school_id;
ALTER TABLE public.payments RENAME COLUMN company_id TO school_id;
ALTER TABLE public.feedback RENAME COLUMN company_id TO school_id;

-- STEP 11: Update indexes
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

-- STEP 12: Recreate RLS policies
-- =====================================================

-- Users
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Affiliates
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates and super admins can view" ON public.affiliates
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Super admins can create affiliates" ON public.affiliates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Affiliates and super admins can update" ON public.affiliates
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Schools
CREATE POLICY "Schools, affiliates, and super admins can view" ON public.schools
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.affiliates WHERE id = schools.affiliate_id AND user_id = auth.uid()) OR
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
    EXISTS (SELECT 1 FROM public.affiliates WHERE id = schools.affiliate_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Jobs
CREATE POLICY "Anyone can view open jobs" ON public.jobs
  FOR SELECT USING (
    status = 'open' OR
    EXISTS (SELECT 1 FROM public.schools WHERE id = jobs.school_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.affiliates a JOIN public.schools s ON a.id = s.affiliate_id WHERE s.id = jobs.school_id AND a.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Schools, affiliates, and super admins can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.schools WHERE id = school_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.affiliates a JOIN public.schools s ON a.id = s.affiliate_id WHERE s.id = school_id AND a.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Schools, affiliates, and super admins can update jobs" ON public.jobs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.schools WHERE id = jobs.school_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.affiliates a JOIN public.schools s ON a.id = s.affiliate_id WHERE s.id = jobs.school_id AND a.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Candidates
CREATE POLICY "Users can view candidates appropriately" ON public.candidates
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'affiliate', 'school'))
  );

CREATE POLICY "Candidates can update their profile" ON public.candidates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Candidates can create their profile" ON public.candidates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Applications
CREATE POLICY "Users can view relevant applications" ON public.applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.candidates WHERE id = applications.candidate_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.jobs j JOIN public.schools s ON j.school_id = s.id WHERE j.id = applications.job_id AND s.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.jobs j JOIN public.schools s ON j.school_id = s.id JOIN public.affiliates a ON s.affiliate_id = a.id WHERE j.id = applications.job_id AND a.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Candidates can create applications" ON public.applications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.candidates WHERE id = candidate_id AND user_id = auth.uid())
  );

CREATE POLICY "Schools and affiliates can update applications" ON public.applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.jobs j JOIN public.schools s ON j.school_id = s.id WHERE j.id = applications.job_id AND s.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.jobs j JOIN public.schools s ON j.school_id = s.id JOIN public.affiliates a ON s.affiliate_id = a.id WHERE j.id = applications.job_id AND a.user_id = auth.uid())
  );

-- Contracts
CREATE POLICY "Users can view relevant contracts" ON public.contracts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.candidates WHERE id = contracts.candidate_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.schools WHERE id = contracts.school_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.affiliates WHERE id = contracts.affiliate_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Affiliates and super admins can manage contracts" ON public.contracts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.affiliates WHERE id = affiliate_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Feedback
CREATE POLICY "Users can view relevant feedback" ON public.feedback
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.candidates WHERE id = feedback.candidate_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.schools WHERE id = feedback.school_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'affiliate'))
  );

CREATE POLICY "Schools and affiliates can manage feedback" ON public.feedback
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.schools WHERE id = school_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'affiliate'))
  );

-- Payments
CREATE POLICY "Users can view relevant payments" ON public.payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.schools WHERE id = payments.school_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'affiliate'))
  );

CREATE POLICY "Super admins and affiliates can manage payments" ON public.payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'affiliate'))
  );

-- Documents
CREATE POLICY "Users can view their documents" ON public.documents
  FOR SELECT USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'affiliate'))
  );

CREATE POLICY "Users can upload documents" ON public.documents
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- Notifications
CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- STEP 13: Add trigger
-- =====================================================

CREATE TRIGGER update_affiliates_updated_at BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
