/**
 * Repair hiring-contract documents whose Autentique signers were stored with
 * role "unknown".
 *
 * configureAndSendContract used to pair Autentique's response back to our roles
 * by email. createDocument omits emails on purpose (so the signing link comes
 * back in the response rather than by mail), so the match never succeeded and
 * every signer on that path was written as role "unknown".
 *
 * Two things depended on that role, and both are now stricter:
 *   - confirmCompanyAutentiqueSign looks the company up by role
 *   - getDocumentsToSign refuses to infer signature flags from a document whose
 *     roles are unresolved (previously it read a missing role as "this party is
 *     not required" and marked a hire fully signed off a single signature)
 *
 * Being stricter is correct, but it would leave already-created documents unable
 * to advance. This backfills their roles using the same name-first matching the
 * live code now uses, reconstructing the signer list in the exact order
 * configureAndSendContract builds it.
 *
 * Dry run by default. Pass --apply to write.
 *
 *   npx tsx backend/scripts/repair-autentique-signer-roles.ts
 *   npx tsx backend/scripts/repair-autentique-signer-roles.ts --apply
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { mapSignersToRoles } from "../integrations/autentique";

// Own client rather than importing ../supabase: that module reads ENV at import
// time, and ESM hoists imports above dotenv.config(), so it throws first.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env") });

const APPLY = process.argv.includes("--apply");

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("[repair] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (.env at repo root)");
  process.exit(2);
}

const sb = createClient(url, key) as any;

type StoredSigner = {
  role?: string;
  email?: string | null;
  name?: string;
  autentiqueSignerId?: string;
  signUrl?: string;
  signed_at?: string | null;
};

async function main() {
  console.log(`[repair] ${APPLY ? "APPLY" : "DRY RUN"} — hiring_contract signer roles`);
  console.log(`[repair] target: ${new URL(url!).host}\n`);

  const { data: docs, error } = await sb
    .from("autentique_documents")
    .select("id, document_name, context_id, signers, status")
    .eq("context_type", "hiring_contract");

  if (error) throw error;
  if (!docs?.length) {
    console.log("[repair] no hiring_contract documents found");
    return;
  }

  const needsWork = docs.filter((d: any) =>
    (d.signers || []).some((s: StoredSigner) => !s.role || s.role === "unknown"),
  );

  console.log(`[repair] ${docs.length} document(s), ${needsWork.length} with unresolved roles\n`);
  if (!needsWork.length) return;

  // One hiring process can own several documents; resolve each process once.
  const partiesCache = new Map<string, Array<{ email: string; name: string; role: string }>>();

  const partiesFor = async (hiringProcessId: string) => {
    if (partiesCache.has(hiringProcessId)) return partiesCache.get(hiringProcessId)!;

    const { data: hp } = await sb
      .from("hiring_processes")
      .select("id, company_id, candidate_id")
      .eq("id", hiringProcessId)
      .single();

    const parties: Array<{ email: string; name: string; role: string }> = [];
    if (hp) {
      const { data: company } = await sb
        .from("companies")
        .select("email, company_name")
        .eq("id", hp.company_id)
        .single();
      const { data: candidate } = await sb
        .from("candidates")
        .select(
          "email, full_name, parent_guardian_email, parent_guardian_name, educational_institution_email, educational_institution_name",
        )
        .eq("id", hp.candidate_id)
        .single();

      // Same order as configureAndSendContract, so positional fallback lines up.
      if (company?.email) {
        parties.push({ email: company.email, name: company.company_name || "Empresa", role: "company" });
      }
      if (candidate?.email) {
        parties.push({ email: candidate.email, name: candidate.full_name || "Candidato", role: "candidate" });
      }
      if (candidate?.parent_guardian_email) {
        parties.push({
          email: candidate.parent_guardian_email,
          name: candidate.parent_guardian_name || "Responsável",
          role: "parent_guardian",
        });
      }
      if (candidate?.educational_institution_email) {
        parties.push({
          email: candidate.educational_institution_email,
          name: candidate.educational_institution_name || "Instituição",
          role: "educational_institution",
        });
      }
    }

    partiesCache.set(hiringProcessId, parties);
    return parties;
  };

  let repaired = 0;
  let skipped = 0;

  for (const doc of needsWork) {
    const parties = await partiesFor(doc.context_id);
    if (!parties.length) {
      console.log(`  SKIP ${doc.document_name} — could not resolve the hiring process parties`);
      skipped++;
      continue;
    }

    const stored: StoredSigner[] = doc.signers || [];
    const mapped = mapSignersToRoles(
      parties,
      stored.map((s) => ({
        public_id: s.autentiqueSignerId || "",
        name: s.name || "",
        email: s.email ?? null,
        signUrl: s.signUrl || "",
      })),
    );

    // Never lose a recorded signature: signed_at is the evidence someone signed.
    const merged = stored.map((s, i) => ({
      ...s,
      role: mapped[i]?.role && mapped[i].role !== "unknown" ? mapped[i].role : s.role || "unknown",
      email: s.email ?? mapped[i]?.email ?? null,
      signed_at: s.signed_at ?? null,
    }));

    const stillUnknown = merged.filter((s) => !s.role || s.role === "unknown").length;
    const before = stored.map((s) => s.role || "unknown").join(", ");
    const after = merged.map((s) => s.role).join(", ");

    if (before === after) {
      skipped++;
      continue;
    }

    console.log(`  ${doc.document_name}`);
    console.log(`    hiring process ${doc.context_id}`);
    console.log(`    before: ${before}`);
    console.log(`    after : ${after}${stillUnknown ? `  (${stillUnknown} still unknown)` : ""}`);

    if (APPLY) {
      const { error: upErr } = await sb
        .from("autentique_documents")
        .update({ signers: merged })
        .eq("id", doc.id);
      if (upErr) {
        console.error(`    FAILED: ${upErr.message}`);
        continue;
      }
    }
    repaired++;
  }

  console.log(
    `\n[repair] ${APPLY ? "updated" : "would update"} ${repaired} document(s); ${skipped} unchanged/skipped`,
  );
  if (!APPLY && repaired > 0) console.log("[repair] re-run with --apply to write");
}

main().catch((err) => {
  console.error("[repair] failed:", err);
  process.exit(1);
});
