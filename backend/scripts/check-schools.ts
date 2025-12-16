import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function check() {
  // Get all schools
  const { data: schools, error } = await supabaseAdmin.from('schools').select('*');
  console.log('Schools:', schools?.length || 0);
  if (error) console.log('Error:', error.message);
  if (schools) schools.forEach(s => console.log(' -', s.name, s.id));

  // Check if affiliates have schools associated
  const { data: affiliates } = await supabaseAdmin
    .from('affiliates')
    .select('id, user_id');
  console.log('\nAffiliates:', affiliates?.length || 0);

  // Check users with school role
  const { data: schoolUsers } = await supabaseAdmin
    .from('users')
    .select('id, email')
    .eq('role', 'school');
  console.log('\nUsers with school role:', schoolUsers?.length || 0);
  if (schoolUsers) schoolUsers.forEach(u => console.log(' -', u.email, u.id));
}

check().then(() => process.exit(0));
