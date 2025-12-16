import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log('Service key exists:', serviceRoleKey ? 'YES' : 'NO');
console.log('URL:', process.env.SUPABASE_URL);

if (!serviceRoleKey) {
  console.log('ERROR: No service role key found');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  serviceRoleKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function check() {
  console.log('\nChecking users table...');
  const { data: users, error: userError } = await supabase.from('users').select('id, email, role').limit(10);
  console.log('Users found:', users?.length || 0);
  if (userError) console.log('Error:', userError.message);
  if (users) users.forEach(u => console.log(' -', u.email, u.role));

  console.log('\nChecking affiliates table...');
  const { data: affiliates, error: affError } = await supabase.from('affiliates').select('*').limit(5);
  console.log('Affiliates found:', affiliates?.length || 0);
  if (affError) console.log('Error:', affError.message);
  if (affiliates) affiliates.forEach(a => console.log(' - affiliate_id:', a.id));
}

check().then(() => process.exit(0));
