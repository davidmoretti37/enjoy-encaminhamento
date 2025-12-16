import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function check() {
  // Get schools
  const { data: schools } = await supabaseAdmin.from('schools').select('id, name').limit(1);
  console.log('Schools:', schools);

  // Get companies (seed)
  const { data: companies } = await supabaseAdmin.from('companies').select('id, company_name, email').like('email', '%@seed.local%');
  console.log('Seed companies:', companies);

  if (schools && schools.length > 0 && companies && companies.length > 0) {
    // Try inserting a job with school_id
    const { data: job, error: insertError } = await supabaseAdmin
      .from('jobs')
      .insert({
        school_id: schools[0].id,
        company_id: companies[0].id,
        title: 'Test Job Seed',
        description: 'Test description',
        contract_type: 'clt',
        work_type: 'presencial',
        status: 'open',
        openings: 1,
      })
      .select()
      .single();

    if (insertError) {
      console.log('Insert error:', insertError.message);
      console.log('Full error:', insertError);
    } else {
      console.log('Job created:', job?.id);
      console.log('Job columns:', Object.keys(job || {}));
      // Clean up
      await supabaseAdmin.from('jobs').delete().eq('id', job?.id);
      console.log('Cleaned up test job');
    }
  }
}

check().then(() => process.exit(0));
