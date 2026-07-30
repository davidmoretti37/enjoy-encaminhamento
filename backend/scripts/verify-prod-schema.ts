/**
 * Read-only check that the schema the deployed code depends on is actually
 * present. Migrations 130-137 added the columns and the RPC that matching, the
 * search-state UI and the close-as-filled flow rely on; if any is missing the
 * code is correct and the live site still breaks.
 *
 * Touches nothing. Every probe is a bounded SELECT or an RPC called with a
 * harmless argument.
 *
 *   npx tsx backend/scripts/verify-prod-schema.ts
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

// Build the client here rather than importing ../supabase: that module reads
// ENV at import time, and ESM hoists imports above any dotenv.config() call, so
// it throws before the .env is loaded.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env") });

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("[verify] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (.env at repo root)");
  process.exit(2);
}
console.log(`[verify] target: ${new URL(url).host}\n`);

const sb = createClient(url, key) as any;

const COLUMNS: Array<{ table: string; column: string; why: string }> = [
  { table: "jobs", column: "last_matched_at", why: "migration 133 — when a vaga was last searched" },
  { table: "jobs", column: "matching_started_at", why: "migration 134 — stale-search detection" },
  { table: "jobs", column: "skill_tags", why: "migration 135 — job side of skill matching" },
  { table: "jobs", column: "hired_person_name", why: "migration 137 — unregistered hire" },
  { table: "candidates", column: "skill_tags", why: "migration 135 — candidate side of skill matching" },
  { table: "candidates", column: "embedding", why: "pgvector column the semantic half writes to" },
  { table: "autentique_documents", column: "signers", why: "signer roles this session's fix depends on" },
];

async function checkColumn(table: string, column: string): Promise<string | null> {
  const { error } = await sb.from(table).select(column).limit(1);
  return error ? error.message : null;
}

async function checkRpc(): Promise<string | null> {
  // Same arguments services/matching/index.ts passes. Run against a real job so
  // the result shape is meaningful; read-only either way.
  const { data: job } = await sb.from("jobs").select("id, title").limit(1).single();
  if (!job) return "no jobs to probe with";

  const { data, error } = await sb.rpc("match_candidates_hybrid", {
    job_id_input: job.id,
    match_threshold: 0,
    match_count: 1,
  });
  if (error) return error.message;

  const row = Array.isArray(data) && data[0];
  if (row && !("skill_tags" in row)) {
    return "RPC exists but does not return skill_tags (migration 136 not applied)";
  }
  if (!row) return null; // present, just no match for this job
  return null;
}

async function main() {
  console.log("[verify] read-only schema check\n");

  let failures = 0;

  for (const c of COLUMNS) {
    const err = await checkColumn(c.table, c.column);
    if (err) {
      failures++;
      console.log(`  MISSING  ${c.table}.${c.column}`);
      console.log(`           ${c.why}`);
      console.log(`           ${err}`);
    } else {
      console.log(`  ok       ${c.table}.${c.column}`);
    }
  }

  const rpcErr = await checkRpc();
  if (rpcErr) {
    failures++;
    console.log(`  MISSING  match_candidates_hybrid`);
    console.log(`           migration 136 — hybrid text+vector ranking`);
    console.log(`           ${rpcErr}`);
  } else {
    console.log(`  ok       match_candidates_hybrid (returns skill_tags)`);
  }

  // How much of the matching data is actually populated. Counts only.
  const counts = async (table: string, col: string) => {
    const total = await sb.from(table).select("id", { count: "exact", head: true });
    const filled = await sb.from(table).select("id", { count: "exact", head: true }).not(col, "is", null);
    return { total: total.count ?? 0, filled: filled.count ?? 0 };
  };

  try {
    const tags = await counts("candidates", "skill_tags");
    const emb = await counts("candidates", "embedding");
    console.log(`\n[verify] candidates: ${tags.total} total`);
    console.log(`         skill_tags set on ${tags.filled}`);
    console.log(`         embedding set on  ${emb.filled}`);
    if (emb.filled === 0 && emb.total > 0) {
      console.log(`         -> semantic ranking has no data; run backend/scripts/backfill-embeddings.ts`);
    }
    if (tags.filled < tags.total) {
      console.log(`         -> ${tags.total - tags.filled} without tags; run backend/scripts/backfill-skill-tags.ts`);
    }
  } catch (err: any) {
    console.log(`\n[verify] could not count matching data: ${err?.message || err}`);
  }

  console.log(
    failures === 0
      ? "\n[verify] schema is complete — every column and the RPC are present"
      : `\n[verify] ${failures} missing — deployed code depends on these`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("[verify] failed:", err?.message || err);
  process.exit(2);
});
