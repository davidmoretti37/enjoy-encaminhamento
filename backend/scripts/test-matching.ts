/**
 * Test script for AI matching
 * Usage: npx tsx scripts/test-matching.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function test() {
  console.log('Testing AI Matching Service...\n');

  // Get a seed job
  const { data: jobs, error: jobsError } = await supabaseAdmin
    .from('jobs')
    .select('id, title, company_id')
    .like('title', '%Assistente%')
    .limit(1);

  if (jobsError || !jobs || jobs.length === 0) {
    console.log('No seed jobs found. Run seed script first.');
    return;
  }

  const job = jobs[0];
  console.log(`Found job: ${job.title} (${job.id})\n`);

  // Get the company's affiliate_id
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('affiliate_id')
    .eq('id', job.company_id)
    .single();

  if (!company?.affiliate_id) {
    console.log('Company has no affiliate');
    return;
  }

  // Import matching service dynamically
  const { matchCandidatesForJob } = await import('../services/matching');

  console.log('Starting matching...\n');

  try {
    const results = await matchCandidatesForJob(job.id, {
      maxCandidates: 5,
      saveResults: true,
    });

    console.log(`\nMatched ${results.length} candidates:\n`);

    for (const match of results) {
      console.log(`Candidate: ${match.candidateId}`);
      console.log(`  Score: ${match.matchScore}%`);
      console.log(`  Confidence: ${match.confidenceScore}%`);
      console.log(`  Recommendation: ${match.recommendation}`);
      console.log(`  Strengths: ${match.strengths.join(', ')}`);
      console.log(`  Concerns: ${match.concerns.join(', ') || 'None'}`);
      console.log(`  Explanation: ${match.matchExplanation}`);
      console.log('');
    }

    // Verify saved in database
    const { data: saved } = await supabaseAdmin
      .from('job_matches')
      .select('id, candidate_id, match_score')
      .eq('job_id', job.id);

    console.log(`Saved ${saved?.length || 0} matches to database`);
  } catch (error: any) {
    console.error('Matching error:', error.message);
    console.error(error);
  }
}

test().then(() => process.exit(0));
