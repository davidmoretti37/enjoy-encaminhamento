import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createServiceClient,
  createTestUser,
  createTestCandidate,
} from './setup';

describe('Application flow (E2E)', () => {
  let supabase: SupabaseClient;
  const createdUserIds: string[] = [];
  const createdCompanyIds: string[] = [];
  const createdJobIds: string[] = [];
  const createdCandidateIds: string[] = [];
  const createdApplicationIds: string[] = [];

  let companyId: string;
  let jobId: string;
  let candidateId: string;

  beforeAll(async () => {
    supabase = createServiceClient();

    // Create company user + company
    const companyUser = await createTestUser(supabase, { role: 'company' });
    createdUserIds.push(companyUser.id);

    const cId = crypto.randomUUID();
    const { data: company, error: compErr } = await supabase
      .from('companies')
      .insert({
        id: cId,
        user_id: companyUser.id,
        company_name: 'App Test Corp',
        cnpj: '11.222.333/0001-44',
        email: `appcorp-${cId.slice(0, 8)}@e2e.local`,
        status: 'active',
      })
      .select()
      .single();
    if (compErr) throw new Error(`Failed to create company: ${compErr.message}`);
    companyId = company.id;
    createdCompanyIds.push(companyId);

    // Create job
    const jId = crypto.randomUUID();
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .insert({
        id: jId,
        company_id: companyId,
        title: 'Application Test Job',
        description: 'A job for testing applications.',
        contract_type: 'clt',
        work_type: 'presencial',
        status: 'open',
      })
      .select()
      .single();
    if (jobErr) throw new Error(`Failed to create job: ${jobErr.message}`);
    jobId = job.id;
    createdJobIds.push(jobId);

    // Create candidate user + candidate
    const candUser = await createTestUser(supabase, { role: 'candidate' });
    createdUserIds.push(candUser.id);

    const candidate = await createTestCandidate(supabase, candUser.id, {
      full_name: 'Applicant Teste',
      city: 'Uberlândia',
      state: 'MG',
    });
    candidateId = candidate.id;
    createdCandidateIds.push(candidateId);
  });

  afterAll(async () => {
    for (const id of createdApplicationIds.reverse()) {
      await supabase.from('applications').delete().eq('id', id);
    }
    for (const id of createdJobIds.reverse()) {
      await supabase.from('jobs').delete().eq('id', id);
    }
    for (const id of createdCandidateIds.reverse()) {
      await supabase.from('candidates').delete().eq('id', id);
    }
    for (const id of createdCompanyIds.reverse()) {
      await supabase.from('companies').delete().eq('id', id);
    }
    for (const id of createdUserIds.reverse()) {
      await supabase.from('users').delete().eq('id', id);
    }
  });

  it('inserts an application', async () => {
    const appId = crypto.randomUUID();

    const { data: application, error } = await supabase
      .from('applications')
      .insert({
        id: appId,
        job_id: jobId,
        candidate_id: candidateId,
        status: 'applied',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(application.id).toBe(appId);
    expect(application.job_id).toBe(jobId);
    expect(application.candidate_id).toBe(candidateId);
    expect(application.status).toBe('applied');

    createdApplicationIds.push(appId);
  });

  it('queries applications by job_id', async () => {
    const { data: apps, error } = await supabase
      .from('applications')
      .select('*')
      .eq('job_id', jobId);

    expect(error).toBeNull();
    expect(apps).toBeDefined();
    expect(apps!.length).toBe(1);
    expect(apps![0].candidate_id).toBe(candidateId);
  });

  it('queries applications by candidate_id', async () => {
    const { data: apps, error } = await supabase
      .from('applications')
      .select('*')
      .eq('candidate_id', candidateId);

    expect(error).toBeNull();
    expect(apps).toBeDefined();
    expect(apps!.length).toBe(1);
    expect(apps![0].job_id).toBe(jobId);
  });

  it('updates status through pipeline: applied → screening', async () => {
    const appId = createdApplicationIds[0];

    const { data: updated, error } = await supabase
      .from('applications')
      .update({ status: 'screening' })
      .eq('id', appId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated.status).toBe('screening');
  });

  it('updates status through pipeline: screening → interview-scheduled', async () => {
    const appId = createdApplicationIds[0];

    const { data: updated, error } = await supabase
      .from('applications')
      .update({
        status: 'interview-scheduled',
        interview_date: new Date().toISOString(),
      })
      .eq('id', appId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated.status).toBe('interview-scheduled');
    expect(updated.interview_date).toBeDefined();
  });

  it('updates status through pipeline: interview-scheduled → selected', async () => {
    const appId = createdApplicationIds[0];

    const { data: updated, error } = await supabase
      .from('applications')
      .update({
        status: 'selected',
        decided_at: new Date().toISOString(),
      })
      .eq('id', appId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated.status).toBe('selected');
    expect(updated.decided_at).toBeDefined();
  });

  it('rejects application with non-existent job_id (FK violation)', async () => {
    const fakeJobId = crypto.randomUUID();

    const { data, error } = await supabase
      .from('applications')
      .insert({
        id: crypto.randomUUID(),
        job_id: fakeJobId,
        candidate_id: candidateId,
        status: 'applied',
      })
      .select()
      .single();

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });
});
