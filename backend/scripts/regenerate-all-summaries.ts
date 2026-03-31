/**
 * Force regenerate ALL summaries for companies and jobs
 * This will overwrite existing summaries with the updated prompt
 *
 * Usage: npx tsx backend/scripts/regenerate-all-summaries.ts
 * Run from the root directory where .env file is located
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env before any other imports
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  // Dynamic imports after env is loaded
  const { supabaseAdmin } = await import("../supabase");
  const sb = supabaseAdmin as any;
  const { generateCompanySummary, generateJobSummary } = await import("../services/ai/summarizer");

  console.log("Starting FORCE regeneration of ALL summaries...\n");

  // Get ALL companies (not just those without summaries)
  const { data: companies, error: companiesError } = await sb
    .from("companies")
    .select("id, company_name, cnpj, industry, company_size, website, description, city, state, notes");

  if (companiesError) {
    console.error("Error fetching companies:", companiesError);
    return;
  }

  console.log(`Found ${companies?.length || 0} companies to regenerate\n`);

  // Generate company summaries
  for (const company of companies || []) {
    try {
      console.log(`Regenerating summary for company: ${company.company_name}...`);

      // Get the company's first job for context
      const { data: jobs } = await sb
        .from("jobs")
        .select("title, description, contract_type, work_type, salary, benefits, requirements")
        .eq("company_id", company.id)
        .limit(1);

      const firstJob = jobs?.[0];

      const summary = await generateCompanySummary({
        companyName: company.company_name,
        cnpj: company.cnpj,
        industry: company.industry,
        companySize: company.company_size,
        website: company.website,
        description: company.description,
        city: company.city,
        state: company.state,
        jobTitle: firstJob?.title,
        contractType: firstJob?.contract_type,
        workType: firstJob?.work_type,
        mainActivities: firstJob?.description,
        requiredSkills: firstJob?.requirements,
        notes: company.notes,
      });

      if (summary) {
        await sb
          .from("companies")
          .update({
            summary,
            summary_generated_at: new Date().toISOString(),
          })
          .eq("id", company.id);

        console.log(`  ✓ Regenerated summary for ${company.company_name}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`  ✗ Failed to regenerate summary for ${company.company_name}:`, err);
    }
  }

  // Get ALL jobs
  const { data: allJobs, error: jobsError } = await sb
    .from("jobs")
    .select(`
      id,
      title,
      description,
      contract_type,
      work_type,
      location,
      salary,
      benefits,
      requirements,
      companies!inner(company_name)
    `);

  if (jobsError) {
    console.error("Error fetching jobs:", jobsError);
    return;
  }

  console.log(`\nFound ${allJobs?.length || 0} jobs to regenerate\n`);

  // Generate job summaries
  for (const job of allJobs || []) {
    try {
      console.log(`Regenerating summary for job: ${job.title}...`);

      const summary = await generateJobSummary({
        title: job.title,
        description: job.description || '',
        contractType: job.contract_type,
        workType: job.work_type,
        city: job.location?.split(',')[0]?.trim(),
        state: job.location?.split(',')[1]?.trim(),
        requirements: job.requirements,
        benefits: Array.isArray(job.benefits) ? job.benefits.join(', ') : job.benefits,
        salary: job.salary ? `R$ ${job.salary}` : undefined,
        companyName: (job.companies as any)?.company_name,
      });

      if (summary) {
        await sb
          .from("jobs")
          .update({
            summary,
            summary_generated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        console.log(`  ✓ Regenerated summary for ${job.title}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`  ✗ Failed to regenerate summary for ${job.title}:`, err);
    }
  }

  console.log("\n✓ All summaries regenerated!");
}

// Run the script
main().catch(console.error);
