import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Local Supabase defaults (from `supabase start` output)
const SUPABASE_URL = process.env.SUPABASE_E2E_URL || 'http://127.0.0.1:54321';
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
 * Generate a unique test user and insert into users table.
 */
export async function createTestUser(
  client: SupabaseClient,
  overrides: Record<string, unknown> = {}
) {
  const id = crypto.randomUUID();
  const data = {
    id,
    email: `test-${id.slice(0, 8)}@e2e.local`,
    name: `Test User ${id.slice(0, 8)}`,
    role: 'candidate' as const,
    created_at: new Date().toISOString(),
    ...overrides,
  };

  const { data: row, error } = await client
    .from('users')
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`createTestUser failed: ${error.message}`);
  return row;
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
