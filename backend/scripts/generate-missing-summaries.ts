// @ts-nocheck
/**
 * Generate summaries for existing companies and jobs that don't have them
 *
 * Usage: npx tsx backend/scripts/generate-missing-summaries.ts
 * Run from the root directory where .env file is located
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env before any other imports
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  // Dynamic imports after env is loaded
  const { supabaseAdmin } = await import("../supabase");
  const { generateCompanySummary, generateJobSummary } = await import("../services/ai/summarizer");

  console.log("Starting summary generation for existing records...\n");

  // Get companies without summaries
  const { data: companies, error: companiesError } = await supabaseAdmin
    .from("companies")
    .select("id, company_name, cnpj, industry, company_size, website, description, city, state, notes")
    .is("summary", null);

  if (companiesError) {
    console.error("Error fetching companies:", companiesError);
    return;
  }

  console.log(`Found ${companies?.length || 0} companies without summaries\n`);

  // Generate company summaries
  for (const company of companies || []) {
    try {
      console.log(`Generating summary for company: ${company.company_name}...`);

      // Get the company's first job for context
      const { data: jobs } = await supabaseAdmin
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
        await supabaseAdmin
          .from("companies")
          .update({
            summary,
            summary_generated_at: new Date().toISOString(),
          })
          .eq("id", company.id);

        console.log(`  ✓ Generated summary for ${company.company_name}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`  ✗ Failed to generate summary for ${company.company_name}:`, err);
    }
  }

  // Get jobs without summaries
  const { data: jobsWithoutSummary, error: jobsError } = await supabaseAdmin
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
    `)
    .is("summary", null);

  if (jobsError) {
    console.error("Error fetching jobs:", jobsError);
    return;
  }

  console.log(`\nFound ${jobsWithoutSummary?.length || 0} jobs without summaries\n`);

  // Generate job summaries
  for (const job of jobsWithoutSummary || []) {
    try {
      console.log(`Generating summary for job: ${job.title}...`);

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
        await supabaseAdmin
          .from("jobs")
          .update({
            summary,
            summary_generated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        console.log(`  ✓ Generated summary for ${job.title}`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error(`  ✗ Failed to generate summary for ${job.title}:`, err);
    }
  }

  console.log("\n✓ Summary generation complete!");
}

// Run the script
main().catch(console.error);
