-- Create a Postgres function that atomically completes company onboarding:
-- 1. Updates the company record with onboarding data
-- 2. Inserts the first job
-- 3. Marks onboarding as completed
-- If any step fails, the entire transaction rolls back — no partial state.

-- First add onboarding_completed column if not exists
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.complete_company_onboarding(
  p_company_id UUID,
  p_cnpj TEXT,
  p_company_name TEXT,
  p_business_name TEXT DEFAULT NULL,
  p_contact_person TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_landline_phone TEXT DEFAULT NULL,
  p_mobile_phone TEXT DEFAULT NULL,
  p_website TEXT DEFAULT NULL,
  p_employee_count TEXT DEFAULT NULL,
  p_social_media TEXT DEFAULT NULL,
  p_postal_code TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_complement TEXT DEFAULT NULL,
  p_neighborhood TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_agency_id UUID DEFAULT NULL,
  p_affiliate_id UUID DEFAULT NULL,
  -- Job parameters
  p_job_title TEXT DEFAULT NULL,
  p_job_description TEXT DEFAULT NULL,
  p_job_contract_type contract_type DEFAULT 'clt',
  p_job_work_type work_type DEFAULT 'presencial',
  p_job_salary INTEGER DEFAULT NULL,
  p_job_salary_min NUMERIC DEFAULT NULL,
  p_job_salary_max NUMERIC DEFAULT NULL,
  p_job_benefits JSONB DEFAULT NULL,
  p_job_min_education education_level DEFAULT NULL,
  p_job_required_skills JSONB DEFAULT NULL,
  p_job_requirements TEXT DEFAULT NULL,
  p_job_work_schedule TEXT DEFAULT NULL,
  p_job_location TEXT DEFAULT NULL,
  p_job_openings INTEGER DEFAULT 1,
  -- Contract signature
  p_contract_signature TEXT DEFAULT NULL,
  p_contract_signer_name TEXT DEFAULT NULL,
  p_contract_signer_cpf TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id UUID;
BEGIN
  -- Guard: if already onboarded, return early
  IF EXISTS (
    SELECT 1 FROM companies WHERE id = p_company_id AND onboarding_completed = true
  ) THEN
    RAISE EXCEPTION 'Company already completed onboarding' USING ERRCODE = 'P0001';
  END IF;

  -- Step 1: Update company record
  UPDATE companies SET
    cnpj = p_cnpj,
    company_name = p_company_name,
    business_name = COALESCE(p_business_name, business_name),
    contact_person = COALESCE(p_contact_person, contact_person),
    contact_phone = COALESCE(p_contact_phone, contact_phone),
    email = COALESCE(p_email, email),
    landline_phone = COALESCE(p_landline_phone, landline_phone),
    mobile_phone = COALESCE(p_mobile_phone, mobile_phone),
    website = COALESCE(p_website, website),
    employee_count = COALESCE(p_employee_count, employee_count),
    social_media = COALESCE(p_social_media, social_media),
    postal_code = COALESCE(p_postal_code, postal_code),
    address = COALESCE(p_address, address),
    complement = COALESCE(p_complement, complement),
    neighborhood = COALESCE(p_neighborhood, neighborhood),
    city = COALESCE(p_city, city),
    state = COALESCE(p_state, state),
    agency_id = COALESCE(p_agency_id, agency_id),
    affiliate_id = COALESCE(p_affiliate_id, affiliate_id),
    updated_at = NOW()
  WHERE id = p_company_id;

  -- Step 2: Insert job
  IF p_job_title IS NOT NULL THEN
    INSERT INTO jobs (
      company_id, agency_id, title, description, contract_type, work_type,
      salary, salary_min, salary_max, benefits, min_education_level,
      required_skills, requirements, specific_requirements, work_schedule,
      location, openings, filled_positions, status, published_at
    ) VALUES (
      p_company_id, p_agency_id, p_job_title, p_job_description, p_job_contract_type,
      p_job_work_type, p_job_salary, p_job_salary_min, p_job_salary_max,
      p_job_benefits, p_job_min_education, p_job_required_skills,
      p_job_requirements, p_job_requirements, p_job_work_schedule,
      p_job_location, p_job_openings, 0, 'open', NOW()
    )
    RETURNING id INTO v_job_id;
  END IF;

  -- Step 3: Save contract signature if provided
  IF p_contract_signature IS NOT NULL AND p_contract_signer_name IS NOT NULL THEN
    UPDATE companies SET
      contract_signature = p_contract_signature,
      contract_signer_name = p_contract_signer_name,
      contract_signer_cpf = p_contract_signer_cpf,
      contract_signed_at = NOW()
    WHERE id = p_company_id;
  END IF;

  -- Step 4: Mark onboarding complete (this is the final step — if we got here, everything succeeded)
  UPDATE companies SET onboarding_completed = true WHERE id = p_company_id;

  RETURN v_job_id;
END;
$$;
