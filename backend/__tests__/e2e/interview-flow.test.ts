import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createServiceClient,
  createTestUser,
  createTestCandidate,
} from './setup';

describe('Interview flow (E2E)', () => {
  let supabase: SupabaseClient;
  const cleanupIds: {
    participantIds: string[];
    sessionIds: string[];
    applicationIds: string[];
    jobIds: string[];
    candidateIds: string[];
    companyIds: string[];
    userIds: string[];
  } = {
    participantIds: [],
    sessionIds: [],
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
    for (const id of cleanupIds.participantIds) {
      await supabase.from('interview_participants').delete().eq('id', id);
    }
    for (const id of cleanupIds.sessionIds) {
      await supabase.from('interview_sessions').delete().eq('id', id);
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
  let sessionId: string;
  let participantId: string;

  it('creates prerequisites (company, job, candidate, application)', async () => {
    // Company
    const companyUser = await createTestUser(supabase, { role: 'company' });
    cleanupIds.userIds.push(companyUser.id);

    const { data: company, error: compErr } = await supabase
      .from('companies')
      .insert({
        user_id: companyUser.id,
        company_name: 'Interview Corp E2E',
        email: `intcorp-${companyUser.id.slice(0, 8)}@e2e.local`,
        status: 'active',
      })
      .select()
      .single();
    expect(compErr).toBeNull();
    companyId = company.id;
    cleanupIds.companyIds.push(companyId);

    // Job
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .insert({
        company_id: companyId,
        title: 'Interview Test Role',
        description: 'Role for interview flow E2E',
        contract_type: 'clt',
        work_type: 'hibrido',
        status: 'open',
      })
      .select()
      .single();
    expect(jobErr).toBeNull();
    jobId = job.id;
    cleanupIds.jobIds.push(jobId);

    // Candidate
    const candUser = await createTestUser(supabase, { role: 'candidate' });
    cleanupIds.userIds.push(candUser.id);

    const candidate = await createTestCandidate(supabase, candUser.id, {
      full_name: 'Interview Candidate E2E',
    });
    candidateId = candidate.id;
    cleanupIds.candidateIds.push(candidateId);

    // Application
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .insert({
        job_id: jobId,
        candidate_id: candidateId,
        status: 'interview-scheduled',
      })
      .select()
      .single();
    expect(appErr).toBeNull();
    applicationId = app.id;
    cleanupIds.applicationIds.push(applicationId);
  });

  it('creates an interview session with scheduled status', async () => {
    const scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 1 week ahead

    const { data: session, error } = await supabase
      .from('interview_sessions')
      .insert({
        job_id: jobId,
        company_id: companyId,
        interview_type: 'online',
        scheduled_at: scheduledAt,
        duration_minutes: 45,
        meeting_link: 'https://meet.example.com/e2e-test',
        status: 'scheduled',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(session.status).toBe('scheduled');
    expect(session.interview_type).toBe('online');
    expect(session.duration_minutes).toBe(45);
    sessionId = session.id;
    cleanupIds.sessionIds.push(sessionId);
  });

  it('creates an interview participant with pending status', async () => {
    const { data: participant, error } = await supabase
      .from('interview_participants')
      .insert({
        interview_session_id: sessionId,
        candidate_id: candidateId,
        application_id: applicationId,
        status: 'pending',
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(participant.status).toBe('pending');
    expect(participant.candidate_id).toBe(candidateId);
    participantId = participant.id;
    cleanupIds.participantIds.push(participantId);
  });

  it('updates participant status: pending -> confirmed', async () => {
    const { data: updated, error } = await supabase
      .from('interview_participants')
      .update({ status: 'confirmed', responded_at: new Date().toISOString() })
      .eq('id', participantId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated.status).toBe('confirmed');
    expect(updated.responded_at).toBeDefined();
  });

  it('updates participant status: confirmed -> attended', async () => {
    const { data: updated, error } = await supabase
      .from('interview_participants')
      .update({ status: 'attended' })
      .eq('id', participantId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated.status).toBe('attended');
  });

  it('updates session status: scheduled -> completed', async () => {
    const { data: updated, error } = await supabase
      .from('interview_sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated.status).toBe('completed');
  });

  it('queries sessions by company_id', async () => {
    const { data: sessions, error } = await supabase
      .from('interview_sessions')
      .select('id, status, interview_type, scheduled_at')
      .eq('company_id', companyId);

    expect(error).toBeNull();
    expect(sessions).toBeDefined();
    expect(sessions!.length).toBeGreaterThanOrEqual(1);
    const found = sessions!.find((s: { id: string }) => s.id === sessionId);
    expect(found).toBeDefined();
    expect(found!.status).toBe('completed');
  });

  it('queries participants by session_id', async () => {
    const { data: participants, error } = await supabase
      .from('interview_participants')
      .select('id, candidate_id, status')
      .eq('interview_session_id', sessionId);

    expect(error).toBeNull();
    expect(participants).toBeDefined();
    expect(participants!.length).toBeGreaterThanOrEqual(1);
    const found = participants!.find(
      (p: { id: string }) => p.id === participantId
    );
    expect(found).toBeDefined();
    expect(found!.status).toBe('attended');
  });
});
