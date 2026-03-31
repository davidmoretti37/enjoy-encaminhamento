import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createServiceClient,
  createTestUser,
  createTestCandidate,
  cleanupTestData,
} from './setup';

describe('Candidate flow (E2E)', () => {
  let supabase: SupabaseClient;
  const createdUserIds: string[] = [];

  beforeAll(() => {
    supabase = createServiceClient();
  });

  afterAll(async () => {
    await cleanupTestData(supabase, createdUserIds);
  });

  it('creates a user with candidate role', async () => {
    const user = await createTestUser(supabase, { role: 'candidate' });
    createdUserIds.push(user.id);

    expect(user.id).toBeDefined();
    expect(user.role).toBe('candidate');
    expect(user.email).toContain('@e2e.local');
  });

  it('creates a candidate profile linked to the user', async () => {
    const userId = createdUserIds[0];
    const candidate = await createTestCandidate(supabase, userId, {
      full_name: 'Maria Teste',
      education_level: 'superior',
      city: 'São Paulo',
      state: 'SP',
    });

    expect(candidate.id).toBeDefined();
    expect(candidate.user_id).toBe(userId);
    expect(candidate.full_name).toBe('Maria Teste');
    expect(candidate.education_level).toBe('superior');
    expect(candidate.status).toBe('active');
  });

  it('updates the candidate profile', async () => {
    const userId = createdUserIds[0];

    // Fetch the candidate we created
    const { data: candidates } = await supabase
      .from('candidates')
      .select('*')
      .eq('user_id', userId);

    expect(candidates).toBeDefined();
    expect(candidates!.length).toBeGreaterThan(0);

    const candidateId = candidates![0].id;

    // Update profile
    const { data: updated, error } = await supabase
      .from('candidates')
      .update({
        phone: '(11) 99999-1234',
        profile_summary: 'Experienced software developer',
        skills: ['TypeScript', 'React', 'Node.js'],
        available_for_internship: true,
        available_for_clt: true,
      })
      .eq('id', candidateId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated.phone).toBe('(11) 99999-1234');
    expect(updated.profile_summary).toBe('Experienced software developer');
    expect(updated.skills).toEqual(['TypeScript', 'React', 'Node.js']);
    expect(updated.available_for_internship).toBe(true);
  });

  it('searches candidates by status and city', async () => {
    const { data: results, error } = await supabase
      .from('candidates')
      .select('id, full_name, city, status')
      .eq('status', 'active')
      .eq('city', 'São Paulo');

    expect(error).toBeNull();
    expect(results).toBeDefined();
    expect(results!.length).toBeGreaterThanOrEqual(1);

    const found = results!.find(
      (c: { full_name: string }) => c.full_name === 'Maria Teste'
    );
    expect(found).toBeDefined();
  });

  it('verifies data persisted correctly with a fresh query', async () => {
    const userId = createdUserIds[0];

    // Create a fresh client to prove data is in the DB, not cached
    const freshClient = createServiceClient();

    const { data: user, error: userErr } = await freshClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    expect(userErr).toBeNull();
    expect(user.role).toBe('candidate');

    const { data: candidate, error: candErr } = await freshClient
      .from('candidates')
      .select('*')
      .eq('user_id', userId)
      .single();

    expect(candErr).toBeNull();
    expect(candidate.full_name).toBe('Maria Teste');
    expect(candidate.phone).toBe('(11) 99999-1234');
    expect(candidate.skills).toEqual(['TypeScript', 'React', 'Node.js']);
  });
});
