// Cron job: monthly-report reminders (ANEC report item #21).
//
// The company fills a "Relatório Mensal" for each active intern (persisted to the
// `feedback` table, keyed by contract_id + review_month + review_year). Companies
// don't fill it unless nudged. This job runs early each month and, for the PREVIOUS
// month's period, checks each active estágio contract:
//   - if no report was submitted → remind the company to fill it, AND alert the
//     agency (ANEC) that the company hasn't submitted, so the team can follow up.
//
// Scheduled monthly (see vercel.json), so there is no daily-spam concern — each
// missing report produces exactly one reminder + one ANEC alert per month.
//
// CRON_SECRET-gated.

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
    // Target the PREVIOUS month (the period the report should now exist for).
    const now = new Date();
    let month = now.getUTCMonth(); // 0-11 → previous month is this value (getUTCMonth is 0-based, so "this - 1 + 1")
    let year = now.getUTCFullYear();
    if (month === 0) { month = 12; year -= 1; } // Jan → Dec of last year
    // month is now 1-12 for the previous calendar month.

    const { data: hires, error: findErr } = await supabase
      .from("hiring_processes")
      .select("id, contract_id, hiring_type, status, job:jobs(title), company:companies(id, user_id, company_name, agency_id), candidate:candidates(full_name)")
      .eq("hiring_type", "estagio")
      .in("status", ["active", "paid", "completed"]);

    if (findErr) {
      console.error("[Cron monthly-report] query failed:", findErr.message);
      return res.status(500).json({ error: findErr.message });
    }

    let reminded = 0;
    let alreadyOk = 0;

    for (const hire of hires || []) {
      const contractId = (hire as any).contract_id;
      if (!contractId) continue; // no contract row → can't key a report

      // Was a report already submitted for this contract + period?
      const { count } = await supabase
        .from("feedback")
        .select("id", { count: "exact", head: true })
        .eq("contract_id", contractId)
        .eq("review_month", month)
        .eq("review_year", year);
      if ((count || 0) > 0) { alreadyOk++; continue; }

      // Dedup: don't re-alert if we already flagged this contract+period this run/month.
      if (await alreadyNotified(supabase, contractId, month, year)) { continue; }

      const candidateName = (hire as any).candidate?.full_name || "o(a) estagiário(a)";
      const companyName = (hire as any).company?.company_name || "a empresa";
      const periodLabel = `${String(month).padStart(2, "0")}/${year}`;
      const relatedId = contractId;

      // Reminder to the company user.
      const companyUserId = (hire as any).company?.user_id;
      if (companyUserId) {
        await insertNotifications(supabase, [companyUserId], {
          title: "Relatório mensal pendente",
          message: `O relatório mensal de ${candidateName} referente a ${periodLabel} ainda não foi enviado. Preencha-o no portal.`,
          type: "warning", related_to_type: "report", related_to_id: relatedId,
        });
      }

      // Alert the agency (ANEC internal control) about the missing report.
      const agencyId = (hire as any).company?.agency_id;
      if (agencyId) {
        const { data: agencyUsers } = await supabase
          .from("users").select("id").eq("agency_id", agencyId).in("role", ["agency", "admin", "super_admin"]);
        const ids = (agencyUsers || []).map((u: any) => u.id);
        if (ids.length > 0) {
          await insertNotifications(supabase, ids, {
            title: "Relatório mensal não enviado",
            message: `${companyName} ainda não enviou o relatório mensal de ${candidateName} (${periodLabel}).`,
            type: "warning", related_to_type: "report", related_to_id: relatedId,
          });
        }
      }
      reminded++;
    }

    const summary = { scanned: hires?.length || 0, reminded, alreadyOk, period: `${month}/${year}` };
    console.log("[Cron monthly-report] done:", JSON.stringify(summary));
    return res.status(200).json(summary);
  } catch (err: any) {
    console.error("[Cron monthly-report] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// One reminder per contract+period: skip if a report notification for this
// contract already went out this calendar month.
async function alreadyNotified(supabase: any, contractId: string, month: number, year: number): Promise<boolean> {
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const { data } = await supabase
    .from("notifications")
    .select("id, message")
    .eq("related_to_id", contractId)
    .eq("related_to_type", "report")
    .gte("created_at", monthStart);
  const tag = `${String(month).padStart(2, "0")}/${year}`;
  return (data || []).some((n: any) => (n.message || "").includes(tag));
}

async function insertNotifications(
  supabase: any,
  userIds: string[],
  n: { title: string; message: string; type: string; related_to_type: string; related_to_id: string },
) {
  const rows = userIds.map((user_id) => ({
    user_id, title: n.title, message: n.message, type: n.type,
    related_to_type: n.related_to_type, related_to_id: n.related_to_id, is_read: false,
  }));
  const { error } = await supabase.from("notifications").insert(rows);
  if (error) console.error("[Cron monthly-report] notify insert failed:", error.message);
}
