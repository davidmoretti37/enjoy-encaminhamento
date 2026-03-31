/**
 * Mock Data Generators
 *
 * Realistic test data for recruitment platform entities.
 * All IDs use UUIDs matching the database schema.
 */

export const MOCK_IDS = {
  agency: "a0000000-0000-4000-8000-000000000001",
  company: "c0000000-0000-4000-8000-000000000001",
  candidate: "d0000000-0000-4000-8000-000000000001",
  job: "e0000000-0000-4000-8000-000000000001",
  application: "f0000000-0000-4000-8000-000000000001",
  contract: "10000000-0000-4000-8000-000000000001",
  batch: "b0000000-0000-4000-8000-000000000001",
  user: {
    admin: "aa000000-0000-4000-8000-000000000001",
    candidate: "cc000000-0000-4000-8000-000000000002",
    company: "dd000000-0000-4000-8000-000000000003",
    agency: "ee000000-0000-4000-8000-000000000004",
  },
} as const;

export function mockCandidate(overrides?: Record<string, any>) {
  return {
    id: MOCK_IDS.candidate,
    user_id: MOCK_IDS.user.candidate,
    full_name: "Maria Silva",
    cpf: "12345678901",
    email: "maria@test.com",
    phone: "11999999999",
    date_of_birth: "2000-01-15",
    city: "Ipatinga",
    state: "MG",
    education_level: "superior",
    currently_studying: true,
    institution: "UNILESTE",
    course: "Administração",
    skills: ["Excel", "Word", "Comunicação"],
    languages: ["Português", "Inglês"],
    experience: [],
    profile_summary: "Estudante de administração",
    summary: null,
    summary_generated_at: null,
    photo_url: null,
    status: "active",
    agency_id: MOCK_IDS.agency,
    available_for_clt: false,
    available_for_internship: true,
    available_for_apprentice: false,
    preferred_work_type: "presencial",
    social_media: null,
    disc_influente: null,
    disc_estavel: null,
    disc_dominante: null,
    disc_conforme: null,
    disc_completed_at: null,
    pdp_intrapersonal: null,
    pdp_interpersonal: null,
    pdp_skills: null,
    pdp_competencies: null,
    pdp_top_10_competencies: null,
    pdp_develop_competencies: null,
    pdp_action_plans: null,
    pdp_completed_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: null,
    ...overrides,
  };
}

export function mockCompany(overrides?: Record<string, any>) {
  return {
    id: MOCK_IDS.company,
    user_id: MOCK_IDS.user.company,
    company_name: "Tech Solutions Ltda",
    cnpj: "12345678000199",
    email: "contato@techsolutions.com",
    phone: "3132321234",
    city: "Ipatinga",
    state: "MG",
    address: "Rua Principal 100",
    status: "active",
    agency_id: MOCK_IDS.agency,
    onboarding_completed: true,
    pipeline_status: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: null,
    ...overrides,
  };
}

export function mockJob(overrides?: Record<string, any>) {
  return {
    id: MOCK_IDS.job,
    company_id: MOCK_IDS.company,
    agency_id: MOCK_IDS.agency,
    title: "Estagiário Administrativo",
    description: "Vaga para estágio em administração",
    contract_type: "estagio",
    work_type: "presencial",
    location: "Ipatinga - MG",
    salary: 80000, // cents
    hours_per_week: 30,
    status: "open",
    published_at: "2026-01-15T00:00:00.000Z",
    requirements: null,
    benefits: null,
    work_schedule: "08:00 - 14:00",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: null,
    ...overrides,
  };
}

export function mockApplication(overrides?: Record<string, any>) {
  return {
    id: MOCK_IDS.application,
    job_id: MOCK_IDS.job,
    candidate_id: MOCK_IDS.candidate,
    status: "applied",
    applied_at: "2026-02-01T00:00:00.000Z",
    interview_date: null,
    company_notes: null,
    rejection_reason: null,
    created_at: "2026-02-01T00:00:00.000Z",
    updated_at: null,
    ...overrides,
  };
}

export function mockAgency(overrides?: Record<string, any>) {
  return {
    id: MOCK_IDS.agency,
    name: "ANEC Ipatinga",
    email: "ipatinga@anec.com",
    phone: "3138221234",
    city: "Ipatinga",
    state: "MG",
    status: "active",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: null,
    ...overrides,
  };
}

export function mockUser(role: string, overrides?: Record<string, any>) {
  const id = (MOCK_IDS.user as any)[role] || `${role}-user-id`;
  return {
    id,
    email: `${role}@test.com`,
    name: `Test ${role}`,
    role,
    agency_id: role === "admin" || role === "super_admin" ? null : MOCK_IDS.agency,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: null,
    last_signed_in: null,
    last_login: null,
    profile_photo_url: null,
    ...overrides,
  };
}
