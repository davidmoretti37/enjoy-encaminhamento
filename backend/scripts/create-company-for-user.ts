/**
 * Utility script to create a company record for an existing user
 *
 * Usage: npx ts-node scripts/create-company-for-user.ts <email> <company_name>
 * Example: npx ts-node scripts/create-company-for-user.ts davidmoretti37@gmail.com "David Moretti Company"
 */

import { createCompanyForExistingUser } from '../db';

async function main() {
  const email = process.argv[2];
  const companyName = process.argv[3];

  if (!email || !companyName) {
    console.log('Usage: npx ts-node scripts/create-company-for-user.ts <email> <company_name>');
    console.log('Example: npx ts-node scripts/create-company-for-user.ts davidmoretti37@gmail.com "David Moretti Company"');
    process.exit(1);
  }

  console.log(`Creating company for user: ${email}`);
  console.log(`Company name: ${companyName}`);

  try {
    const company = await createCompanyForExistingUser(email, companyName);

    if (company) {
      console.log('\n✅ Company created successfully!');
      console.log('Company ID:', company.id);
      console.log('Company Name:', company.company_name);
      console.log('Email:', company.email);
      console.log('Status:', company.status);
    } else {
      console.error('\n❌ Failed to create company. Check the logs above for details.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
