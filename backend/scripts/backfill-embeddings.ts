// Generate pgvector embeddings for every candidate and job that has a summary.
//
// The semantic factor was scoring on Postgres full-text ranking alone, which only
// matches shared words. Embeddings compare meaning, so "atendimento ao publico"
// and "lida com clientes" finally count as related.
//
//   npx tsx backend/scripts/backfill-embeddings.ts --dry-run
//   npx tsx backend/scripts/backfill-embeddings.ts
import { createClient } from "@supabase/supabase-js";
import { generateEmbeddings, formatEmbeddingForPostgres, EMBEDDING_MODEL } from "../services/ai/embeddings";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const DRY = process.argv.includes("--dry-run");
const BATCH = 32;

async function run(table: "candidates" | "jobs", label: string) {
  const { data, error } = await sb.from(table)
    .select("id, summary")
    .not("summary", "is", null).neq("summary", "")
    .is("embedding", null);
  if (error) throw error;
  const rows = (data || []) as { id: string; summary: string }[];
  console.log(`\n${label}: ${rows.length} need an embedding${DRY ? " (dry run)" : ""}`);

  let ok = 0, skipped = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const vecs = await generateEmbeddings(chunk.map(r => r.summary));
    for (let k = 0; k < chunk.length; k++) {
      const vec = vecs[k];
      if (!vec) { skipped++; continue; }
      if (!DRY) {
        const { error: upErr } = await sb.from(table)
          .update({ embedding: formatEmbeddingForPostgres(vec) })
          .eq("id", chunk[k].id);
        if (upErr) { console.log(`  ! ${chunk[k].id}: ${upErr.message.slice(0, 70)}`); skipped++; continue; }
      }
      ok++;
    }
    console.log(`  ...${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log(`  embedded: ${ok}   skipped: ${skipped}`);
}

(async () => {
  console.log(`model: ${EMBEDDING_MODEL}`);
  await run("candidates", "candidates");
  await run("jobs", "jobs");
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
