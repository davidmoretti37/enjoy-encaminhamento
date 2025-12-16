import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function check() {
  // Try to select from jobs with all fields
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .limit(1);

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Jobs columns:', data && data[0] ? Object.keys(data[0]) : 'No jobs yet');
  }

  // Try inserting a minimal job
  const { data: companies } = await supabaseAdmin.from('companies').select('id').limit(1);
  if (companies && companies.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from('jobs')
      .insert({
        company_id: companies[0].id,
        title: 'Test Job',
        description: 'Test',
        contract_type: 'clt',
        work_type: 'presencial',
      })
      .select()
      .single();

    if (insertError) {
      console.log('Insert error:', insertError.message);
    } else {
      console.log('Minimal insert works');
      // Clean up
      await supabaseAdmin.from('jobs').delete().eq('title', 'Test Job');
    }
  }
}

check().then(() => process.exit(0));
