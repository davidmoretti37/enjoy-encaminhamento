import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Local Supabase defaults (from `supabase start` output)
const SUPABASE_URL = process.env.SUPABASE_E2E_URL || 'http://127.0.0.1:54321';
const E2E_DATABASE_URL =
  process.env.SUPABASE_E2E_DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_E2E_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_E2E_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/**
 * Create a Supabase client with service_role (bypasses RLS).
 * Use this for test setup/teardown and direct data manipulation.
 */
export function createServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * Create a Supabase client with anon key (respects RLS).
 * Use this to test what end-users would experience.
 */
export function createAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * An affiliate for tests that create agencies.
 *
 * agencies.affiliate_id is NOT NULL, so the agency-flow tests could never insert
 * one. Reuses the affiliate already present locally rather than creating one,
 * since affiliates themselves require a user and a creator.
 */
export async function getTestAffiliateId(client: SupabaseClient): Promise<string> {
  const { data } = await client.from('affiliates').select('id').limit(1).maybeSingle();
  if (data?.id) return data.id as string;
  throw new Error('No affiliate exists in the e2e database. Seed one first.');
}

/**
 * An agency for tests to hang jobs off.
 *
 * jobs.agency_id is NOT NULL, and every e2e file created jobs without one, so
 * each of those inserts died with 23502. Reuses whatever agency already exists
 * locally rather than creating one per run, since agencies also require an
 * affiliate_id.
 */
export async function getTestAgencyId(client: SupabaseClient): Promise<string> {
  const { data } = await client.from('agencies').select('id').limit(1).maybeSingle();
  if (data?.id) return data.id as string;
  throw new Error(
    'No agency exists in the e2e database. Seed one before running these tests.',
  );
}

/**
 * Insert straight into auth.users over the local Postgres connection.
 *
 * Only `id` is required by the table; the rest mirrors what a real signup writes
 * so anything reading these columns behaves the same as in production.
 */
async function createAuthUser(email: string): Promise<string> {
  const { Client } = await import("pg");
  const c = new Client({ connectionString: E2E_DATABASE_URL });
  await c.connect();
  try {
    const { rows } = await c.query(
      `INSERT INTO auth.users (id, instance_id, aud, role, email, email_confirmed_at,
                               created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
       VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
               'authenticated', $1, now(), now(), now(), '{"provider":"email"}'::jsonb, '{}'::jsonb)
       RETURNING id`,
      [email],
    );
    return rows[0].id as string;
  } finally {
    await c.end();
  }
}

/**
 * Generate a unique test user and insert into users table.
 */
export async function createTestUser(
  client: SupabaseClient,
  overrides: Record<string, unknown> = {}
) {
  // public.users.id is a foreign key onto auth.users.id, so inventing a uuid and
  // inserting straight into public.users always failed with users_id_fkey.
  //
  // The auth admin API is not usable here: local GoTrue signs with ES256
  // (GOTRUE_JWT_KEYS) and rejects the HS256 service key this file carries, so
  // every admin call comes back "signing method HS256 is invalid". Writing the
  // auth.users row over the local Postgres connection is both simpler and closer
  // to what actually has to exist for the FK to hold.
  const email = (overrides.email as string) || `test-${crypto.randomUUID().slice(0, 8)}@e2e.local`;
  const id = await createAuthUser(email);

  // id and email come from the auth user, so they are applied AFTER the overrides
  // rather than being listed twice.
  const { id: _ignoredId, email: _ignoredEmail, ...rest } = overrides as Record<string, unknown>;
  const data = {
    name: `Test User ${id.slice(0, 8)}`,
    role: 'candidate' as const,
    ...rest,
    id,
    email,
  };

  const { data: row, error } = await client
    .from('users')
    .upsert(data, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw new Error(`createTestUser failed: ${error.message}`);
  return row;
}

/** Remove an e2e auth user, so repeated runs do not collide on email. */
export async function deleteTestUser(client: SupabaseClient, userId: string) {
  await client.from('users').delete().eq('id', userId);
  const { Client } = await import("pg");
  const c = new Client({ connectionString: E2E_DATABASE_URL });
  await c.connect();
  try {
    await c.query("DELETE FROM auth.users WHERE id = $1", [userId]);
  } finally {
    await c.end();
  }
}

/**
 * Create a test candidate profile linked to an existing user.
 */
export async function createTestCandidate(
  client: SupabaseClient,
  userId: string,
  overrides: Record<string, unknown> = {}
) {
  const id = crypto.randomUUID();
  const data = {
    id,
    user_id: userId,
    full_name: `Candidate ${id.slice(0, 8)}`,
    cpf: `${Math.floor(Math.random() * 900000000 + 100000000)}-00`,
    email: `candidate-${id.slice(0, 8)}@e2e.local`,
    city: 'São Paulo',
    state: 'SP',
    status: 'active' as const,
    created_at: new Date().toISOString(),
    ...overrides,
  };

  const { data: row, error } = await client
    .from('candidates')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`createTestCandidate failed: ${error.message}`);
  return row;
}

/**
 * Clean up all test data created during a test run.
 * Deletes in reverse-dependency order.
 */
export async function cleanupTestData(
  client: SupabaseClient,
  userIds: string[]
) {
  if (userIds.length === 0) return;

  // Delete candidates first (depends on users)
  for (const userId of userIds) {
    await client.from('candidates').delete().eq('user_id', userId);
  }

  // Delete users
  for (const userId of userIds) {
    await client.from('users').delete().eq('id', userId);
  }
}

export { SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY };
