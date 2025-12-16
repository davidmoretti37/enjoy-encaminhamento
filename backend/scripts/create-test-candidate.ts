/**
 * Create a test candidate user for portal testing
 * Usage: npx tsx scripts/create-test-candidate.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const email = 'david@test.local';
  const password = 'Test123!';
  const name = 'David (Test)';

  console.log('Creating test candidate account...\n');

  // Check if user already exists
  const { data: existingUsers } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('email', email);

  if (existingUsers && existingUsers.length > 0) {
    const userId = existingUsers[0].id;

    // Check if candidate profile exists
    const { data: existingCandidate } = await supabaseAdmin
      .from('candidates')
      .select('id')
      .eq('user_id', userId);

    if (!existingCandidate || existingCandidate.length === 0) {
      // User exists but no candidate profile - create it
      console.log('User exists, creating candidate profile...');
      const { error: candError } = await supabaseAdmin
        .from('candidates')
        .insert({
          user_id: userId,
          full_name: name,
          email,
          cpf: '123.456.789-00',
          city: 'São Paulo',
          state: 'SP',
          status: 'active',
          available_for_clt: true,
          available_for_internship: true,
          available_for_apprentice: false,
        });

      if (candError) {
        console.error('Candidate record error:', candError.message);
        process.exit(1);
      }
      console.log('Created candidate profile');
    }

    console.log('\n========================================');
    console.log('LOGIN CREDENTIALS:');
    console.log('========================================');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('========================================\n');
    process.exit(0);
  }

  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: 'candidate' },
  });

  if (authError) {
    console.error('Auth error:', authError.message);
    process.exit(1);
  }

  console.log('Created auth user:', authData.user.id);

  // Create local user record
  const { error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      name,
      role: 'candidate',
    });

  if (userError) {
    console.error('User record error:', userError.message);
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    process.exit(1);
  }

  // Create candidate profile
  const { error: candError } = await supabaseAdmin
    .from('candidates')
    .insert({
      user_id: authData.user.id,
      full_name: name,
      email,
      cpf: '123.456.789-00',
      city: 'São Paulo',
      state: 'SP',
      status: 'active',
      available_for_clt: true,
      available_for_internship: true,
      available_for_apprentice: false,
    });

  if (candError) {
    console.error('Candidate record error:', candError.message);
    process.exit(1);
  }

  console.log('Created candidate profile');

  console.log('\n========================================');
  console.log('TEST ACCOUNT CREATED SUCCESSFULLY!');
  console.log('========================================');
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log('========================================\n');
  console.log('Go to: http://localhost:5173/login');
}

main().catch(console.error);
