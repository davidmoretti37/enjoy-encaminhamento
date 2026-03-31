import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createServiceClient,
  createTestUser,
  createTestCandidate,
} from './setup';

describe('Contract + Payment flow (E2E)', () => {
  let supabase: SupabaseClient;
  const cleanupIds: {
    paymentIds: string[];
    contractIds: string[];
    applicationIds: string[];
    jobIds: string[];
    candidateIds: string[];
    companyIds: string[];
    userIds: string[];
  } = {
    paymentIds: [],
    contractIds: [],
    applicationIds: [],
    jobIds: [],
    candidateIds: [],
    companyIds: [],
    userIds: [],
  };

  beforeAll(() => {
    supabase = createServiceClient();
  });

  afterAll(async () => {
    // Delete in reverse-dependency order
    for (const id of cleanupIds.paymentIds) {
      await supabase.from('payments').delete().eq('id', id);
    }
    for (const id of cleanupIds.contractIds) {
      await supabase.from('contracts').delete().eq('id', id);
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
    for (const id of cleanupIds.userIds) {
      await supabase.from('users').delete().eq('id', id);
    }
  });

  let companyId: string;
  let candidateId: string;
  let jobId: string;
  let applicationId: string;
  let contractId: string;

  it('creates prerequisite data (users, company, candidate, job, application)', async () => {
    // Company user
    const companyUser = await createTestUser(supabase, { role: 'company' });
    cleanupIds.userIds.push(companyUser.id);

    // Company
    const { data: company, error: compErr } = await supabase
      .from('companies')
      .insert({
        user_id: companyUser.id,
        company_name: 'Test Corp E2E',
        email: `company-${companyUser.id.slice(0, 8)}@e2e.local`,
        status: 'active',
      })
      .select()
      .single();
    expect(compErr).toBeNull();
    companyId = company.id;
    cleanupIds.companyIds.push(companyId);

    // Candidate user + profile
    const candidateUser = await createTestUser(supabase, { role: 'candidate' });
    cleanupIds.userIds.push(candidateUser.id);

    const candidate = await createTestCandidate(supabase, candidateUser.id, {
      full_name: 'Contract Candidate',
    });
    candidateId = candidate.id;
    cleanupIds.candidateIds.push(candidateId);

    // Job
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .insert({
        company_id: companyId,
        title: 'E2E Test Developer',
        description: 'Test job for contract flow',
        contract_type: 'clt',
        work_type: 'remoto',
        status: 'open',
      })
      .select()
      .single();
    expect(jobErr).toBeNull();
    jobId = job.id;
    cleanupIds.jobIds.push(jobId);

    // Application
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .insert({
        job_id: jobId,
        candidate_id: candidateId,
        status: 'selected',
      })
      .select()
      .single();
    expect(appErr).toBeNull();
    applicationId = app.id;
    cleanupIds.applicationIds.push(applicationId);
  });

  it('creates a contract with pending-signature status', async () => {
    const { data: contract, error } = await supabase
      .from('contracts')
      .insert({
        company_id: companyId,
        candidate_id: candidateId,
        job_id: jobId,
        application_id: applicationId,
        contract_type: 'clt',
        contract_number: `CTR-E2E-${Date.now()}`,
        monthly_salary: 5000,
        monthly_fee: 500,
        insurance_fee: 100,
        payment_day: 5,
        start_date: '2026-04-01',
        status: 'pending-signature',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(contract.status).toBe('pending-signature');
    expect(contract.monthly_salary).toBe(5000);
    contractId = contract.id;
    cleanupIds.contractIds.push(contractId);
  });

  it('updates contract status from pending-signature to active', async () => {
    const { data: updated, error } = await supabase
      .from('contracts')
      .update({ status: 'active', signed_at: new Date().toISOString() })
      .eq('id', contractId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated.status).toBe('active');
    expect(updated.signed_at).toBeDefined();
  });

  it('creates a payment linked to the company', async () => {
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        contract_id: contractId,
        company_id: companyId,
        amount: 5600,
        payment_type: 'monthly-fee',
        due_date: '2026-05-05',
        status: 'pending',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(payment.status).toBe('pending');
    expect(payment.amount).toBe(5600);
    cleanupIds.paymentIds.push(payment.id);
  });

  it('updates payment status from pending to paid', async () => {
    const paymentId = cleanupIds.paymentIds[0];
    const { data: updated, error } = await supabase
      .from('payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', paymentId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated.status).toBe('paid');
    expect(updated.paid_at).toBeDefined();
  });

  it('queries contracts by company', async () => {
    const { data: contracts, error } = await supabase
      .from('contracts')
      .select('id, status, monthly_salary')
      .eq('company_id', companyId);

    expect(error).toBeNull();
    expect(contracts).toBeDefined();
    expect(contracts!.length).toBeGreaterThanOrEqual(1);
    const found = contracts!.find((c: { id: string }) => c.id === contractId);
    expect(found).toBeDefined();
    expect(found!.status).toBe('active');
  });

  it('queries payments by company', async () => {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('id, amount, status')
      .eq('company_id', companyId);

    expect(error).toBeNull();
    expect(payments).toBeDefined();
    expect(payments!.length).toBeGreaterThanOrEqual(1);
    expect(payments![0].status).toBe('paid');
  });
});
