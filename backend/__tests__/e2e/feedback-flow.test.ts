import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createServiceClient,
  createTestUser,
  createTestCandidate,
} from './setup';

describe('Feedback/Reviews flow (E2E)', () => {
  let supabase: SupabaseClient;
  const cleanupIds: {
    feedbackIds: string[];
    contractIds: string[];
    applicationIds: string[];
    jobIds: string[];
    candidateIds: string[];
    companyIds: string[];
    userIds: string[];
  } = {
    feedbackIds: [],
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
    for (const id of cleanupIds.feedbackIds) {
      await supabase.from('feedback').delete().eq('id', id);
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
  let contractId: string;
  let feedbackId: string;

  it('creates prerequisites (company, candidate, job, application, contract)', async () => {
    // Company user + company
    const companyUser = await createTestUser(supabase, { role: 'company' });
    cleanupIds.userIds.push(companyUser.id);

    const { data: company, error: compErr } = await supabase
      .from('companies')
      .insert({
        user_id: companyUser.id,
        company_name: 'Feedback Corp E2E',
        email: `fbcorp-${companyUser.id.slice(0, 8)}@e2e.local`,
        status: 'active',
      })
      .select()
      .single();
    expect(compErr).toBeNull();
    companyId = company.id;
    cleanupIds.companyIds.push(companyId);

    // Candidate user + profile
    const candUser = await createTestUser(supabase, { role: 'candidate' });
    cleanupIds.userIds.push(candUser.id);

    const candidate = await createTestCandidate(supabase, candUser.id, {
      full_name: 'Feedback Candidate E2E',
    });
    candidateId = candidate.id;
    cleanupIds.candidateIds.push(candidateId);

    // Job
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .insert({
        company_id: companyId,
        title: 'Feedback Test Role',
        description: 'Role for feedback flow E2E',
        contract_type: 'estagio',
        work_type: 'presencial',
        status: 'open',
      })
      .select()
      .single();
    expect(jobErr).toBeNull();
    cleanupIds.jobIds.push(job.id);

    // Application
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .insert({
        job_id: job.id,
        candidate_id: candidateId,
        status: 'selected',
      })
      .select()
      .single();
    expect(appErr).toBeNull();
    cleanupIds.applicationIds.push(app.id);

    // Contract
    const { data: contract, error: ctrErr } = await supabase
      .from('contracts')
      .insert({
        company_id: companyId,
        candidate_id: candidateId,
        job_id: job.id,
        application_id: app.id,
        contract_type: 'estagio',
        contract_number: `CTR-FB-${Date.now()}`,
        monthly_salary: 1800,
        monthly_fee: 300,
        insurance_fee: 50,
        payment_day: 10,
        start_date: '2026-03-01',
        status: 'active',
      })
      .select()
      .single();
    expect(ctrErr).toBeNull();
    contractId = contract.id;
    cleanupIds.contractIds.push(contractId);
  });

  it('creates feedback with pending status', async () => {
    const { data: fb, error } = await supabase
      .from('feedback')
      .insert({
        contract_id: contractId,
        company_id: companyId,
        candidate_id: candidateId,
        review_month: 3,
        review_year: 2026,
        performance_rating: 4,
        status: 'pending',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(fb.status).toBe('pending');
    expect(fb.performance_rating).toBe(4);
    expect(fb.review_month).toBe(3);
    expect(fb.review_year).toBe(2026);
    feedbackId = fb.id;
    cleanupIds.feedbackIds.push(feedbackId);
  });

  it('updates ratings (punctuality, communication, teamwork, technical_skills)', async () => {
    const { data: updated, error } = await supabase
      .from('feedback')
      .update({
        punctuality_rating: 5,
        communication_rating: 4,
        teamwork_rating: 4,
        technical_skills_rating: 3,
        strengths: 'Great attitude and punctuality',
        areas_for_improvement: 'Technical skills could improve',
      })
      .eq('id', feedbackId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated.punctuality_rating).toBe(5);
    expect(updated.communication_rating).toBe(4);
    expect(updated.teamwork_rating).toBe(4);
    expect(updated.technical_skills_rating).toBe(3);
    expect(updated.strengths).toBe('Great attitude and punctuality');
  });

  it('updates feedback status from pending to submitted', async () => {
    const { data: updated, error } = await supabase
      .from('feedback')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        recommend_continuation: true,
        general_comments: 'Solid first month performance',
      })
      .eq('id', feedbackId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated.status).toBe('submitted');
    expect(updated.submitted_at).toBeDefined();
    expect(updated.recommend_continuation).toBe(true);
  });

  it('queries feedback by contract_id', async () => {
    const { data: feedbacks, error } = await supabase
      .from('feedback')
      .select('id, status, performance_rating, punctuality_rating, communication_rating, teamwork_rating, technical_skills_rating')
      .eq('contract_id', contractId);

    expect(error).toBeNull();
    expect(feedbacks).toBeDefined();
    expect(feedbacks!.length).toBeGreaterThanOrEqual(1);

    const found = feedbacks!.find((f: { id: string }) => f.id === feedbackId);
    expect(found).toBeDefined();
    expect(found!.status).toBe('submitted');
    expect(found!.performance_rating).toBe(4);
    expect(found!.punctuality_rating).toBe(5);
    expect(found!.communication_rating).toBe(4);
    expect(found!.teamwork_rating).toBe(4);
    expect(found!.technical_skills_rating).toBe(3);
  });
});
