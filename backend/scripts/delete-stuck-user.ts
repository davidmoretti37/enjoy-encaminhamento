/**
 * Delete a stuck user from Supabase Auth + users/candidates tables.
 * Use when a user's email is "used up" due to partial registration failure.
 *
 * Usage: npx tsx backend/scripts/delete-stuck-user.ts pamelavictori123@gmail.com
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
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx tsx backend/scripts/delete-stuck-user.ts <email>');
    process.exit(1);
  }

  console.log(`🔍 Looking up user: ${email}`);

  // Find auth user by email
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('Error listing users:', listError.message);
    process.exit(1);
  }

  const authUser = users.find(u => u.email === email.toLowerCase());
  if (!authUser) {
    console.log('❌ No auth user found with that email. Nothing to delete.');
    process.exit(0);
  }

  console.log(`Found auth user: ${authUser.id} (${authUser.email})`);

  // Delete candidate record if exists
  const { error: candidateError } = await supabaseAdmin
    .from('candidates')
    .delete()
    .eq('user_id', authUser.id);
  if (candidateError && candidateError.code !== 'PGRST116') {
    console.warn('Candidate delete warning:', candidateError.message);
  } else {
    console.log('✅ Deleted candidate record (if any)');
  }

  // Delete user record if exists
  const { error: userError } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', authUser.id);
  if (userError && userError.code !== 'PGRST116') {
    console.warn('User delete warning:', userError.message);
  } else {
    console.log('✅ Deleted users record (if any)');
  }

  // Delete auth user
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
  if (authError) {
    console.error('❌ Error deleting auth user:', authError.message);
    process.exit(1);
  }

  console.log(`\n✅ Successfully deleted user ${email} (${authUser.id})`);
  console.log('They can now re-register.');
}

main().catch(console.error);
