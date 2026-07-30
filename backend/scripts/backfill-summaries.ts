// Generate the AI summary for every candidate and job that lacks one.
//
// The summarizer was only ever called at onboarding, and every existing record
// predates the model-id fix, so 275/275 candidates and 40/40 jobs had no summary.
// That matters beyond the profile card: the summary is the text an embedding gets
// built from, and it is the context the LLM re-ranker reads.
//
//   npx tsx backend/scripts/backfill-summaries.ts --dry-run
//   npx tsx backend/scripts/backfill-summaries.ts [--limit N]
import { createClient } from "@supabase/supabase-js";
import { generateCandidateSummary, generateJobSummary } from "../services/ai/summarizer";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const DRY = process.argv.includes("--dry-run");
const LIMIT = Number((process.argv.find(a => a.startsWith("--limit=")) || "").split("=")[1]) || 0;
const CONCURRENCY = 6;   // network-bound; keeps the laptop cool

async function pool<T>(items: T[], n: number, fn: (t: T, i: number) => Promise<void>) {
  let i = 0, done = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try { await fn(items[idx], idx); } catch (e: any) { console.log(`  ! ${e.message?.slice(0, 60)}`); }
      if (++done % 25 === 0) console.log(`    ...${done}/${items.length}`);
    }
  }));
}

(async () => {
  // ---- candidates ----
  let cq = sb.from("candidates")
    .select("id, full_name, city, state, education_level, skills, experience, disc_dominante, disc_influente, disc_estavel, disc_conforme, pdp_top_10_competencies, pdp_intrapersonal, pdp_interpersonal")
    .or("summary.is.null,summary.eq.");
  if (LIMIT) cq = cq.limit(LIMIT);
  const { data: cands, error: ce } = await cq;
  if (ce) throw ce;
  console.log(`candidates needing a summary: ${cands?.length ?? 0}${DRY ? " (dry run)" : ""}`);

  let cOk = 0;
  await pool(cands || [], CONCURRENCY, async (c: any) => {
    const s = await generateCandidateSummary({
      fullName: c.full_name, city: c.city, state: c.state, educationLevel: c.education_level,
      skills: c.skills, experience: c.experience,
      discDominante: c.disc_dominante, discInfluente: c.disc_influente,
      discEstavel: c.disc_estavel, discConforme: c.disc_conforme,
      pdpTop10Competencies: c.pdp_top_10_competencies,
      pdpIntrapersonal: c.pdp_intrapersonal, pdpInterpersonal: c.pdp_interpersonal,
    } as any);
    if (!s) return;
    if (!DRY) {
      const { error } = await sb.from("candidates")
        .update({ summary: s, summary_generated_at: new Date().toISOString() }).eq("id", c.id);
      if (error) throw new Error(`${c.full_name}: ${error.message}`);
    }
    cOk++;
  });
  console.log(`  candidates summarised: ${cOk}`);

  // ---- jobs ----
  let jq = sb.from("jobs")
    .select("id, title, description, contract_type, work_type, location, requirements, benefits, salary_min, companies(company_name)")
    .or("summary.is.null,summary.eq.");
  if (LIMIT) jq = jq.limit(LIMIT);
  const { data: jobs, error: je } = await jq;
  if (je) throw je;
  console.log(`jobs needing a summary: ${jobs?.length ?? 0}`);

  let jOk = 0;
  await pool(jobs || [], CONCURRENCY, async (j: any) => {
    const s = await generateJobSummary({
      title: j.title, description: j.description, contractType: j.contract_type,
      workType: j.work_type, city: j.location?.split(",")[0]?.trim(),
      state: j.location?.split(",")[1]?.trim(), requirements: j.requirements,
      benefits: j.benefits, salary: j.salary_min ? `R$ ${j.salary_min}` : undefined,
      companyName: j.companies?.company_name,
    } as any);
    if (!s) return;
    if (!DRY) {
      const { error } = await sb.from("jobs")
        .update({ summary: s, summary_generated_at: new Date().toISOString() }).eq("id", j.id);
      if (error) throw new Error(`${j.title}: ${error.message}`);
    }
    jOk++;
  });
  console.log(`  jobs summarised: ${jOk}`);
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
