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

const EMAIL = 'uberlandia@anecrh.com.br';
const COMPANY_NAME = 'Enjoy Uberlândia';

async function main() {
  console.log('='.repeat(80));
  console.log('INVESTIGATION: User & Company Account');
  console.log(`Email: ${EMAIL}`);
  console.log(`Company: ${COMPANY_NAME}`);
  console.log('='.repeat(80));

  // 1. Find user by email
  console.log('\n--- 1. USER RECORD (by email) ---');
  const { data: user, error: userErr } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', EMAIL)
    .maybeSingle();
  if (userErr) console.error('User query error:', userErr);
  console.log(user ? JSON.stringify(user, null, 2) : 'NO USER FOUND');

  // Also check auth.users
  console.log('\n--- 1b. AUTH USER (Supabase Auth) ---');
  if (user?.id) {
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(user.id);
    if (authErr) console.error('Auth user error:', authErr);
    console.log(authUser?.user ? JSON.stringify({
      id: authUser.user.id,
      email: authUser.user.email,
      email_confirmed_at: authUser.user.email_confirmed_at,
      created_at: authUser.user.created_at,
      updated_at: authUser.user.updated_at,
      last_sign_in_at: authUser.user.last_sign_in_at,
      banned_until: authUser.user.banned_until,
      confirmed_at: authUser.user.confirmed_at,
      role: authUser.user.role,
      app_metadata: authUser.user.app_metadata,
      user_metadata: authUser.user.user_metadata,
    }, null, 2) : 'NO AUTH USER');
  } else {
    // Try listing by email
    const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const found = authList?.users?.find(u => u.email === EMAIL);
    console.log(found ? JSON.stringify({
      id: found.id,
      email: found.email,
      email_confirmed_at: found.email_confirmed_at,
      created_at: found.created_at,
      last_sign_in_at: found.last_sign_in_at,
      banned_until: found.banned_until,
      confirmed_at: found.confirmed_at,
      role: found.role,
      app_metadata: found.app_metadata,
      user_metadata: found.user_metadata,
    }, null, 2) : 'NO AUTH USER FOUND BY EMAIL');
  }

  // 2. Find company by name
  console.log('\n--- 2. COMPANY RECORD (by name) ---');
  const { data: companies, error: compErr } = await supabaseAdmin
    .from('companies')
    .select('*')
    .ilike('company_name', `%Enjoy Uberl%`);
  if (compErr) console.error('Company query error:', compErr);
  if (companies?.length) {
    companies.forEach(c => console.log(JSON.stringify(c, null, 2)));
  } else {
    console.log('NO COMPANY FOUND BY NAME');
  }

  // Also search by email
  console.log('\n--- 2b. COMPANY RECORD (by email) ---');
  const { data: compByEmail, error: compEmailErr } = await supabaseAdmin
    .from('companies')
    .select('*')
    .eq('email', EMAIL);
  if (compEmailErr) console.error('Company email query error:', compEmailErr);
  if (compByEmail?.length) {
    compByEmail.forEach(c => console.log(JSON.stringify(c, null, 2)));
  } else {
    console.log('NO COMPANY FOUND BY EMAIL');
  }

  // Get the company ID for further queries
  const company = companies?.[0] || compByEmail?.[0];
  const companyId = company?.id;
  const companyUserId = company?.user_id;

  // 3. Check user-company relationship
  console.log('\n--- 3. USER-COMPANY RELATIONSHIP ---');
  if (company) {
    console.log(`Company user_id: ${company.user_id}`);
    console.log(`Company agency_id: ${company.agency_id}`);
    console.log(`Company affiliate_id: ${company.affiliate_id}`);
    console.log(`Company status: ${company.status}`);
    if (company.user_id) {
      const { data: linkedUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', company.user_id)
        .maybeSingle();
      console.log('Linked user:', linkedUser ? JSON.stringify(linkedUser, null, 2) : 'NOT FOUND');
    } else {
      console.log('⚠️  Company has NO user_id linked - this means no login account is associated');
    }
  }

  // 4. Check company invitations
  console.log('\n--- 4. COMPANY INVITATIONS ---');
  if (companyId) {
    const { data: invitations, error: invErr } = await supabaseAdmin
      .from('company_invitations')
      .select('*')
      .eq('company_id', companyId);
    if (invErr) console.error('Invitation query error:', invErr);
    if (invitations?.length) {
      invitations.forEach(inv => console.log(JSON.stringify(inv, null, 2)));
    } else {
      console.log('NO INVITATIONS FOUND FOR THIS COMPANY');
    }
  }

  // Also check invitations by email
  console.log('\n--- 4b. INVITATIONS BY EMAIL ---');
  const { data: invByEmail, error: invEmailErr } = await supabaseAdmin
    .from('company_invitations')
    .select('*')
    .eq('email', EMAIL);
  if (invEmailErr) console.error('Invitation email query error:', invEmailErr);
  if (invByEmail?.length) {
    invByEmail.forEach(inv => console.log(JSON.stringify(inv, null, 2)));
  } else {
    console.log('NO INVITATIONS FOUND BY EMAIL');
  }

  // 5. Check agency relationship
  console.log('\n--- 5. AGENCY RELATIONSHIP ---');
  if (company?.agency_id) {
    const { data: agency, error: agErr } = await supabaseAdmin
      .from('agencies')
      .select('*')
      .eq('id', company.agency_id)
      .maybeSingle();
    if (agErr) console.error('Agency query error:', agErr);
    console.log(agency ? JSON.stringify(agency, null, 2) : 'AGENCY NOT FOUND');
  } else {
    console.log('Company has no agency_id');
  }

  // 6. Check jobs for this company
  console.log('\n--- 6. JOBS FOR THIS COMPANY ---');
  if (companyId) {
    const { data: jobs, error: jobErr } = await supabaseAdmin
      .from('jobs')
      .select('id, title, status, contract_type, created_at, agency_id')
      .eq('company_id', companyId);
    if (jobErr) console.error('Jobs query error:', jobErr);
    if (jobs?.length) {
      jobs.forEach(j => console.log(JSON.stringify(j, null, 2)));
    } else {
      console.log('NO JOBS FOUND');
    }
  }

  // 7. Check candidate batches
  console.log('\n--- 7. CANDIDATE BATCHES ---');
  if (companyId) {
    const { data: batches, error: batchErr } = await supabaseAdmin
      .from('candidate_batches')
      .select('id, job_id, status, payment_status, unlocked, created_at, sent_at')
      .eq('company_id', companyId);
    if (batchErr) console.error('Batch query error:', batchErr);
    if (batches?.length) {
      batches.forEach(b => console.log(JSON.stringify(b, null, 2)));
    } else {
      console.log('NO BATCHES FOUND');
    }
  }

  // 8. Check payments
  console.log('\n--- 8. PAYMENTS ---');
  if (companyId) {
    const { data: payments, error: payErr } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('company_id', companyId);
    if (payErr) console.error('Payment query error:', payErr);
    if (payments?.length) {
      payments.forEach(p => console.log(JSON.stringify(p, null, 2)));
    } else {
      console.log('NO PAYMENTS FOUND');
    }
  }

  // 9. Check contracts
  console.log('\n--- 9. CONTRACTS ---');
  if (companyId) {
    const { data: contracts, error: ctErr } = await supabaseAdmin
      .from('contracts')
      .select('id, status, contract_type, start_date, end_date, created_at')
      .eq('company_id', companyId);
    if (ctErr) console.error('Contract query error:', ctErr);
    if (contracts?.length) {
      contracts.forEach(c => console.log(JSON.stringify(c, null, 2)));
    } else {
      console.log('NO CONTRACTS FOUND');
    }
  }

  // 10. Check hiring processes
  console.log('\n--- 10. HIRING PROCESSES ---');
  if (companyId) {
    const { data: hiring, error: hErr } = await supabaseAdmin
      .from('hiring_processes')
      .select('id, status, hiring_type, company_signed, candidate_signed, created_at')
      .eq('company_id', companyId);
    if (hErr) console.error('Hiring query error:', hErr);
    if (hiring?.length) {
      hiring.forEach(h => console.log(JSON.stringify(h, null, 2)));
    } else {
      console.log('NO HIRING PROCESSES FOUND');
    }
  }

  // 11. Check signed documents
  console.log('\n--- 11. SIGNED DOCUMENTS ---');
  if (companyId) {
    const { data: signedDocs, error: sdErr } = await supabaseAdmin
      .from('signed_documents')
      .select('id, category, signer_name, signed_at, template_id')
      .eq('company_id', companyId);
    if (sdErr) console.error('Signed docs query error:', sdErr);
    if (signedDocs?.length) {
      signedDocs.forEach(d => console.log(JSON.stringify(d, null, 2)));
    } else {
      console.log('NO SIGNED DOCUMENTS');
    }
  }

  // 12. Check notifications for user
  console.log('\n--- 12. NOTIFICATIONS ---');
  const userId = user?.id || companyUserId;
  if (userId) {
    const { data: notifs, error: nErr } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    if (nErr) console.error('Notification query error:', nErr);
    if (notifs?.length) {
      notifs.forEach(n => console.log(JSON.stringify(n, null, 2)));
    } else {
      console.log('NO NOTIFICATIONS');
    }
  }

  // 13. Check signing invitations
  console.log('\n--- 13. SIGNING INVITATIONS (by email) ---');
  const { data: signingInvs, error: siErr } = await supabaseAdmin
    .from('signing_invitations')
    .select('*')
    .eq('signer_email', EMAIL);
  if (siErr) console.error('Signing invitation query error:', siErr);
  if (signingInvs?.length) {
    signingInvs.forEach(s => console.log(JSON.stringify(s, null, 2)));
  } else {
    console.log('NO SIGNING INVITATIONS');
  }

  console.log('\n' + '='.repeat(80));
  console.log('INVESTIGATION COMPLETE');
  console.log('='.repeat(80));
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
