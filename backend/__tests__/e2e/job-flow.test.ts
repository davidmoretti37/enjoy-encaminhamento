import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient, createTestUser } from './setup';

describe('Job flow (E2E)', () => {
  let supabase: SupabaseClient;
  const createdUserIds: string[] = [];
  const createdCompanyIds: string[] = [];
  const createdJobIds: string[] = [];

  beforeAll(async () => {
    supabase = createServiceClient();

    // Prerequisites: create user + company
    const user = await createTestUser(supabase, { role: 'company' });
    createdUserIds.push(user.id);

    const companyId = crypto.randomUUID();
    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        id: companyId,
        user_id: user.id,
        company_name: 'Job Test Corp',
        cnpj: '98.765.432/0001-10',
        email: `jobcorp-${companyId.slice(0, 8)}@e2e.local`,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create company: ${error.message}`);
    createdCompanyIds.push(company.id);
  });

  afterAll(async () => {
    for (const id of createdJobIds.reverse()) {
      await supabase.from('jobs').delete().eq('id', id);
    }
    for (const id of createdCompanyIds.reverse()) {
      await supabase.from('companies').delete().eq('id', id);
    }
    for (const id of createdUserIds.reverse()) {
      await supabase.from('users').delete().eq('id', id);
    }
  });

  it('inserts a job', async () => {
    const companyId = createdCompanyIds[0];
    const jobId = crypto.randomUUID();

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        id: jobId,
        company_id: companyId,
        title: 'Software Engineer Intern',
        description: 'Looking for a motivated intern to join our team.',
        contract_type: 'estagio',
        work_type: 'hibrido',
        status: 'open',
        salary: 2000,
        location: 'Uberlândia, MG',
        openings: 3,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(job.id).toBe(jobId);
    expect(job.title).toBe('Software Engineer Intern');
    expect(job.contract_type).toBe('estagio');
    expect(job.work_type).toBe('hibrido');
    expect(job.status).toBe('open');
    expect(Number(job.salary)).toBe(2000);
    expect(job.openings).toBe(3);

    createdJobIds.push(jobId);
  });

  it('inserts a second job with different contract_type', async () => {
    const companyId = createdCompanyIds[0];
    const jobId = crypto.randomUUID();

    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        id: jobId,
        company_id: companyId,
        title: 'Full Stack Developer',
        description: 'Senior developer position.',
        contract_type: 'clt',
        work_type: 'remoto',
        status: 'open',
        salary: 8000,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(job.contract_type).toBe('clt');

    createdJobIds.push(jobId);
  });

  it('queries jobs by company_id', async () => {
    const companyId = createdCompanyIds[0];

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('company_id', companyId);

    expect(error).toBeNull();
    expect(jobs).toBeDefined();
    expect(jobs!.length).toBe(2);
  });

  it('updates job status from open to closed', async () => {
    const jobId = createdJobIds[0];

    const { data: updated, error } = await supabase
      .from('jobs')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', jobId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated.status).toBe('closed');
    expect(updated.closed_at).toBeDefined();
  });

  it('filters jobs by status (only open)', async () => {
    const companyId = createdCompanyIds[0];

    const { data: openJobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'open');

    expect(error).toBeNull();
    expect(openJobs).toBeDefined();
    expect(openJobs!.length).toBe(1);
    expect(openJobs![0].title).toBe('Full Stack Developer');
  });

  it('filters jobs by contract_type', async () => {
    const companyId = createdCompanyIds[0];

    const { data: cltJobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('company_id', companyId)
      .eq('contract_type', 'clt');

    expect(error).toBeNull();
    expect(cltJobs).toBeDefined();
    expect(cltJobs!.length).toBe(1);
    expect(cltJobs![0].title).toBe('Full Stack Developer');
  });
});
