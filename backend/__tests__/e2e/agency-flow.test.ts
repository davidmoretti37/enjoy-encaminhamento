import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createServiceClient,
  createTestUser,
  createTestCandidate,
} from './setup';

describe('Agency flow (E2E)', () => {
  let supabase: SupabaseClient;
  const cleanupIds: {
    batchIds: string[];
    applicationIds: string[];
    jobIds: string[];
    candidateIds: string[];
    companyIds: string[];
    agencyIds: string[];
    userIds: string[];
  } = {
    batchIds: [],
    applicationIds: [],
    jobIds: [],
    candidateIds: [],
    companyIds: [],
    agencyIds: [],
    userIds: [],
  };

  beforeAll(() => {
    supabase = createServiceClient();
  });

  afterAll(async () => {
    for (const id of cleanupIds.batchIds) {
      await supabase.from('candidate_batches').delete().eq('id', id);
    }
    for (const id of cleanupIds.applicationIds) {
      await supabase.from('applications').delete().eq('id', id);
    }
    for (const id of cleanupIds.jobIds) {
      await supabase.from('jobs').delete().eq('id', id);
    }
    for (const id of cleanupIds.candidateIds) {
      await supabase.from('candidates').delete().eq('id', id);
    }
    for (const id of cleanupIds.companyIds) {
      await supabase.from('companies').delete().eq('id', id);
    }
    // Clear agency_id on users before deleting agencies
    for (const id of cleanupIds.userIds) {
      await supabase.from('users').update({ agency_id: null }).eq('id', id);
    }
    for (const id of cleanupIds.agencyIds) {
      await supabase.from('agencies').delete().eq('id', id);
    }
    for (const id of cleanupIds.userIds) {
      await supabase.from('users').delete().eq('id', id);
    }
  });

  let agencyId: string;
  let agencyOwnerUserId: string;
  let agencyMemberUserId: string;
  let companyId: string;
  let candidateId: string;
  let jobId: string;

  it('creates an agency owner user and the agency', async () => {
    // Agency needs a user_id (owner)
    const ownerUser = await createTestUser(supabase, { role: 'agency' });
    agencyOwnerUserId = ownerUser.id;
    cleanupIds.userIds.push(ownerUser.id);

    const { data: agency, error } = await supabase
      .from('agencies')
      .insert({
        user_id: ownerUser.id,
        agency_name: 'Test Agency E2E',
        cnpj: '12.345.678/0001-90',
        email: `agency-${ownerUser.id.slice(0, 8)}@e2e.local`,
        city: 'Uberlândia',
        state: 'MG',
        status: 'active',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(agency.agency_name).toBe('Test Agency E2E');
    expect(agency.status).toBe('active');
    expect(agency.city).toBe('Uberlândia');
    agencyId = agency.id;
    cleanupIds.agencyIds.push(agencyId);
  });

  it('creates a user linked to the agency via agency_id', async () => {
    const memberUser = await createTestUser(supabase, {
      role: 'agency',
      agency_id: agencyId,
    });
    agencyMemberUserId = memberUser.id;
    cleanupIds.userIds.push(memberUser.id);

    expect(memberUser.agency_id).toBe(agencyId);
  });

  it('creates a company with user linked to agency', async () => {
    // Company user belongs to the agency
    const companyUser = await createTestUser(supabase, {
      role: 'company',
      agency_id: agencyId,
    });
    cleanupIds.userIds.push(companyUser.id);

    const { data: company, error } = await supabase
      .from('companies')
      .insert({
        user_id: companyUser.id,
        company_name: 'Agency Client Co',
        email: `agclient-${companyUser.id.slice(0, 8)}@e2e.local`,
        status: 'active',
      })
      .select()
      .single();

    expect(error).toBeNull();
    companyId = company.id;
    cleanupIds.companyIds.push(companyId);

    // Job for batch test
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .insert({
        company_id: companyId,
        title: 'Agency Job E2E',
        description: 'Test job for agency flow',
        contract_type: 'estagio',
        work_type: 'presencial',
        status: 'open',
      })
      .select()
      .single();

    expect(jobErr).toBeNull();
    jobId = job.id;
    cleanupIds.jobIds.push(jobId);
  });

  it('creates a candidate with user linked to agency', async () => {
    const candUser = await createTestUser(supabase, {
      role: 'candidate',
      agency_id: agencyId,
    });
    cleanupIds.userIds.push(candUser.id);

    const candidate = await createTestCandidate(supabase, candUser.id, {
      full_name: 'Agency Candidate E2E',
      city: 'Uberlândia',
      state: 'MG',
    });
    candidateId = candidate.id;
    cleanupIds.candidateIds.push(candidateId);
  });

  it('queries candidates by agency via users.agency_id join', async () => {
    // candidates table has no agency_id, so we join through users
    const { data: results, error } = await supabase
      .from('candidates')
      .select('id, full_name, user_id, users!inner(agency_id)')
      .eq('users.agency_id', agencyId);

    expect(error).toBeNull();
    expect(results).toBeDefined();
    expect(results!.length).toBeGreaterThanOrEqual(1);
    const found = results!.find((c: { id: string }) => c.id === candidateId);
    expect(found).toBeDefined();
  });

  it('creates a candidate_batch with draft status', async () => {
    const { data: batch, error } = await supabase
      .from('candidate_batches')
      .insert({
        job_id: jobId,
        company_id: companyId,
        name: 'E2E Batch',
        candidate_ids: [candidateId],
        status: 'draft',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(batch.status).toBe('draft');
    expect(batch.candidate_ids).toContain(candidateId);
    cleanupIds.batchIds.push(batch.id);
  });

  it('updates batch status from draft to sent', async () => {
    const batchId = cleanupIds.batchIds[0];
    const { data: updated, error } = await supabase
      .from('candidate_batches')
      .update({ status: 'sent' })
      .eq('id', batchId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated.status).toBe('sent');
  });
});
