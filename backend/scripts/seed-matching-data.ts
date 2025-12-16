/**
 * Seed data script for AI matching testing
 * Creates test candidates, companies, and jobs with @seed.local marker for easy cleanup
 *
 * Usage: npx tsx scripts/seed-matching-data.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const SEED_MARKER = '@seed.local';

// Generate a fake CPF (for testing only) - exactly 14 characters with formatting
function generateCPF(index: number): string {
  const num = index.toString().padStart(3, '0');
  return `000.000.${num}-00`;
}

// Seed candidates with varied profiles
const seedCandidates = [
  {
    full_name: 'Maria Silva Santos',
    email: `maria.silva${SEED_MARKER}`,
    cpf: generateCPF(1),
    city: 'São Paulo',
    state: 'SP',
    education_level: 'superior' as const,
    skills: ['Excel Avançado', 'Word', 'PowerPoint', 'Atendimento ao Cliente', 'Comunicação'],
    languages: [{ language: 'Português', level: 'nativo' }, { language: 'Inglês', level: 'intermediário' }],
    experience: [
      { role: 'Recepcionista', company: 'Clínica ABC', duration: '2 anos', description: 'Atendimento ao público' },
      { role: 'Assistente Administrativo', company: 'Empresa XYZ', duration: '1 ano', description: 'Rotinas administrativas' }
    ],
    has_work_experience: true,
    available_for_clt: true,
    available_for_internship: false,
    available_for_apprentice: false,
    preferred_work_type: 'presencial' as const,
    date_of_birth: '1995-05-15',
    profile_summary: 'Profissional dedicada com experiência em atendimento e rotinas administrativas.',
  },
  {
    full_name: 'João Pedro Oliveira',
    email: `joao.pedro${SEED_MARKER}`,
    cpf: generateCPF(2),
    city: 'São Paulo',
    state: 'SP',
    education_level: 'medio' as const,
    skills: ['Informática Básica', 'Atendimento', 'Organização'],
    languages: [{ language: 'Português', level: 'nativo' }],
    experience: [],
    has_work_experience: false,
    available_for_clt: false,
    available_for_internship: true,
    available_for_apprentice: true,
    preferred_work_type: 'presencial' as const,
    date_of_birth: '2004-08-20',
    profile_summary: 'Estudante do ensino médio buscando primeira oportunidade profissional.',
  },
  {
    full_name: 'Ana Carolina Ferreira',
    email: `ana.carolina${SEED_MARKER}`,
    cpf: generateCPF(3),
    city: 'São Paulo',
    state: 'SP',
    education_level: 'superior' as const,
    skills: ['Contabilidade', 'Excel Avançado', 'SAP', 'Gestão Financeira', 'Análise de Dados'],
    languages: [{ language: 'Português', level: 'nativo' }, { language: 'Inglês', level: 'avançado' }, { language: 'Espanhol', level: 'básico' }],
    experience: [
      { role: 'Analista Financeiro Jr', company: 'Banco ABC', duration: '3 anos', description: 'Análise de crédito e relatórios' }
    ],
    has_work_experience: true,
    available_for_clt: true,
    available_for_internship: false,
    available_for_apprentice: false,
    preferred_work_type: 'hibrido' as const,
    date_of_birth: '1992-03-10',
    profile_summary: 'Analista financeira com experiência em bancos e forte conhecimento em Excel e SAP.',
  },
  {
    full_name: 'Lucas Mendes Costa',
    email: `lucas.mendes${SEED_MARKER}`,
    cpf: generateCPF(4),
    city: 'Campinas',
    state: 'SP',
    education_level: 'medio' as const,
    skills: ['Vendas', 'Negociação', 'Comunicação', 'Proatividade'],
    languages: [{ language: 'Português', level: 'nativo' }],
    experience: [
      { role: 'Vendedor', company: 'Loja XYZ', duration: '1 ano', description: 'Vendas no varejo' }
    ],
    has_work_experience: true,
    available_for_clt: true,
    available_for_internship: false,
    available_for_apprentice: false,
    preferred_work_type: 'presencial' as const,
    date_of_birth: '1998-11-25',
    profile_summary: 'Vendedor com experiência no varejo, comunicativo e focado em resultados.',
  },
  {
    full_name: 'Fernanda Lima Souza',
    email: `fernanda.lima${SEED_MARKER}`,
    cpf: generateCPF(5),
    city: 'Rio de Janeiro',
    state: 'RJ',
    education_level: 'superior' as const,
    skills: ['Marketing Digital', 'Redes Sociais', 'Canva', 'Google Analytics', 'SEO'],
    languages: [{ language: 'Português', level: 'nativo' }, { language: 'Inglês', level: 'fluente' }],
    experience: [
      { role: 'Social Media', company: 'Agência Digital', duration: '2 anos', description: 'Gestão de redes sociais' }
    ],
    has_work_experience: true,
    available_for_clt: true,
    available_for_internship: false,
    available_for_apprentice: false,
    preferred_work_type: 'remoto' as const,
    date_of_birth: '1996-07-08',
    profile_summary: 'Especialista em marketing digital com foco em redes sociais e conteúdo.',
  },
  {
    full_name: 'Pedro Henrique Alves',
    email: `pedro.henrique${SEED_MARKER}`,
    cpf: generateCPF(6),
    city: 'São Paulo',
    state: 'SP',
    education_level: 'fundamental' as const,
    skills: ['Limpeza', 'Organização', 'Pontualidade'],
    languages: [{ language: 'Português', level: 'nativo' }],
    experience: [
      { role: 'Auxiliar de Serviços Gerais', company: 'Condomínio ABC', duration: '6 meses', description: 'Manutenção e limpeza' }
    ],
    has_work_experience: true,
    available_for_clt: true,
    available_for_internship: false,
    available_for_apprentice: true,
    preferred_work_type: 'presencial' as const,
    date_of_birth: '2000-01-30',
    profile_summary: 'Trabalhador dedicado buscando oportunidade como auxiliar de serviços gerais.',
  },
  {
    full_name: 'Beatriz Santos Rocha',
    email: `beatriz.santos${SEED_MARKER}`,
    cpf: generateCPF(7),
    city: 'São Paulo',
    state: 'SP',
    education_level: 'medio' as const,
    skills: ['Excel Básico', 'Digitação', 'Arquivo', 'Protocolo'],
    languages: [{ language: 'Português', level: 'nativo' }],
    experience: [],
    has_work_experience: false,
    available_for_clt: false,
    available_for_internship: true,
    available_for_apprentice: true,
    preferred_work_type: 'presencial' as const,
    date_of_birth: '2005-04-12',
    profile_summary: 'Estudante dedicada em busca de estágio na área administrativa.',
  },
  {
    full_name: 'Rafael Costa Silva',
    email: `rafael.costa${SEED_MARKER}`,
    cpf: generateCPF(8),
    city: 'São Paulo',
    state: 'SP',
    education_level: 'superior' as const,
    skills: ['Programação', 'Python', 'SQL', 'Excel', 'Power BI', 'Machine Learning'],
    languages: [{ language: 'Português', level: 'nativo' }, { language: 'Inglês', level: 'avançado' }],
    experience: [
      { role: 'Desenvolvedor Jr', company: 'Startup Tech', duration: '1 ano', description: 'Desenvolvimento backend' }
    ],
    has_work_experience: true,
    available_for_clt: true,
    available_for_internship: false,
    available_for_apprentice: false,
    preferred_work_type: 'remoto' as const,
    date_of_birth: '1997-09-18',
    profile_summary: 'Desenvolvedor com experiência em Python e análise de dados.',
  },
  {
    full_name: 'Camila Rodrigues',
    email: `camila.rodrigues${SEED_MARKER}`,
    cpf: generateCPF(9),
    city: 'Guarulhos',
    state: 'SP',
    education_level: 'medio' as const,
    skills: ['Atendimento ao Cliente', 'Telemarketing', 'Pacote Office'],
    languages: [{ language: 'Português', level: 'nativo' }],
    experience: [
      { role: 'Operadora de Telemarketing', company: 'Call Center ABC', duration: '8 meses', description: 'Atendimento receptivo' }
    ],
    has_work_experience: true,
    available_for_clt: true,
    available_for_internship: false,
    available_for_apprentice: false,
    preferred_work_type: 'presencial' as const,
    date_of_birth: '1999-12-05',
    profile_summary: 'Experiência em atendimento ao cliente e telemarketing.',
  },
  {
    full_name: 'Gabriel Martins',
    email: `gabriel.martins${SEED_MARKER}`,
    cpf: generateCPF(10),
    city: 'Osasco',
    state: 'SP',
    education_level: 'pos-graduacao' as const,
    skills: ['Gestão de Projetos', 'Scrum', 'Excel', 'PowerPoint', 'Liderança', 'Comunicação'],
    languages: [{ language: 'Português', level: 'nativo' }, { language: 'Inglês', level: 'fluente' }, { language: 'Espanhol', level: 'intermediário' }],
    experience: [
      { role: 'Coordenador de Projetos', company: 'Consultoria XYZ', duration: '4 anos', description: 'Gestão de projetos corporativos' },
      { role: 'Analista de Processos', company: 'Indústria ABC', duration: '2 anos', description: 'Melhoria de processos' }
    ],
    has_work_experience: true,
    available_for_clt: true,
    available_for_internship: false,
    available_for_apprentice: false,
    preferred_work_type: 'hibrido' as const,
    date_of_birth: '1988-06-22',
    profile_summary: 'Coordenador de projetos com MBA e ampla experiência em gestão.',
  },
];

// Seed jobs with varied requirements (using only columns that exist in DB)
const seedJobs = [
  {
    title: 'Assistente Administrativo',
    description: 'Responsável por rotinas administrativas, atendimento ao cliente, organização de documentos e suporte à equipe. Horário: Segunda a Sexta, 08h às 17h. Salário: R$ 1.800 a R$ 2.200',
    contract_type: 'clt' as const,
    work_type: 'presencial' as const,
    location: 'São Paulo - SP',
    salary: 180000, // R$ 1.800 in cents
    benefits: ['Vale Transporte', 'Vale Refeição', 'Plano de Saúde'],
    min_education_level: 'medio' as const,
    required_skills: ['Excel', 'Comunicação', 'Organização'],
    experience_required: true,
    min_experience_years: 1,
    openings: 2,
    status: 'open' as const,
  },
  {
    title: 'Estagiário(a) Administrativo',
    description: 'Apoio às atividades administrativas, arquivamento, digitação e atendimento telefônico. Horário: Segunda a Sexta, 09h às 15h (6h/dia). Bolsa: R$ 1.200',
    contract_type: 'estagio' as const,
    work_type: 'presencial' as const,
    location: 'São Paulo - SP',
    salary: 120000, // R$ 1.200 bolsa
    benefits: ['Vale Transporte', 'Seguro de Vida'],
    min_education_level: 'medio' as const,
    required_skills: ['Informática Básica', 'Organização'],
    experience_required: false,
    openings: 3,
    status: 'open' as const,
  },
  {
    title: 'Analista Financeiro',
    description: 'Análise de relatórios financeiros, controle de contas a pagar/receber, conciliação bancária e suporte à controladoria. Horário: Segunda a Sexta, 08h às 17h (híbrido 3x presencial). Salário: R$ 4.000 a R$ 5.500. Requer inglês intermediário.',
    contract_type: 'clt' as const,
    work_type: 'hibrido' as const,
    location: 'São Paulo - SP',
    salary: 400000, // R$ 4.000
    benefits: ['Vale Transporte', 'Vale Refeição', 'Plano de Saúde', 'PLR'],
    min_education_level: 'superior' as const,
    required_skills: ['Excel Avançado', 'Contabilidade', 'Análise Financeira'],
    required_languages: ['Inglês Intermediário'],
    experience_required: true,
    min_experience_years: 2,
    openings: 1,
    status: 'open' as const,
  },
  {
    title: 'Jovem Aprendiz - Auxiliar de Escritório',
    description: 'Programa de aprendizagem para jovens, com foco em rotinas de escritório e desenvolvimento profissional. Horário: Segunda a Sexta, 08h às 12h (4h/dia). Bolsa: R$ 800',
    contract_type: 'menor-aprendiz' as const,
    work_type: 'presencial' as const,
    location: 'São Paulo - SP',
    salary: 80000, // R$ 800
    benefits: ['Vale Transporte', 'Vale Refeição'],
    min_education_level: 'fundamental' as const,
    required_skills: ['Vontade de Aprender', 'Organização'],
    min_age: 14,
    max_age: 24,
    experience_required: false,
    openings: 2,
    status: 'open' as const,
  },
  {
    title: 'Vendedor(a) Interno',
    description: 'Vendas internas por telefone e WhatsApp, prospecção de clientes e negociação. Horário: Segunda a Sexta, 08h às 18h. Salário: R$ 1.500 + comissão (até R$ 3.500)',
    contract_type: 'clt' as const,
    work_type: 'presencial' as const,
    location: 'Campinas - SP',
    salary: 150000, // R$ 1.500 + comissão
    benefits: ['Vale Transporte', 'Vale Refeição', 'Comissão'],
    min_education_level: 'medio' as const,
    required_skills: ['Vendas', 'Negociação', 'Comunicação'],
    experience_required: true,
    min_experience_years: 1,
    openings: 2,
    status: 'open' as const,
  },
];

// Helper to create auth user and local user record
async function createUserWithAuth(email: string, name: string, role: string): Promise<string | null> {
  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'SeedPassword123!',
    email_confirm: true,
    user_metadata: { name, role },
  });

  if (authError) {
    console.error(`   ❌ Auth error for ${email}:`, authError.message);
    return null;
  }

  // Create local user record
  const { error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      name,
      role,
    });

  if (userError) {
    console.error(`   ❌ User record error for ${email}:`, userError.message);
    // Clean up auth user if local record fails
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return null;
  }

  return authData.user.id;
}

async function main() {
  console.log('🌱 Starting seed data creation...\n');

  // 1. Get an existing affiliate to associate data with
  console.log('1. Finding existing affiliate...');
  const { data: affiliates, error: affError } = await supabaseAdmin
    .from('affiliates')
    .select('id, user_id')
    .limit(1);

  if (affError || !affiliates || affiliates.length === 0) {
    console.error('❌ No affiliates found. Please create an affiliate first.');
    process.exit(1);
  }
  const affiliateId = affiliates[0].id;
  console.log(`   Using affiliate: ${affiliateId}`);

  // 2. Create seed company
  console.log('\n2. Creating seed company...');

  // First create a user for the company (with auth)
  const companyEmail = `empresa.teste${SEED_MARKER}`;
  const companyUserId = await createUserWithAuth(companyEmail, 'Empresa Teste Seed', 'company');

  if (!companyUserId) {
    console.error('❌ Failed to create company user');
    process.exit(1);
  }

  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .insert({
      user_id: companyUserId,
      affiliate_id: affiliateId,
      company_name: 'Empresa Teste para Matching',
      cnpj: '00.000.000/0001-00',
      email: companyEmail,
      phone: '(11) 99999-0000',
      city: 'São Paulo',
      state: 'SP',
      status: 'active',
    })
    .select()
    .single();

  if (companyError) {
    console.error('❌ Error creating company:', companyError.message);
    process.exit(1);
  }
  console.log(`   Created company: ${company.company_name} (${company.id})`);

  // 3. Create seed candidates
  console.log('\n3. Creating seed candidates...');
  const createdCandidates: any[] = [];

  for (const candidate of seedCandidates) {
    // Create user with auth first
    const userId = await createUserWithAuth(candidate.email, candidate.full_name, 'candidate');

    if (!userId) {
      console.error(`   ❌ Skipping ${candidate.full_name}: user creation failed`);
      continue;
    }

    // Create candidate
    const { data: created, error: candError } = await supabaseAdmin
      .from('candidates')
      .insert({
        user_id: userId,
        full_name: candidate.full_name,
        email: candidate.email,
        cpf: candidate.cpf,
        city: candidate.city,
        state: candidate.state,
        education_level: candidate.education_level,
        skills: candidate.skills,
        languages: candidate.languages,
        experience: candidate.experience,
        has_work_experience: candidate.has_work_experience,
        available_for_clt: candidate.available_for_clt,
        available_for_internship: candidate.available_for_internship,
        available_for_apprentice: candidate.available_for_apprentice,
        preferred_work_type: candidate.preferred_work_type,
        date_of_birth: candidate.date_of_birth,
        profile_summary: candidate.profile_summary,
        status: 'active',
      })
      .select()
      .single();

    if (candError) {
      console.error(`   ❌ Error creating candidate ${candidate.full_name}:`, candError.message);
      continue;
    }

    createdCandidates.push(created);
    console.log(`   ✓ Created: ${candidate.full_name} (${candidate.education_level})`);
  }

  // 4. Get a school to associate jobs with
  console.log('\n4. Finding school for jobs...');
  const { data: schools } = await supabaseAdmin.from('schools').select('id').limit(1);
  if (!schools || schools.length === 0) {
    console.error('❌ No schools found. Jobs require a school_id.');
    process.exit(1);
  }
  const schoolId = schools[0].id;
  console.log(`   Using school: ${schoolId}`);

  // 5. Create seed jobs
  console.log('\n5. Creating seed jobs...');
  const createdJobs: any[] = [];

  for (const job of seedJobs) {
    const { data: created, error: jobError } = await supabaseAdmin
      .from('jobs')
      .insert({
        school_id: schoolId,
        company_id: company.id,
        title: job.title,
        description: job.description,
        contract_type: job.contract_type,
        work_type: job.work_type,
        location: job.location,
        salary: job.salary,
        benefits: job.benefits,
        min_education_level: job.min_education_level,
        required_skills: job.required_skills,
        required_languages: (job as any).required_languages || null,
        min_age: (job as any).min_age || null,
        max_age: (job as any).max_age || null,
        experience_required: job.experience_required,
        min_experience_years: (job as any).min_experience_years || null,
        openings: job.openings,
        status: job.status,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) {
      console.error(`   ❌ Error creating job ${job.title}:`, jobError.message);
      continue;
    }

    createdJobs.push(created);
    console.log(`   ✓ Created: ${job.title} (${job.contract_type})`);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ SEED DATA CREATED SUCCESSFULLY');
  console.log('='.repeat(50));
  console.log(`\nCandidates: ${createdCandidates.length}`);
  console.log(`Jobs: ${createdJobs.length}`);
  console.log(`Company: ${company.company_name}`);
  console.log(`\nMarker for cleanup: ${SEED_MARKER}`);
  console.log('\nTo delete seed data, run:');
  console.log('  npx tsx scripts/delete-seed-data.ts');

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
