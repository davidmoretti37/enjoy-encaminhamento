// Throwaway end-to-end fixture. Creates auth users with known passwords so the
// candidate and company perspectives can be exercised through the real API.
import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const AGENCY = '37e8c878-20f4-42a5-874b-f35ecb8f1360';
const PW = 'ZzTeste!2026#anec';

const people = [
  { key: 'empresa', email: 'zz.teste.empresa@exemplo.invalid', role: 'company',   name: 'ZZ TESTE Empresa' },
  { key: 'alice',   email: 'zz.teste.alice@exemplo.invalid',   role: 'candidate', name: 'ZZ TESTE Alice' },
  { key: 'bruno',   email: 'zz.teste.bruno@exemplo.invalid',   role: 'candidate', name: 'ZZ TESTE Bruno' },
];

(async () => {
  const ids: Record<string,string> = {};
  for (const p of people) {
    const { data, error } = await sb.auth.admin.createUser({ email: p.email, password: PW, email_confirm: true });
    if (error) throw new Error(`${p.key}: ${error.message}`);
    ids[p.key] = data.user!.id;
    await sb.from('users').update({ name: p.name, role: p.role, agency_id: AGENCY }).eq('id', data.user!.id);
  }

  const companyId = 'c1a0de00-0000-4000-8000-000000000201';
  const jobId     = 'c1a0de00-0000-4000-8000-000000000301';
  await sb.from('companies').insert({
    id: companyId, user_id: ids.empresa, agency_id: AGENCY, status: 'active',
    company_name: 'ZZ TESTE Padaria do Claude', email: 'zz.teste.empresa@exemplo.invalid',
    city: 'Uberlândia', state: 'MG',
  });
  await sb.from('jobs').insert({
    id: jobId, agency_id: AGENCY, company_id: companyId, status: 'open',
    title: 'ZZ TESTE Atendente de Balcão',
    description: 'Vaga de teste para validar o fluxo completo. Pode apagar.',
    contract_type: 'clt', work_type: 'presencial', location: 'Uberlândia, MG', openings: 2,
    requirements: 'Boa comunicação, proatividade e organização. Atendimento ao cliente.',
    required_skills: ['Boa comunicação','proatividade','organização','atendimento ao cliente'],
    skill_tags: ['atendimento-ao-cliente','comunicacao','organizacao','proatividade'],
  });

  const cands = [
    { id: 'c1a0de00-0000-4000-8000-000000000101', user: ids.alice, name: 'ZZ TESTE Alice Comunicativa', cpf: '11122233344',
      email: 'zz.teste.alice@exemplo.invalid', skills: ['Comunicativa','Proatividade','Organização','Atendimento ao cliente'] },
    { id: 'c1a0de00-0000-4000-8000-000000000102', user: ids.bruno, name: 'ZZ TESTE Bruno Multi', cpf: '11122233355',
      email: 'zz.teste.bruno@exemplo.invalid', skills: ['Boa comunicação, proatividade, organização e atendimento ao público'] },
  ];
  for (const c of cands) {
    await sb.from('candidates').insert({
      id: c.id, user_id: c.user, agency_id: AGENCY, full_name: c.name, cpf: c.cpf, email: c.email,
      phone: '(34) 90000-0001', city: 'Uberlândia', state: 'MG', education_level: 'medio',
      skills: c.skills, skill_tags: ['atendimento-ao-cliente','comunicacao','organizacao','proatividade'],
      status: 'active', available_for_clt: true,
      disc_dominante: 25, disc_influente: 30, disc_estavel: 25, disc_conforme: 20,
    });
    await sb.from('applications').insert({ job_id: jobId, candidate_id: c.id, status: 'applied' });
  }
  console.log(JSON.stringify({ ids, companyId, jobId, password: PW }, null, 2));
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
