import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data: candidates } = await supabaseAdmin
    .from('candidates')
    .select('id, email, full_name')
    .limit(10);

  console.log('\nCandidates in database:');
  candidates?.forEach(c => {
    console.log(`  - ${c.email} (${c.full_name})`);
  });

  console.log('\n');
  process.exit(0);
}

main();
