-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'company', 'candidate', 'staff');
CREATE TYPE company_size AS ENUM ('1-10', '11-50', '51-200', '201-500', '500+');
CREATE TYPE company_status AS ENUM ('pending', 'active', 'suspended');
CREATE TYPE education_level AS ENUM ('fundamental', 'medio', 'superior', 'pos-graduacao', 'mestrado', 'doutorado');
CREATE TYPE candidate_status AS ENUM ('active', 'inactive', 'employed');
CREATE TYPE work_type AS ENUM ('presencial', 'remoto', 'hibrido');
CREATE TYPE contract_type AS ENUM ('estagio', 'clt', 'menor-aprendiz');
CREATE TYPE job_status AS ENUM ('draft', 'open', 'closed', 'filled');
CREATE TYPE application_status AS ENUM ('applied', 'screening', 'interview-scheduled', 'interviewed', 'selected', 'rejected', 'withdrawn');
CREATE TYPE contract_status AS ENUM ('pending-signature', 'active', 'suspended', 'terminated', 'completed');
CREATE TYPE feedback_status AS ENUM ('pending', 'submitted', 'reviewed');
CREATE TYPE payment_type AS ENUM ('monthly-fee', 'setup-fee', 'penalty', 'refund');
CREATE TYPE payment_method AS ENUM ('credit-card', 'debit-card', 'bank-transfer', 'pix');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue', 'failed', 'refunded');
CREATE TYPE related_to_type AS ENUM ('candidate', 'company', 'contract', 'application');
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'candidate',
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_signed_in TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  cnpj VARCHAR(18) NOT NULL UNIQUE,
  email VARCHAR(320) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  industry VARCHAR(100),
  company_size company_size,
  website VARCHAR(255),
  description TEXT,
  logo TEXT, -- Supabase Storage URL
  status company_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Candidates table
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) NOT NULL UNIQUE,
  email VARCHAR(320) NOT NULL,
  phone VARCHAR(20),
  date_of_birth TIMESTAMPTZ,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),

  -- Education
  education_level education_level,
  currently_studying BOOLEAN DEFAULT false,
  institution VARCHAR(255),
  course VARCHAR(255),

  -- Skills & Experience
  skills JSONB, -- Array of skills
  languages JSONB, -- Array of languages with proficiency
  experience JSONB, -- Array of work experience
  has_work_experience BOOLEAN DEFAULT false,

  -- Profile & Assessments
  profile_summary TEXT,
  resume_url TEXT, -- Supabase Storage URL
  photo_url TEXT, -- Supabase Storage URL

  -- Test Results (stored as JSON)
  general_knowledge_score INTEGER,
  language_test_results JSONB,
  technical_test_results JSONB,
  personality_profile JSONB, -- DISC or similar

  -- Availability
  available_for_internship BOOLEAN DEFAULT true,
  available_for_clt BOOLEAN DEFAULT false,
  available_for_apprentice BOOLEAN DEFAULT false,
  preferred_work_type work_type,

  -- Status
  status candidate_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  -- Job Details
  contract_type contract_type NOT NULL,
  work_type work_type NOT NULL,
  location VARCHAR(255),
  salary INTEGER, -- Monthly salary in cents
  benefits JSONB, -- Array of benefits

  -- Requirements
  min_education_level education_level,
  required_skills JSONB, -- Array of skills
  required_languages JSONB, -- Array of languages
  min_age INTEGER,
  max_age INTEGER,
  experience_required BOOLEAN DEFAULT false,
  min_experience_years INTEGER,

  -- Additional Requirements
  specific_requirements TEXT,

  -- Job Status
  status job_status NOT NULL DEFAULT 'draft',
  openings INTEGER NOT NULL DEFAULT 1,
  filled_positions INTEGER NOT NULL DEFAULT 0,

  -- Dates
  published_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Applications table
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,

  -- Application Status
  status application_status NOT NULL DEFAULT 'applied',

  -- AI Matching
  ai_match_score INTEGER, -- 0-100 score from AI matching
  ai_match_reason TEXT, -- Explanation of match

  -- Notes & Feedback
  company_notes TEXT,
  rejection_reason TEXT,

  -- Dates
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  interview_date TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one application per candidate per job
  UNIQUE(job_id, candidate_id)
);

-- Contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,

  -- Contract Details
  contract_type contract_type NOT NULL,
  contract_number VARCHAR(50) NOT NULL UNIQUE,

  -- Financial
  monthly_salary INTEGER NOT NULL, -- In cents
  monthly_fee INTEGER NOT NULL, -- Agency fee in cents
  payment_day INTEGER NOT NULL DEFAULT 1, -- Day of month for payment

  -- Dates
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,

  -- Documents
  contract_document_url TEXT, -- Supabase Storage URL
  additional_documents JSONB, -- Array of document URLs

  -- Status
  status contract_status NOT NULL DEFAULT 'pending-signature',

  termination_reason TEXT,
  terminated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Feedback table
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,

  -- Review Period
  review_month INTEGER NOT NULL CHECK (review_month BETWEEN 1 AND 12),
  review_year INTEGER NOT NULL,

  -- Ratings (1-5 scale)
  performance_rating INTEGER CHECK (performance_rating BETWEEN 1 AND 5),
  punctuality_rating INTEGER CHECK (punctuality_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  teamwork_rating INTEGER CHECK (teamwork_rating BETWEEN 1 AND 5),
  technical_skills_rating INTEGER CHECK (technical_skills_rating BETWEEN 1 AND 5),

  -- Comments
  strengths TEXT,
  areas_for_improvement TEXT,
  general_comments TEXT,

  -- Actions
  recommend_continuation BOOLEAN DEFAULT true,
  requires_replacement BOOLEAN DEFAULT false,
  replacement_reason TEXT,

  -- Status
  status feedback_status NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one feedback per contract per month
  UNIQUE(contract_id, review_year, review_month)
);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Payment Details
  amount INTEGER NOT NULL, -- In cents
  payment_type payment_type NOT NULL,

  -- Payment Method
  payment_method payment_method,

  -- Dates
  due_date TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,

  -- Status
  status payment_status NOT NULL DEFAULT 'pending',

  -- Transaction Details
  transaction_id VARCHAR(255),
  payment_gateway_response JSONB,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Owner
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  related_to_type related_to_type NOT NULL,
  related_to_id UUID NOT NULL,

  -- Document Details
  document_type VARCHAR(100) NOT NULL, -- e.g., "resume", "id", "contract"
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_key TEXT NOT NULL, -- Storage path/key
  file_size INTEGER, -- In bytes
  mime_type VARCHAR(100),

  -- Metadata
  description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Notification Content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'info',

  -- Related Entity
  related_to_type VARCHAR(50),
  related_to_id UUID,

  -- Status
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_companies_user_id ON public.companies(user_id);
CREATE INDEX idx_companies_status ON public.companies(status);
CREATE INDEX idx_candidates_user_id ON public.candidates(user_id);
CREATE INDEX idx_candidates_status ON public.candidates(status);
CREATE INDEX idx_candidates_education_level ON public.candidates(education_level);
CREATE INDEX idx_candidates_city ON public.candidates(city);
CREATE INDEX idx_jobs_company_id ON public.jobs(company_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_contract_type ON public.jobs(contract_type);
CREATE INDEX idx_applications_job_id ON public.applications(job_id);
CREATE INDEX idx_applications_candidate_id ON public.applications(candidate_id);
CREATE INDEX idx_applications_status ON public.applications(status);
CREATE INDEX idx_contracts_company_id ON public.contracts(company_id);
CREATE INDEX idx_contracts_candidate_id ON public.contracts(candidate_id);
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_feedback_contract_id ON public.feedback(contract_id);
CREATE INDEX idx_payments_contract_id ON public.payments(contract_id);
CREATE INDEX idx_payments_company_id ON public.payments(company_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_documents_related_to ON public.documents(related_to_type, related_to_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for companies table
CREATE POLICY "Companies can view their own profile" ON public.companies
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Companies can update their own profile" ON public.companies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Companies can insert their own profile" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for candidates table
CREATE POLICY "Candidates can view their own profile" ON public.candidates
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'company'))
  );

CREATE POLICY "Candidates can update their own profile" ON public.candidates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Candidates can insert their own profile" ON public.candidates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for jobs table
CREATE POLICY "Anyone can view open jobs" ON public.jobs
  FOR SELECT USING (status = 'open' OR EXISTS (
    SELECT 1 FROM public.companies WHERE companies.id = jobs.company_id AND companies.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Companies can manage their own jobs" ON public.jobs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.companies WHERE companies.id = company_id AND companies.user_id = auth.uid())
  );

-- RLS Policies for applications table
CREATE POLICY "Users can view relevant applications" ON public.applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.candidates WHERE candidates.id = applications.candidate_id AND candidates.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.jobs JOIN public.companies ON jobs.company_id = companies.id WHERE jobs.id = applications.job_id AND companies.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Candidates can create applications" ON public.applications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.candidates WHERE id = candidate_id AND user_id = auth.uid())
  );

CREATE POLICY "Companies can update applications" ON public.applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.jobs JOIN public.companies ON jobs.company_id = companies.id WHERE jobs.id = applications.job_id AND companies.user_id = auth.uid())
  );

-- RLS Policies for contracts table
CREATE POLICY "Users can view relevant contracts" ON public.contracts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.candidates WHERE candidates.id = contracts.candidate_id AND candidates.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.companies WHERE companies.id = contracts.company_id AND companies.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Companies can manage contracts" ON public.contracts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for feedback table
CREATE POLICY "Users can view relevant feedback" ON public.feedback
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.candidates WHERE candidates.id = feedback.candidate_id AND candidates.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.companies WHERE companies.id = feedback.company_id AND companies.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Companies can manage feedback" ON public.feedback
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
  );

-- RLS Policies for payments table
CREATE POLICY "Users can view relevant payments" ON public.payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.companies WHERE companies.id = payments.company_id AND companies.user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage payments" ON public.payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for documents table
CREATE POLICY "Users can view their documents" ON public.documents
  FOR SELECT USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can upload documents" ON public.documents
  FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- RLS Policies for notifications table
CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
