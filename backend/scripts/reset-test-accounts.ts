/**
 * Reset test accounts data
 * Removes all data for specific test company and candidate while keeping auth users
 *
 * Usage: npx tsx backend/scripts/reset-test-accounts.ts
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

const COMPANY_EMAIL = 'panda@gmail.com';
const CANDIDATE_EMAIL = 'candidato@gmail.com';

async function main() {
  console.log('🗑️  Starting test accounts data reset...\n');
  console.log(`Company: ${COMPANY_EMAIL}`);
  console.log(`Candidate: ${CANDIDATE_EMAIL}\n`);

  try {
    // Get company and candidate IDs
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id')
      .eq('email', COMPANY_EMAIL)
      .single();

    const { data: candidate } = await supabaseAdmin
      .from('candidates')
      .select('id')
      .eq('email', CANDIDATE_EMAIL)
      .single();

    if (!company) {
      console.log('⚠️  Company not found');
    } else {
      console.log(`✓ Found company: ${company.id}`);
    }

    if (!candidate) {
      console.log('⚠️  Candidate not found');
    } else {
      console.log(`✓ Found candidate: ${candidate.id}\n`);
    }

    // 1. Delete interview participants
    if (candidate) {
      console.log('1. Deleting interview participants...');
      const { error: participantsError, count } = await supabaseAdmin
        .from('interview_participants')
        .delete()
        .eq('candidate_id', candidate.id);

      if (participantsError) {
        console.log(`   ⚠️ Error: ${participantsError.message}`);
      } else {
        console.log(`   ✓ Deleted interview participants`);
      }
    }

    // 2. Delete interview sessions for company jobs
    if (company) {
      console.log('\n2. Deleting interview sessions...');
      const { data: companyJobs } = await supabaseAdmin
        .from('jobs')
        .select('id')
        .eq('company_id', company.id);

      if (companyJobs && companyJobs.length > 0) {
        const jobIds = companyJobs.map(j => j.id);
        const { error: sessionsError } = await supabaseAdmin
          .from('interview_sessions')
          .delete()
          .in('job_id', jobIds);

        if (sessionsError) {
          console.log(`   ⚠️ Error: ${sessionsError.message}`);
        } else {
          console.log(`   ✓ Deleted interview sessions`);
        }
      }
    }

    // 3. Delete contracts
    if (candidate) {
      console.log('\n3. Deleting contracts...');
      const { error: contractsError } = await supabaseAdmin
        .from('contracts')
        .delete()
        .eq('candidate_id', candidate.id);

      if (contractsError) {
        console.log(`   ⚠️ Error: ${contractsError.message}`);
      } else {
        console.log(`   ✓ Deleted contracts`);
      }
    }

    // 4. Delete job matches
    if (candidate && company) {
      console.log('\n4. Deleting job matches...');
      const { data: companyJobs } = await supabaseAdmin
        .from('jobs')
        .select('id')
        .eq('company_id', company.id);

      if (companyJobs && companyJobs.length > 0) {
        const jobIds = companyJobs.map(j => j.id);
        const { error: matchesError } = await supabaseAdmin
          .from('job_matches')
          .delete()
          .in('job_id', jobIds);

        if (matchesError) {
          console.log(`   ⚠️ Error: ${matchesError.message}`);
        } else {
          console.log(`   ✓ Deleted job matches`);
        }
      }
    }

    // 5. Delete candidate_batches
    if (company) {
      console.log('\n5. Deleting candidate_batches...');
      const { error: batchesError } = await supabaseAdmin
        .from('candidate_batches')
        .delete()
        .eq('company_id', company.id);

      if (batchesError) {
        console.log(`   ⚠️ Error: ${batchesError.message}`);
      } else {
        console.log(`   ✓ Deleted candidate_batches`);
      }
    }

    // 5b. Delete hiring_processes
    if (company) {
      console.log('\n5b. Deleting hiring_processes...');
      const { error: hiringError } = await supabaseAdmin
        .from('hiring_processes')
        .delete()
        .eq('company_id', company.id);

      if (hiringError) {
        console.log(`   ⚠️ Error: ${hiringError.message}`);
      } else {
        console.log(`   ✓ Deleted hiring_processes`);
      }
    }

    // 5c. Delete notifications for both users
    console.log('\n5c. Deleting notifications...');
    for (const email of [COMPANY_EMAIL, CANDIDATE_EMAIL]) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userData) {
        await supabaseAdmin
          .from('notifications')
          .delete()
          .eq('user_id', userData.id);
      }
    }
    console.log(`   ✓ Deleted notifications`);

    // 6. Delete applications
    if (candidate) {
      console.log('\n6. Deleting applications...');
      const { error: appsError } = await supabaseAdmin
        .from('applications')
        .delete()
        .eq('candidate_id', candidate.id);

      if (appsError) {
        console.log(`   ⚠️ Error: ${appsError.message}`);
      } else {
        console.log(`   ✓ Deleted applications`);
      }
    }

    // 7. Delete jobs
    if (company) {
      console.log('\n7. Deleting jobs...');
      const { error: jobsError, data: deletedJobs } = await supabaseAdmin
        .from('jobs')
        .delete()
        .eq('company_id', company.id)
        .select();

      if (jobsError) {
        console.log(`   ⚠️ Error: ${jobsError.message}`);
      } else {
        console.log(`   ✓ Deleted ${deletedJobs?.length || 0} jobs`);
      }
    }

    // 8. Update candidate to reset profile (keep the record but clear data)
    if (candidate) {
      console.log('\n8. Resetting candidate profile...');
      const { error: candError } = await supabaseAdmin
        .from('candidates')
        .update({
          skills: [],
          experience: [],
          has_work_experience: false,
        })
        .eq('id', candidate.id);

      if (candError) {
        console.log(`   ⚠️ Error: ${candError.message}`);
      } else {
        console.log(`   ✓ Reset candidate profile (kept email/name/basic info)`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ TEST ACCOUNTS RESET COMPLETE');
    console.log('='.repeat(50));
    console.log('\nYou can now test the funnel from scratch!');
    console.log('Auth users are still intact - you can login with the same credentials.\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
