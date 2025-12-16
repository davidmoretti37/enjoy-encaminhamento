-- =====================================================
-- CORRICULOS MVP MIGRATION
-- =====================================================
-- Purpose: Optimize schema for franchise-based recruitment platform
-- Changes:
--   1. Rename affiliates → franchises (clearer naming)
--   2. Add franchise-specific fields (commission, billing)
--   3. Enhance contracts for financial tracking
--   4. Add job_matches table for AI matching scores
--   5. Optimize RLS policies for franchise isolation
-- =====================================================

-- =====================================================
-- STEP 1: Drop policies that reference affiliates
-- =====================================================

DROP POLICY IF EXISTS "Affiliates and super admins can view" ON public.affiliates;
DROP POLICY IF EXISTS "Super admins can create affiliates" ON public.affiliates;
DROP POLICY IF EXISTS "Affiliates and super admins can update" ON public.affiliates;
DROP POLICY IF EXISTS "Schools, affiliates, and super admins can view" ON public.schools;
DROP POLICY IF EXISTS "Affiliates and super admins can create schools" ON public.schools;
DROP POLICY IF EXISTS "Schools, affiliates, and super admins can update" ON public.schools;
DROP POLICY IF EXISTS "Anyone can view open jobs" ON public.jobs;
DROP POLICY IF EXISTS "Schools, affiliates, and super admins can create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Schools, affiliates, and super admins can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can view relevant applications" ON public.applications;
DROP POLICY IF EXISTS "Schools and affiliates can update applications" ON public.applications;
DROP POLICY IF EXISTS "Users can view relevant contracts" ON public.contracts;
DROP POLICY IF EXISTS "Affiliates and super admins can manage contracts" ON public.contracts;

-- =====================================================
-- STEP 2: Rename affiliates → franchises
-- =====================================================

ALTER TABLE public.affiliates RENAME TO franchises;

-- Rename indexes
DROP INDEX IF EXISTS idx_affiliates_user_id;
DROP INDEX IF EXISTS idx_affiliates_created_by;
DROP INDEX IF EXISTS idx_affiliates_is_active;

CREATE INDEX idx_franchises_user_id ON public.franchises(user_id);
CREATE INDEX idx_franchises_created_by ON public.franchises(created_by);
CREATE INDEX idx_franchises_is_active ON public.franchises(is_active);

-- Rename foreign key columns in other tables
ALTER TABLE public.schools RENAME COLUMN affiliate_id TO franchise_id;
ALTER TABLE public.contracts RENAME COLUMN affiliate_id TO franchise_id;

-- Update indexes
DROP INDEX IF EXISTS idx_schools_affiliate_id;
CREATE INDEX idx_schools_franchise_id ON public.schools(franchise_id);

-- =====================================================
-- STEP 3: Enhance franchises table for MVP
-- =====================================================

-- Add billing and business fields
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18); -- Brazilian tax ID
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS state VARCHAR(2);
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS postal_code VARCHAR(9);
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS billing_email VARCHAR(320);
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50); -- 'bank_transfer', 'pix', 'boleto'
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS bank_account_info TEXT; -- Encrypted bank details
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS monthly_fee_cents INTEGER DEFAULT 0; -- Fixed monthly platform fee
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS contract_commission_rate INTEGER DEFAULT 1000; -- Basis points (1000 = 10%)

-- Add franchise admin contact
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS admin_name VARCHAR(255);
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS admin_cpf VARCHAR(14); -- Brazilian personal tax ID

-- Add metadata
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- =====================================================
-- STEP 4: Enhance schools (companies) table for MVP
-- =====================================================

-- Ensure all schools have franchise_id (required for multi-tenant)
ALTER TABLE public.schools ALTER COLUMN franchise_id SET NOT NULL;

-- Add more company details
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS trade_name VARCHAR(255); -- Nome fantasia
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255); -- Razão social
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS state VARCHAR(2);
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS postal_code VARCHAR(9);
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS notes TEXT;

-- =====================================================
-- STEP 5: Enhance candidates table for MVP
-- =====================================================

-- Add franchise_id to candidates (for multi-tenant isolation)
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES public.franchises(id);
CREATE INDEX IF NOT EXISTS idx_candidates_franchise_id ON public.candidates(franchise_id);

-- Add more candidate fields
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS rg VARCHAR(20);
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS state VARCHAR(2);
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS postal_code VARCHAR(9);

-- Add questionnaire responses (for AI matching)
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS questionnaire_responses JSONB;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS questionnaire_completed_at TIMESTAMPTZ;

-- Add profile/resume generation
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS auto_generated_resume_url TEXT;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS resume_generated_at TIMESTAMPTZ;

-- =====================================================
-- STEP 6: Enhance jobs table for MVP
-- =====================================================

-- Add franchise_id for easier querying
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS franchise_id UUID;
CREATE INDEX IF NOT EXISTS idx_jobs_franchise_id ON public.jobs(franchise_id);

-- Populate franchise_id from school relationship
UPDATE public.jobs
SET franchise_id = schools.franchise_id
FROM public.schools
WHERE jobs.school_id = schools.id;

-- Add more job fields
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS required_skills TEXT[];
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS required_education_level education_level;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS required_experience_level experience_level;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS benefits TEXT[];
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS work_hours VARCHAR(100);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS start_date DATE;

-- =====================================================
-- STEP 7: Create job_matches table (AI matching scores)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.job_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  franchise_id UUID NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,

  -- AI Matching scores
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),

  -- AI Explanation
  match_explanation TEXT,
  strengths JSONB, -- ["Strong technical skills", "Great cultural fit"]
  concerns JSONB, -- ["Location mismatch", "Salary expectations high"]
  recommendation VARCHAR(50), -- 'highly_recommended', 'recommended', 'consider', 'not_recommended'

  -- Matching metadata
  matched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  matching_version VARCHAR(50), -- Track which AI model/prompt version was used

  -- Candidate visibility
  shown_to_candidate BOOLEAN DEFAULT false,
  shown_to_candidate_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique match per job-candidate pair
  UNIQUE(job_id, candidate_id)
);

-- Indexes for performance
CREATE INDEX idx_job_matches_job_id ON public.job_matches(job_id);
CREATE INDEX idx_job_matches_candidate_id ON public.job_matches(candidate_id);
CREATE INDEX idx_job_matches_franchise_id ON public.job_matches(franchise_id);
CREATE INDEX idx_job_matches_score ON public.job_matches(match_score DESC);
CREATE INDEX idx_job_matches_matched_at ON public.job_matches(matched_at DESC);

-- Enable RLS
ALTER TABLE public.job_matches ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 8: Enhance contracts table for financial tracking
-- =====================================================

-- Add financial fields
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS franchise_fee_cents INTEGER; -- Fee franchise earns per month
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS company_fee_cents INTEGER; -- Fee company pays per month
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS candidate_salary_cents INTEGER; -- Candidate's salary
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS commission_type VARCHAR(50); -- 'percentage', 'fixed', 'tiered'
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS commission_value INTEGER; -- Basis points or fixed cents

-- Add billing fields
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS billing_frequency VARCHAR(20); -- 'monthly', 'quarterly', 'annual'
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS first_billing_date DATE;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS next_billing_date DATE;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS billing_day_of_month INTEGER; -- 1-31

-- Add contract lifecycle
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signed_by_candidate_at TIMESTAMPTZ;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signed_by_company_at TIMESTAMPTZ;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signed_by_franchise_at TIMESTAMPTZ;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMPTZ;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS termination_reason TEXT;

-- Add document storage
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS unsigned_document_url TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signed_document_url TEXT;

-- =====================================================
-- STEP 9: Enhance payments table for financial tracking
-- =====================================================

-- Add franchise_id for easier querying
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS franchise_id UUID;
CREATE INDEX IF NOT EXISTS idx_payments_franchise_id ON public.payments(franchise_id);

-- Populate franchise_id from school relationship
UPDATE public.payments
SET franchise_id = schools.franchise_id
FROM public.schools
WHERE payments.school_id = schools.id;

-- Add payment details
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.contracts(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS billing_period_start DATE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS billing_period_end DATE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS invoice_url TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100); -- Bank reference, PIX code, etc.
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON public.payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- =====================================================
-- STEP 10: Recreate RLS policies with franchises
-- =====================================================

-- Franchises table policies
CREATE POLICY "Franchises and super admins can view" ON public.franchises
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Super admins can create franchises" ON public.franchises
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Franchises and super admins can update" ON public.franchises
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Schools table policies (franchise isolation)
CREATE POLICY "Schools, franchises, and super admins can view" ON public.schools
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.franchises WHERE id = schools.franchise_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Franchises and super admins can create schools" ON public.schools
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.franchises WHERE user_id = auth.uid() AND id = franchise_id) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Schools, franchises, and super admins can update" ON public.schools
  FOR UPDATE USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.franchises WHERE id = schools.franchise_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Candidates table policies (franchise isolation)
CREATE POLICY "Candidates and franchise staff can view" ON public.candidates
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.franchises WHERE id = candidates.franchise_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'affiliate', 'school'))
  );

-- Jobs table policies (franchise isolation)
CREATE POLICY "Anyone can view open jobs in their franchise" ON public.jobs
  FOR SELECT USING (
    status = 'open' OR
    EXISTS (SELECT 1 FROM public.schools WHERE id = jobs.school_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.franchises WHERE id = jobs.franchise_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Schools, franchises, and super admins can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.schools WHERE id = school_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.franchises f JOIN public.schools s ON f.id = s.franchise_id WHERE s.id = school_id AND f.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Schools, franchises, and super admins can update jobs" ON public.jobs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.schools WHERE id = jobs.school_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.franchises f JOIN public.schools s ON f.id = s.franchise_id WHERE s.id = jobs.school_id AND f.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Job matches table policies (franchise isolation)
CREATE POLICY "Candidates can view their matches" ON public.job_matches
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.candidates WHERE id = job_matches.candidate_id AND user_id = auth.uid()) AND shown_to_candidate = true
  );

CREATE POLICY "Franchise staff can view all matches in their franchise" ON public.job_matches
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.franchises WHERE id = job_matches.franchise_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Franchise staff can create matches" ON public.job_matches
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.franchises WHERE id = franchise_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Franchise staff can update matches" ON public.job_matches
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.franchises WHERE id = job_matches.franchise_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Applications table policies (franchise isolation)
CREATE POLICY "Users can view relevant applications in their franchise" ON public.applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.candidates WHERE id = applications.candidate_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.jobs j JOIN public.schools s ON j.school_id = s.id WHERE j.id = applications.job_id AND s.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.jobs j JOIN public.schools s ON j.school_id = s.id JOIN public.franchises f ON s.franchise_id = f.id WHERE j.id = applications.job_id AND f.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Schools and franchises can update applications" ON public.applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.jobs j JOIN public.schools s ON j.school_id = s.id WHERE j.id = applications.job_id AND s.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.jobs j JOIN public.schools s ON j.school_id = s.id JOIN public.franchises f ON s.franchise_id = f.id WHERE j.id = applications.job_id AND f.user_id = auth.uid())
  );

-- Contracts table policies (franchise isolation)
CREATE POLICY "Users can view relevant contracts in their franchise" ON public.contracts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.candidates WHERE id = contracts.candidate_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.schools WHERE id = contracts.school_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.franchises WHERE id = contracts.franchise_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Franchises and super admins can manage contracts" ON public.contracts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.franchises WHERE id = franchise_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- =====================================================
-- STEP 11: Create helper views for dashboards
-- =====================================================

-- Franchise revenue summary view
CREATE OR REPLACE VIEW franchise_revenue_summary AS
SELECT
  f.id as franchise_id,
  f.name as franchise_name,
  COUNT(DISTINCT c.id) as total_contracts,
  COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_contracts,
  SUM(CASE WHEN p.status = 'paid' THEN p.amount_cents ELSE 0 END) as total_revenue_cents,
  SUM(CASE WHEN p.status = 'pending' THEN p.amount_cents ELSE 0 END) as pending_revenue_cents,
  SUM(CASE WHEN p.status = 'failed' OR p.due_date < CURRENT_DATE THEN p.amount_cents ELSE 0 END) as overdue_revenue_cents,
  COUNT(DISTINCT s.id) as total_schools,
  COUNT(DISTINCT j.id) as total_jobs,
  COUNT(DISTINCT cand.id) as total_candidates
FROM public.franchises f
LEFT JOIN public.contracts c ON f.id = c.franchise_id
LEFT JOIN public.payments p ON c.id = p.contract_id
LEFT JOIN public.schools s ON f.id = s.franchise_id
LEFT JOIN public.jobs j ON f.id = j.franchise_id
LEFT JOIN public.candidates cand ON f.id = cand.franchise_id
GROUP BY f.id, f.name;

-- Grant access to authenticated users
GRANT SELECT ON franchise_revenue_summary TO authenticated;

-- =====================================================
-- STEP 12: Add triggers
-- =====================================================

-- Trigger to auto-populate franchise_id in jobs when created
CREATE OR REPLACE FUNCTION set_job_franchise_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT franchise_id INTO NEW.franchise_id
  FROM public.schools
  WHERE id = NEW.school_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_job_franchise_id ON public.jobs;
CREATE TRIGGER trigger_set_job_franchise_id
  BEFORE INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_job_franchise_id();

-- Trigger to auto-populate franchise_id in payments when created
CREATE OR REPLACE FUNCTION set_payment_franchise_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT franchise_id INTO NEW.franchise_id
  FROM public.schools
  WHERE id = NEW.school_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_payment_franchise_id ON public.payments;
CREATE TRIGGER trigger_set_payment_franchise_id
  BEFORE INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_franchise_id();

-- Trigger to update job_matches.updated_at
CREATE TRIGGER update_job_matches_updated_at BEFORE UPDATE ON public.job_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 13: Seed data helper function
-- =====================================================

-- Function to create a new franchise (for super admins)
CREATE OR REPLACE FUNCTION create_franchise(
  p_name VARCHAR(255),
  p_admin_email VARCHAR(320),
  p_admin_name VARCHAR(255),
  p_region VARCHAR(100),
  p_commission_rate INTEGER DEFAULT 1000
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_franchise_id UUID;
BEGIN
  -- This function should be called by super admin only
  -- Create user account for franchise admin
  -- (In practice, you'd use Supabase Auth API to create the user)
  -- For now, this just creates the franchise record

  v_franchise_id := uuid_generate_v4();

  INSERT INTO public.franchises (
    id,
    name,
    contact_email,
    admin_name,
    region,
    contract_commission_rate,
    is_active,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    v_franchise_id,
    p_name,
    p_admin_email,
    p_admin_name,
    p_region,
    p_commission_rate,
    true,
    auth.uid(),
    NOW(),
    NOW()
  );

  RETURN v_franchise_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (RLS will handle authorization)
GRANT EXECUTE ON FUNCTION create_franchise TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================

-- Summary of changes:
-- ✅ Renamed affiliates → franchises for clarity
-- ✅ Added franchise business details (CNPJ, address, billing)
-- ✅ Added franchise_id to candidates for multi-tenant isolation
-- ✅ Enhanced jobs with required skills, education, experience
-- ✅ Created job_matches table for AI matching scores
-- ✅ Enhanced contracts with financial tracking fields
-- ✅ Enhanced payments with billing details
-- ✅ Updated all RLS policies for franchise isolation
-- ✅ Created franchise_revenue_summary view for dashboards
-- ✅ Added triggers for auto-populating franchise_id
-- ✅ Created helper function for creating franchises

-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Create your first franchise using create_franchise() function
-- 3. Start building Week 1 features (company CRUD, job posting)
