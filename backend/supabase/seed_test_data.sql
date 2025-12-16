-- =====================================================
-- TEST DATA FOR CORRICULOS PLATFORM
-- =====================================================
-- Run this AFTER running migrations 001 and 004
-- This creates realistic test data for development
-- =====================================================

-- Note: Your admin user already exists with ID: 5bce1b95-a064-484e-a098-1abcfe72b4a5

-- =====================================================
-- STEP 1: Create test company users
-- =====================================================

-- Company 1: Tech Startup
INSERT INTO public.users (id, email, role, name, created_at, updated_at)
VALUES (
  'c1111111-1111-1111-1111-111111111111',
  'contato@techstartup.com.br',
  'company',
  'Maria Silva',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days'
) ON CONFLICT (id) DO NOTHING;

-- Company 2: Retail Chain
INSERT INTO public.users (id, email, role, name, created_at, updated_at)
VALUES (
  'c2222222-2222-2222-2222-222222222222',
  'rh@varejomais.com.br',
  'company',
  'João Santos',
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '20 days'
) ON CONFLICT (id) DO NOTHING;

-- Company 3: Marketing Agency
INSERT INTO public.users (id, email, role, name, created_at, updated_at)
VALUES (
  'c3333333-3333-3333-3333-333333333333',
  'vagas@agenciacriativa.com.br',
  'company',
  'Ana Costa',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '10 days'
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 2: Create company profiles
-- =====================================================

INSERT INTO public.companies (id, user_id, company_name, cnpj, email, phone, city, state, industry, company_size, status, created_at, updated_at)
VALUES
(
  'a1111111-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
  'Tech Startup Ltda',
  '12.345.678/0001-90',
  'contato@techstartup.com.br',
  '(11) 98765-4321',
  'São Paulo',
  'SP',
  'Tecnologia',
  '11-50',
  'active',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '30 days'
),
(
  'a2222222-2222-2222-2222-222222222222',
  'c2222222-2222-2222-2222-222222222222',
  'Varejo Mais S.A.',
  '23.456.789/0001-12',
  'rh@varejomais.com.br',
  '(21) 91234-5678',
  'Rio de Janeiro',
  'RJ',
  'Varejo',
  '201-500',
  'active',
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '20 days'
),
(
  'a3333333-3333-3333-3333-333333333333',
  'c3333333-3333-3333-3333-333333333333',
  'Agência Criativa',
  '34.567.890/0001-34',
  'vagas@agenciacriativa.com.br',
  '(11) 93456-7890',
  'São Paulo',
  'SP',
  'Marketing',
  '1-10',
  'pending',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '10 days'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 3: Create test candidate users
-- =====================================================

INSERT INTO public.users (id, email, role, name, created_at, updated_at)
VALUES
(
  'd1111111-1111-1111-1111-111111111111',
  'pedro.oliveira@email.com',
  'candidate',
  'Pedro Oliveira',
  NOW() - INTERVAL '25 days',
  NOW() - INTERVAL '25 days'
),
(
  'd2222222-2222-2222-2222-222222222222',
  'julia.santos@email.com',
  'candidate',
  'Julia Santos',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '15 days'
),
(
  'd3333333-3333-3333-3333-333333333333',
  'lucas.ferreira@email.com',
  'candidate',
  'Lucas Ferreira',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
),
(
  'd4444444-4444-4444-4444-444444444444',
  'mariana.costa@email.com',
  'candidate',
  'Mariana Costa',
  NOW() - INTERVAL '12 days',
  NOW() - INTERVAL '12 days'
),
(
  'd5555555-5555-5555-5555-555555555555',
  'rafael.alves@email.com',
  'candidate',
  'Rafael Alves',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '8 days'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 4: Create candidate profiles
-- =====================================================

INSERT INTO public.candidates (id, user_id, full_name, cpf, email, phone, city, state, education_level, status, created_at, updated_at)
VALUES
(
  'b1111111-1111-1111-1111-111111111111',
  'd1111111-1111-1111-1111-111111111111',
  'Pedro Oliveira',
  '123.456.789-10',
  'pedro.oliveira@email.com',
  '(11) 91234-1111',
  'São Paulo',
  'SP',
  'superior',
  'active',
  NOW() - INTERVAL '25 days',
  NOW() - INTERVAL '25 days'
),
(
  'b2222222-2222-2222-2222-222222222222',
  'd2222222-2222-2222-2222-222222222222',
  'Julia Santos',
  '234.567.890-21',
  'julia.santos@email.com',
  '(21) 92345-2222',
  'Rio de Janeiro',
  'RJ',
  'medio',
  'active',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '15 days'
),
(
  'b3333333-3333-3333-3333-333333333333',
  'd3333333-3333-3333-3333-333333333333',
  'Lucas Ferreira',
  '345.678.901-32',
  'lucas.ferreira@email.com',
  '(11) 93456-3333',
  'São Paulo',
  'SP',
  'superior',
  'employed',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
),
(
  'b4444444-4444-4444-4444-444444444444',
  'd4444444-4444-4444-4444-444444444444',
  'Mariana Costa',
  '456.789.012-43',
  'mariana.costa@email.com',
  '(11) 94567-4444',
  'Campinas',
  'SP',
  'pos-graduacao',
  'active',
  NOW() - INTERVAL '12 days',
  NOW() - INTERVAL '12 days'
),
(
  'b5555555-5555-5555-5555-555555555555',
  'd5555555-5555-5555-5555-555555555555',
  'Rafael Alves',
  '567.890.123-54',
  'rafael.alves@email.com',
  '(21) 95678-5555',
  'Niterói',
  'RJ',
  'medio',
  'active',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '8 days'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 5: Create test job postings
-- =====================================================

INSERT INTO public.jobs (id, company_id, title, description, contract_type, work_type, location, salary, openings, status, created_at, updated_at)
VALUES
(
  1,
  'a1111111-1111-1111-1111-111111111111',
  'Desenvolvedor Jr - Estágio',
  'Oportunidade de estágio em desenvolvimento web. Buscamos estudantes de Ciência da Computação ou áreas relacionadas.',
  'estagio',
  'hibrido',
  'São Paulo - SP',
  1500.00,
  2,
  'open',
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '20 days'
),
(
  2,
  'a2222222-2222-2222-2222-222222222222',
  'Vendedor CLT',
  'Vaga para vendedor em loja física. Experiência em varejo será um diferencial.',
  'clt',
  'presencial',
  'Rio de Janeiro - RJ',
  2200.00,
  5,
  'open',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '15 days'
),
(
  3,
  'a1111111-1111-1111-1111-111111111111',
  'Suporte Técnico - Menor Aprendiz',
  'Programa Jovem Aprendiz para suporte técnico. Não é necessária experiência prévia.',
  'menor-aprendiz',
  'presencial',
  'São Paulo - SP',
  900.00,
  3,
  'open',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '10 days'
),
(
  4,
  'a3333333-3333-3333-3333-333333333333',
  'Designer Gráfico - Estágio',
  'Estágio em design gráfico e mídias sociais. Conhecimento em Adobe Creative Suite.',
  'estagio',
  'remoto',
  'Remoto',
  1200.00,
  1,
  'filled',
  NOW() - INTERVAL '25 days',
  NOW() - INTERVAL '5 days'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 6: Create test applications
-- =====================================================

INSERT INTO public.applications (id, job_id, candidate_id, status, created_at, updated_at)
VALUES
(
  1,
  1,
  'b1111111-1111-1111-1111-111111111111',
  'interviewed',
  NOW() - INTERVAL '18 days',
  NOW() - INTERVAL '10 days'
),
(
  2,
  1,
  'b2222222-2222-2222-2222-222222222222',
  'applied',
  NOW() - INTERVAL '12 days',
  NOW() - INTERVAL '12 days'
),
(
  3,
  2,
  'b5555555-5555-5555-5555-555555555555',
  'screening',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '8 days'
),
(
  4,
  3,
  'b2222222-2222-2222-2222-222222222222',
  'applied',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '8 days'
),
(
  5,
  4,
  'b3333333-3333-3333-3333-333333333333',
  'selected',
  NOW() - INTERVAL '22 days',
  NOW() - INTERVAL '5 days'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 7: Create test contracts
-- =====================================================

INSERT INTO public.contracts (id, company_id, candidate_id, job_id, application_id, contract_type, contract_number, monthly_salary, monthly_fee, start_date, status, created_at, updated_at)
VALUES
(
  1,
  'a3333333-3333-3333-3333-333333333333',
  'b3333333-3333-3333-3333-333333333333',
  4,
  5,
  'estagio',
  'CTR-2025-001',
  1200.00,
  120.00,
  NOW() - INTERVAL '3 days',
  'active',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '4 days'
),
(
  2,
  'a1111111-1111-1111-1111-111111111111',
  'b1111111-1111-1111-1111-111111111111',
  1,
  1,
  'estagio',
  'CTR-2025-002',
  1500.00,
  150.00,
  NOW() + INTERVAL '5 days',
  'pending-signature',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SUMMARY
-- =====================================================
-- Created:
-- - 3 companies (2 active, 1 pending approval)
-- - 5 candidates (4 active, 1 employed)
-- - 4 jobs (3 open, 1 filled)
-- - 5 applications (various statuses)
-- - 2 contracts (1 active, 1 pending signature)
-- =====================================================

SELECT 'Test data created successfully!' AS message;
SELECT
  (SELECT COUNT(*) FROM public.companies) AS total_companies,
  (SELECT COUNT(*) FROM public.candidates) AS total_candidates,
  (SELECT COUNT(*) FROM public.jobs) AS total_jobs,
  (SELECT COUNT(*) FROM public.applications) AS total_applications,
  (SELECT COUNT(*) FROM public.contracts) AS total_contracts;
