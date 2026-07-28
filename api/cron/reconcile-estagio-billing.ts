// Cron job: reconcile estágio hires whose recurring billing never completed.
//
// The completion_processed_at marker is set when estágio billing SUCCEEDS and
// released back to NULL when it fails (see api/webhooks/autentique.ts and
// hiring.ts handleEstagioSignaturesComplete). Migration 119 backfilled the marker
// for every pre-existing active hire, so the ONLY estágio hires with
// status='active' AND completion_processed_at IS NULL are ones whose billing never
// landed — a batch-insert failure after the marker CAS was won, or an all-Autentique
// completion whose single webhook delivery failed (Autentique won't redeliver: the
// event_id is already deduped). This job re-runs the SAME marker-CAS billing for
// them, so it is naturally idempotent and can never double-bill a hire that already
// has its payments (that hire's marker is set → excluded).
//
// Runs daily. CRON_SECRET-gated. No payment attribution / no schema change needed:
// the marker itself is the "billing done" flag.

import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // 30-minute floor on updated_at avoids racing a completion that is billing
    // right now (the completion handler sets the marker synchronously).
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: stuck, error: findErr } = await supabase
      .from("hiring_processes")
      .select("*, company:companies(id, user_id, company_name, email), candidate:candidates(id, user_id, full_name, email), job:jobs(title)")
      .eq("hiring_type", "estagio")
      .in("status", ["active", "paid", "completed"])
      .is("completion_processed_at", null)
      .lt("updated_at", cutoff);

    if (findErr) {
      console.error("[Cron reconcile] query failed:", findErr.message);
      return res.status(500).json({ error: findErr.message });
    }

    const reconciled: string[] = [];
    const skipped: string[] = [];
    const failed: string[] = [];

    for (const process of stuck || []) {
      // Win the marker CAS — same compare-and-set every completion path uses, so a
      // concurrent completion can't also bill this hire.
      const { data: won } = await supabase
        .from("hiring_processes")
        .update({ completion_processed_at: new Date().toISOString() })
        .eq("id", process.id)
        .is("completion_processed_at", null)
        .select("id");
      if (!won || won.length === 0) { skipped.push(process.id); continue; }

      try {
        await billEstagio(supabase, process);
        await notifyComplete(supabase, process);
        reconciled.push(process.id);
        console.log(`[Cron reconcile] billed stuck estágio hire ${process.id}`);
      } catch (err: any) {
        // Release the marker for a future retry ONLY if nothing landed. If rows
        // exist despite the error, the atomic batch insert committed — keep the
        // marker (releasing would double-bill on the next run). The unique index
        // (migration 120) is the final backstop regardless.
        const { count } = await supabase.from("payments").select("*", { count: "exact", head: true })
          .eq("hiring_process_id", process.id).eq("payment_type", "monthly-fee");
        if (!count) {
          await supabase.from("hiring_processes").update({ completion_processed_at: null }).eq("id", process.id);
          failed.push(process.id);
          console.error(`[Cron reconcile] billing hire ${process.id} FAILED (0 rows), marker released:`, err?.message);
        } else {
          reconciled.push(process.id);
          console.error(`[Cron reconcile] hire ${process.id} threw but ${count} rows exist — kept marker, no double-bill:`, err?.message);
        }
      }
    }

    const summary = { scanned: stuck?.length || 0, reconciled: reconciled.length, skipped: skipped.length, failed: failed.length };
    console.log("[Cron reconcile] done:", JSON.stringify(summary));
    return res.status(200).json({ ...summary, reconciledIds: reconciled, failedIds: failed });
  } catch (err: any) {
    console.error("[Cron reconcile] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// Mirrors api/webhooks/autentique.ts generateEstagioBilling — ONE all-or-nothing
// batch insert of the monthly-fee schedule (throws on failure so the caller can
// release the marker). Sets job_id for downstream attribution (column exists).
async function billEstagio(supabase: any, process: any) {
  // Due dates from calendar parts (see webhook generateEstagioBilling) — avoids the
  // UTC-parse + setMonth day-overflow that made duplicate/skipped billing periods.
  const [baseYear, baseMonth1, baseDay] = String(process.start_date).slice(0, 10).split("-").map(Number);
  const baseMonth0 = (baseMonth1 || 1) - 1;
  const paymentDay = Math.min(process.payment_day || baseDay || 5, 28); // clamp <=28 so no month has >28 days -> no setMonth overflow -> distinct periods
  const monthlyFee = process.calculated_fee;
  const durationMonths = process.contract_duration_months || 12;
  const candidateName = process.candidate?.full_name || "candidato";
  const companyId = process.company?.id;

  const payments: any[] = [];
  for (let i = 0; i < durationMonths; i++) {
    const due = new Date(baseYear, baseMonth0 + i, paymentDay);
    payments.push({
      contract_id: process.contract_id || null,
      company_id: companyId,
      job_id: process.job_id || null,
      hiring_process_id: process.id,
      amount: monthlyFee,
      payment_type: "monthly-fee",
      due_date: due.toISOString(),
      status: "pending",
      billing_period: `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}`,
      notes: `Taxa mensal estágio - ${candidateName}`,
    });
  }
  const { error } = await supabase.from("payments").insert(payments);
  if (error) throw new Error(`estágio billing insert failed: ${error.message}`);
}

async function notifyComplete(supabase: any, process: any) {
  const jobTitle = process.job?.title || "a vaga";
  const candidateName = process.candidate?.full_name || "o candidato";
  const rows: any[] = [];
  if (process.company?.user_id) {
    rows.push({ user_id: process.company.user_id, title: "Contratação concluída!",
      message: `O contrato de ${candidateName} para "${jobTitle}" foi finalizado.`,
      type: "success", related_to_type: "hiring", related_to_id: process.id, is_read: false });
  }
  if (process.candidate?.user_id) {
    rows.push({ user_id: process.candidate.user_id, title: "Você foi contratado!",
      message: `Seu contrato para "${jobTitle}" foi finalizado. Parabéns!`,
      type: "success", related_to_type: "hiring", related_to_id: process.id, is_read: false });
  }
  if (rows.length === 0) return;
  const { error } = await supabase.from("notifications").insert(rows);
  if (error) console.error("[Cron reconcile] notify insert failed:", error.message);
}
