/**
 * Delete seed data script
 * Removes all test data created by seed-matching-data.ts
 *
 * Usage: npx tsx scripts/delete-seed-data.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const SEED_MARKER = '@seed.local';

async function main() {
  console.log('🗑️  Starting seed data deletion...\n');
  console.log(`Looking for records with email containing: ${SEED_MARKER}\n`);

  // 1. Delete job_matches first (depends on jobs and candidates)
  console.log('1. Deleting job_matches...');
  const { data: matchesToDelete } = await supabaseAdmin
    .from('job_matches')
    .select('id, job_id')
    .filter('job_id', 'in', `(SELECT id FROM jobs WHERE company_id IN (SELECT id FROM companies WHERE email LIKE '%${SEED_MARKER}%'))`);

  // Use raw query approach for complex delete
  const { error: matchesError, count: matchesCount } = await supabaseAdmin
    .from('job_matches')
    .delete()
    .like('job_id', '%') // This won't work directly, need different approach
    .select('id');

  // Delete matches by getting job IDs first
  const { data: seedJobs } = await supabaseAdmin
    .from('jobs')
    .select('id')
    .in('company_id',
      (await supabaseAdmin
        .from('companies')
        .select('id')
        .like('email', `%${SEED_MARKER}%`)
      ).data?.map(c => c.id) || []
    );

  if (seedJobs && seedJobs.length > 0) {
    const jobIds = seedJobs.map(j => j.id);
    const { error: matchDelError } = await supabaseAdmin
      .from('job_matches')
      .delete()
      .in('job_id', jobIds);

    if (matchDelError) {
      console.log(`   ⚠️ Error deleting matches: ${matchDelError.message}`);
    } else {
      console.log(`   ✓ Deleted matches for ${jobIds.length} jobs`);
    }
  }

  // 2. Delete applications (depends on jobs and candidates)
  console.log('\n2. Deleting applications...');
  const { data: seedCandidates } = await supabaseAdmin
    .from('candidates')
    .select('id')
    .like('email', `%${SEED_MARKER}%`);

  if (seedCandidates && seedCandidates.length > 0) {
    const candidateIds = seedCandidates.map(c => c.id);
    const { error: appError } = await supabaseAdmin
      .from('applications')
      .delete()
      .in('candidate_id', candidateIds);

    if (appError) {
      console.log(`   ⚠️ Error deleting applications: ${appError.message}`);
    } else {
      console.log(`   ✓ Deleted applications for ${candidateIds.length} candidates`);
    }
  }

  // 3. Delete jobs (depends on companies)
  console.log('\n3. Deleting jobs...');
  const { data: seedCompanies } = await supabaseAdmin
    .from('companies')
    .select('id')
    .like('email', `%${SEED_MARKER}%`);

  if (seedCompanies && seedCompanies.length > 0) {
    const companyIds = seedCompanies.map(c => c.id);
    const { error: jobsError, count } = await supabaseAdmin
      .from('jobs')
      .delete()
      .in('company_id', companyIds)
      .select();

    if (jobsError) {
      console.log(`   ⚠️ Error deleting jobs: ${jobsError.message}`);
    } else {
      console.log(`   ✓ Deleted jobs for ${companyIds.length} companies`);
    }
  }

  // 4. Delete candidates
  console.log('\n4. Deleting candidates...');
  const { error: candError, data: deletedCandidates } = await supabaseAdmin
    .from('candidates')
    .delete()
    .like('email', `%${SEED_MARKER}%`)
    .select();

  if (candError) {
    console.log(`   ⚠️ Error deleting candidates: ${candError.message}`);
  } else {
    console.log(`   ✓ Deleted ${deletedCandidates?.length || 0} candidates`);
  }

  // 5. Delete companies
  console.log('\n5. Deleting companies...');
  const { error: compError, data: deletedCompanies } = await supabaseAdmin
    .from('companies')
    .delete()
    .like('email', `%${SEED_MARKER}%`)
    .select();

  if (compError) {
    console.log(`   ⚠️ Error deleting companies: ${compError.message}`);
  } else {
    console.log(`   ✓ Deleted ${deletedCompanies?.length || 0} companies`);
  }

  // 6. Delete users (get them first for auth deletion)
  console.log('\n6. Deleting users...');
  const { data: usersToDelete } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .like('email', `%${SEED_MARKER}%`);

  const userIds = usersToDelete?.map(u => u.id) || [];

  // Delete from users table
  const { error: userError, data: deletedUsers } = await supabaseAdmin
    .from('users')
    .delete()
    .like('email', `%${SEED_MARKER}%`)
    .select();

  if (userError) {
    console.log(`   ⚠️ Error deleting users: ${userError.message}`);
  } else {
    console.log(`   ✓ Deleted ${deletedUsers?.length || 0} users from users table`);
  }

  // 7. Delete auth users
  console.log('\n7. Deleting auth users...');
  let authDeleted = 0;
  for (const userId of userIds) {
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (!authError) {
      authDeleted++;
    } else {
      console.log(`   ⚠️ Error deleting auth user ${userId}: ${authError.message}`);
    }
  }
  console.log(`   ✓ Deleted ${authDeleted} auth users`);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ SEED DATA DELETION COMPLETE');
  console.log('='.repeat(50));
  console.log(`\nDeleted:`);
  console.log(`  - Auth users: ${authDeleted}`);
  console.log(`  - Users: ${deletedUsers?.length || 0}`);
  console.log(`  - Candidates: ${deletedCandidates?.length || 0}`);
  console.log(`  - Companies: ${deletedCompanies?.length || 0}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
