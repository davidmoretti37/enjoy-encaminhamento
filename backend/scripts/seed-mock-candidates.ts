/**
 * Seed 20 mock candidates for AI matching testing
 * Usage: npx tsx scripts/seed-mock-candidates.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const candidates = [
  {
    full_name: 'Ana Carolina Silva',
    email: 'mock1@test.local',
    cpf: '111.111.111-01',
    phone: '(11) 91111-0001',
    city: 'São Paulo', state: 'SP',
    education_level: 'superior',
    institution: 'USP',
    course: 'Ciência da Computação',
    skills: ['JavaScript', 'React', 'Node.js', 'SQL'],
    has_work_experience: true,
    experience: [{ company: 'Startup ABC', role: 'Dev Jr', months: 18 }],
    disc_dominante: 25, disc_influente: 35, disc_estavel: 20, disc_conforme: 20,
    available_for_internship: false, available_for_clt: true, available_for_apprentice: false,
    preferred_work_type: 'hibrido',
  },
  {
    full_name: 'Bruno Mendes Oliveira',
    email: 'mock2@test.local',
    cpf: '111.111.111-02',
    phone: '(21) 91111-0002',
    city: 'Rio de Janeiro', state: 'RJ',
    education_level: 'medio',
    skills: ['Vendas', 'Atendimento', 'Excel', 'Comunicação'],
    has_work_experience: true,
    experience: [{ company: 'Loja Central', role: 'Vendedor', months: 24 }],
    disc_dominante: 15, disc_influente: 45, disc_estavel: 25, disc_conforme: 15,
    available_for_internship: false, available_for_clt: true, available_for_apprentice: false,
    preferred_work_type: 'presencial',
  },
  {
    full_name: 'Camila Ferreira Santos',
    email: 'mock3@test.local',
    cpf: '111.111.111-03',
    phone: '(11) 91111-0003',
    city: 'São Paulo', state: 'SP',
    education_level: 'superior',
    institution: 'UNICAMP',
    course: 'Administração',
    skills: ['Marketing Digital', 'Excel', 'Comunicação', 'Liderança', 'Inglês'],
    has_work_experience: true,
    experience: [{ company: 'Agência XYZ', role: 'Analista de Marketing', months: 36 }],
    disc_dominante: 40, disc_influente: 30, disc_estavel: 15, disc_conforme: 15,
    available_for_internship: false, available_for_clt: true, available_for_apprentice: false,
    preferred_work_type: 'remoto',
  },
  {
    full_name: 'Diego Almeida Costa',
    email: 'mock4@test.local',
    cpf: '111.111.111-04',
    phone: '(31) 91111-0004',
    city: 'Belo Horizonte', state: 'MG',
    education_level: 'medio',
    skills: ['Atendimento', 'Organização', 'Excel'],
    has_work_experience: false,
    disc_dominante: 15, disc_influente: 20, disc_estavel: 45, disc_conforme: 20,
    available_for_internship: true, available_for_clt: false, available_for_apprentice: false,
    preferred_work_type: 'presencial',
  },
  {
    full_name: 'Elena Rodrigues Lima',
    email: 'mock5@test.local',
    cpf: '111.111.111-05',
    phone: '(41) 91111-0005',
    city: 'Curitiba', state: 'PR',
    education_level: 'pos-graduacao',
    institution: 'PUC-PR',
    course: 'MBA Gestão de Pessoas',
    skills: ['RH', 'Liderança', 'Comunicação', 'Excel', 'Inglês'],
    has_work_experience: true,
    experience: [{ company: 'Empresa Grande', role: 'Analista RH', months: 48 }],
    disc_dominante: 30, disc_influente: 25, disc_estavel: 25, disc_conforme: 20,
    available_for_internship: false, available_for_clt: true, available_for_apprentice: false,
    preferred_work_type: 'hibrido',
  },
  {
    full_name: 'Felipe Nascimento Souza',
    email: 'mock6@test.local',
    cpf: '111.111.111-06',
    phone: '(11) 91111-0006',
    city: 'São Paulo', state: 'SP',
    education_level: 'superior',
    institution: 'FATEC',
    course: 'Análise e Desenvolvimento de Sistemas',
    skills: ['Python', 'SQL', 'Java', 'Node.js'],
    has_work_experience: true,
    experience: [{ company: 'TechCorp', role: 'Estagiário Dev', months: 12 }],
    disc_dominante: 20, disc_influente: 15, disc_estavel: 20, disc_conforme: 45,
    available_for_internship: true, available_for_clt: true, available_for_apprentice: false,
    preferred_work_type: 'remoto',
  },
  {
    full_name: 'Gabriela Martins Pereira',
    email: 'mock7@test.local',
    cpf: '111.111.111-07',
    phone: '(21) 91111-0007',
    city: 'Rio de Janeiro', state: 'RJ',
    education_level: 'superior',
    institution: 'UFRJ',
    course: 'Design Gráfico',
    skills: ['Photoshop', 'Illustrator', 'Design', 'Comunicação'],
    has_work_experience: false,
    disc_dominante: 20, disc_influente: 40, disc_estavel: 25, disc_conforme: 15,
    available_for_internship: true, available_for_clt: false, available_for_apprentice: false,
    preferred_work_type: 'hibrido',
  },
  {
    full_name: 'Henrique Barbosa Dias',
    email: 'mock8@test.local',
    cpf: '111.111.111-08',
    phone: '(71) 91111-0008',
    city: 'Salvador', state: 'BA',
    education_level: 'fundamental',
    skills: ['Organização', 'Atendimento'],
    has_work_experience: false,
    disc_dominante: 10, disc_influente: 30, disc_estavel: 40, disc_conforme: 20,
    available_for_internship: false, available_for_clt: false, available_for_apprentice: true,
    preferred_work_type: 'presencial',
  },
  {
    full_name: 'Isabela Cardoso Ribeiro',
    email: 'mock9@test.local',
    cpf: '111.111.111-09',
    phone: '(19) 91111-0009',
    city: 'Campinas', state: 'SP',
    education_level: 'pos-graduacao',
    institution: 'UNICAMP',
    course: 'Engenharia de Software',
    skills: ['JavaScript', 'React', 'Python', 'SQL', 'Node.js', 'Inglês'],
    has_work_experience: true,
    experience: [{ company: 'BigTech', role: 'Desenvolvedora Pleno', months: 42 }],
    disc_dominante: 35, disc_influente: 20, disc_estavel: 15, disc_conforme: 30,
    available_for_internship: false, available_for_clt: true, available_for_apprentice: false,
    preferred_work_type: 'remoto',
  },
  {
    full_name: 'João Victor Araújo',
    email: 'mock10@test.local',
    cpf: '111.111.111-10',
    phone: '(11) 91111-0010',
    city: 'São Paulo', state: 'SP',
    education_level: 'medio',
    skills: ['Excel', 'Organização', 'Logística'],
    has_work_experience: true,
    experience: [{ company: 'Transportadora ZZ', role: 'Auxiliar Logística', months: 8 }],
    disc_dominante: 20, disc_influente: 15, disc_estavel: 40, disc_conforme: 25,
    available_for_internship: true, available_for_clt: true, available_for_apprentice: false,
    preferred_work_type: 'presencial',
  },
  {
    full_name: 'Larissa Gomes Moreira',
    email: 'mock11@test.local',
    cpf: '111.111.111-11',
    phone: '(81) 91111-0011',
    city: 'Recife', state: 'PE',
    education_level: 'superior',
    institution: 'UFPE',
    course: 'Contabilidade',
    skills: ['Contabilidade', 'Excel', 'Organização', 'SQL'],
    has_work_experience: true,
    experience: [{ company: 'Escritório Contábil', role: 'Estagiária', months: 14 }],
    disc_dominante: 15, disc_influente: 15, disc_estavel: 30, disc_conforme: 40,
    available_for_internship: false, available_for_clt: true, available_for_apprentice: false,
    preferred_work_type: 'presencial',
  },
  {
    full_name: 'Matheus Santos Ferreira',
    email: 'mock12@test.local',
    cpf: '111.111.111-12',
    phone: '(21) 91111-0012',
    city: 'Rio de Janeiro', state: 'RJ',
    education_level: 'medio',
    skills: ['Vendas', 'Comunicação', 'Atendimento', 'Marketing Digital'],
    has_work_experience: false,
    disc_dominante: 25, disc_influente: 40, disc_estavel: 20, disc_conforme: 15,
    available_for_internship: true, available_for_clt: false, available_for_apprentice: false,
    preferred_work_type: 'presencial',
  },
  {
    full_name: 'Natália Costa Vieira',
    email: 'mock13@test.local',
    cpf: '111.111.111-13',
    phone: '(61) 91111-0013',
    city: 'Brasília', state: 'DF',
    education_level: 'mestrado',
    institution: 'UnB',
    course: 'Ciência de Dados',
    skills: ['Python', 'SQL', 'Excel', 'Inglês', 'Liderança'],
    has_work_experience: true,
    experience: [{ company: 'Consultoria Data', role: 'Cientista de Dados Jr', months: 30 }],
    disc_dominante: 30, disc_influente: 15, disc_estavel: 20, disc_conforme: 35,
    available_for_internship: false, available_for_clt: true, available_for_apprentice: false,
    preferred_work_type: 'remoto',
  },
  {
    full_name: 'Otávio Pires Rocha',
    email: 'mock14@test.local',
    cpf: '111.111.111-14',
    phone: '(31) 91111-0014',
    city: 'Belo Horizonte', state: 'MG',
    education_level: 'medio',
    skills: ['Atendimento', 'Comunicação', 'Organização'],
    has_work_experience: false,
    disc_dominante: 10, disc_influente: 25, disc_estavel: 45, disc_conforme: 20,
    available_for_internship: false, available_for_clt: false, available_for_apprentice: true,
    preferred_work_type: 'presencial',
  },
  {
    full_name: 'Patrícia Duarte Nunes',
    email: 'mock15@test.local',
    cpf: '111.111.111-15',
    phone: '(48) 91111-0015',
    city: 'Florianópolis', state: 'SC',
    education_level: 'superior',
    institution: 'UFSC',
    course: 'Engenharia de Produção',
    skills: ['Logística', 'Excel', 'Organização', 'Liderança', 'Inglês'],
    has_work_experience: true,
    experience: [{ company: 'Indústria Forte', role: 'Trainee', months: 12 }],
    disc_dominante: 35, disc_influente: 25, disc_estavel: 15, disc_conforme: 25,
    available_for_internship: true, available_for_clt: true, available_for_apprentice: false,
    preferred_work_type: 'hibrido',
  },
  {
    full_name: 'Rafael Teixeira Campos',
    email: 'mock16@test.local',
    cpf: '111.111.111-16',
    phone: '(11) 91111-0016',
    city: 'São Paulo', state: 'SP',
    education_level: 'superior',
    institution: 'Mackenzie',
    course: 'Sistemas de Informação',
    skills: ['Java', 'SQL', 'Python', 'Node.js'],
    has_work_experience: true,
    experience: [{ company: 'Banco Digital', role: 'Dev Backend Jr', months: 20 }],
    disc_dominante: 20, disc_influente: 20, disc_estavel: 25, disc_conforme: 35,
    available_for_internship: false, available_for_clt: true, available_for_apprentice: false,
    preferred_work_type: 'remoto',
  },
  {
    full_name: 'Sofia Lopes de Andrade',
    email: 'mock17@test.local',
    cpf: '111.111.111-17',
    phone: '(19) 91111-0017',
    city: 'Campinas', state: 'SP',
    education_level: 'medio',
    skills: ['Design', 'Photoshop', 'Comunicação'],
    has_work_experience: false,
    disc_dominante: 15, disc_influente: 45, disc_estavel: 25, disc_conforme: 15,
    available_for_internship: true, available_for_clt: false, available_for_apprentice: false,
    preferred_work_type: 'presencial',
  },
  {
    full_name: 'Thiago Moraes Ramos',
    email: 'mock18@test.local',
    cpf: '111.111.111-18',
    phone: '(21) 91111-0018',
    city: 'Rio de Janeiro', state: 'RJ',
    education_level: 'fundamental',
    skills: ['Organização', 'Atendimento', 'Comunicação'],
    has_work_experience: false,
    disc_dominante: 20, disc_influente: 25, disc_estavel: 35, disc_conforme: 20,
    available_for_internship: false, available_for_clt: false, available_for_apprentice: true,
    preferred_work_type: 'presencial',
  },
  {
    full_name: 'Valentina Cruz Barros',
    email: 'mock19@test.local',
    cpf: '111.111.111-19',
    phone: '(41) 91111-0019',
    city: 'Curitiba', state: 'PR',
    education_level: 'pos-graduacao',
    institution: 'PUCPR',
    course: 'Marketing Digital',
    skills: ['Marketing Digital', 'Design', 'Comunicação', 'Inglês', 'Photoshop'],
    has_work_experience: true,
    experience: [{ company: 'Agência Digital', role: 'Social Media', months: 24 }],
    disc_dominante: 25, disc_influente: 40, disc_estavel: 15, disc_conforme: 20,
    available_for_internship: true, available_for_clt: true, available_for_apprentice: false,
    preferred_work_type: 'remoto',
  },
  {
    full_name: 'William Souza Machado',
    email: 'mock20@test.local',
    cpf: '111.111.111-20',
    phone: '(11) 91111-0020',
    city: 'São Paulo', state: 'SP',
    education_level: 'superior',
    institution: 'FGV',
    course: 'Economia',
    skills: ['Excel', 'SQL', 'Contabilidade', 'Inglês', 'Liderança', 'Comunicação'],
    has_work_experience: true,
    experience: [{ company: 'Consultoria Fin', role: 'Analista Financeiro', months: 36 }],
    disc_dominante: 35, disc_influente: 20, disc_estavel: 15, disc_conforme: 30,
    available_for_internship: false, available_for_clt: true, available_for_apprentice: false,
    preferred_work_type: 'hibrido',
  },
];

async function main() {
  console.log('Seeding 20 mock candidates...\n');

  // Find the first active agency
  const { data: agencies } = await supabaseAdmin
    .from('agencies')
    .select('id, agency_name')
    .eq('status', 'active')
    .limit(1);

  const agencyId = agencies?.[0]?.id;
  if (agencyId) {
    console.log(`Using agency: ${agencies[0].agency_name} (${agencyId})\n`);
  } else {
    console.log('No active agency found — candidates will be created without agency_id\n');
  }

  let created = 0;
  let skipped = 0;

  for (const c of candidates) {
    // Check if already exists
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', c.email);

    if (existing && existing.length > 0) {
      console.log(`  SKIP ${c.full_name} (${c.email}) — already exists`);
      skipped++;
      continue;
    }

    // 1. Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: c.email,
      password: 'Test123!',
      email_confirm: true,
      user_metadata: { name: c.full_name, role: 'candidate' },
    });

    if (authError) {
      console.error(`  ERROR ${c.full_name}: auth — ${authError.message}`);
      continue;
    }

    const userId = authData.user.id;

    // 2. Create user record
    const { error: userError } = await supabaseAdmin.from('users').insert({
      id: userId,
      email: c.email,
      name: c.full_name,
      role: 'candidate',
      agency_id: agencyId || null,
    });

    if (userError) {
      console.error(`  ERROR ${c.full_name}: user — ${userError.message}`);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      continue;
    }

    // 3. Create candidate record
    const { error: candError } = await supabaseAdmin.from('candidates').insert({
      user_id: userId,
      full_name: c.full_name,
      email: c.email,
      cpf: c.cpf,
      phone: c.phone,
      city: c.city,
      state: c.state,
      education_level: c.education_level,
      institution: c.institution || null,
      course: c.course || null,
      skills: c.skills,
      has_work_experience: c.has_work_experience || false,
      experience: c.experience || null,
      disc_dominante: c.disc_dominante,
      disc_influente: c.disc_influente,
      disc_estavel: c.disc_estavel,
      disc_conforme: c.disc_conforme,
      available_for_internship: c.available_for_internship,
      available_for_clt: c.available_for_clt,
      available_for_apprentice: c.available_for_apprentice,
      preferred_work_type: c.preferred_work_type,
      status: 'active',
      agency_id: agencyId || null,
    });

    if (candError) {
      console.error(`  ERROR ${c.full_name}: candidate — ${candError.message}`);
      continue;
    }

    console.log(`  OK ${c.full_name} — ${c.city}/${c.state}, ${c.education_level}, [${c.skills.join(', ')}]`);
    created++;
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}, Errors: ${candidates.length - created - skipped}`);
  console.log('\nAll mock accounts use password: Test123!');
  console.log('To generate AI summaries & embeddings, run: npx tsx scripts/generate-missing-summaries.ts');
}

main().catch(console.error);
