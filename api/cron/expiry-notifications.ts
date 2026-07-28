// Cron job: automatic expiry notifications for internal control (ANEC report
// items #17 and #18).
//
//  #17 — TCE (Termo de Compromisso de Estágio): the estágio's end_date is the
//        TCE deadline. When it falls within the warning window we alert the
//        agency (ANEC internal control) and the company so the TCE can be
//        renewed in time.
//  #18 — Life insurance (Seguro de Vida): alerts when insurance_expires_at is
//        within the window, or when insurance_status is still 'pending'
//        (never received). Same recipients.
//
// Idempotency: a daily cron must not re-notify the same hire every day. Before
// inserting we check for an existing notification for the SAME hire + category
// created within the last RENOTIFY_DAYS — so each hire is nudged at most once
// per window. No schema change needed.
//
// Runs daily. CRON_SECRET-gated.

import { createClient } from "@supabase/supabase-js";

const WARN_DAYS = 30;        // warn when expiry is within this many days
const RENOTIFY_DAYS = 25;    // don't re-notify the same hire+category within this window

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
    const today = new Date();
    const warnCutoff = new Date(today.getTime() + WARN_DAYS * 24 * 60 * 60 * 1000);
    const warnCutoffDate = warnCutoff.toISOString().slice(0, 10);
    const todayDate = today.toISOString().slice(0, 10);

    // Active hires whose TCE (end_date) or insurance is coming due.
    const { data: hires, error: findErr } = await supabase
      .from("hiring_processes")
      .select("id, hiring_type, status, end_date, insurance_status, insurance_expires_at, job:jobs(title), company:companies(id, user_id, company_name, agency_id), candidate:candidates(full_name)")
      .in("status", ["active", "paid", "completed"]);

    if (findErr) {
      console.error("[Cron expiry] query failed:", findErr.message);
      return res.status(500).json({ error: findErr.message });
    }

    let tceNotified = 0;
    let insuranceNotified = 0;

    for (const hire of hires || []) {
      const candidateName = (hire as any).candidate?.full_name || "o(a) estagiário(a)";
      const jobTitle = (hire as any).job?.title || "estágio";
      const recipients = await recipientsFor(supabase, hire);
      if (recipients.length === 0) continue;

      // #17 — TCE / end_date, estágio only.
      if (hire.hiring_type === "estagio" && hire.end_date &&
          hire.end_date >= todayDate && hire.end_date <= warnCutoffDate) {
        if (!(await alreadyNotified(supabase, hire.id, "tce"))) {
          await insertNotifications(supabase, recipients, {
            title: "Vencimento de TCE se aproximando",
            message: `O TCE de ${candidateName} (${jobTitle}) vence em ${formatBr(hire.end_date)}. Providencie a renovação do Termo de Compromisso de Estágio.`,
            type: "warning", related_to_type: "tce", related_to_id: hire.id,
          });
          tceNotified++;
        }
      }

      // #18 — Life insurance: expiring soon OR still pending (never received).
      const insuranceExpiringSoon = hire.insurance_expires_at &&
        hire.insurance_expires_at >= todayDate && hire.insurance_expires_at <= warnCutoffDate;
      const insurancePending = hire.hiring_type === "estagio" && hire.insurance_status === "pending";
      if (insuranceExpiringSoon || insurancePending) {
        if (!(await alreadyNotified(supabase, hire.id, "insurance"))) {
          const msg = insuranceExpiringSoon
            ? `O Seguro de Vida de ${candidateName} (${jobTitle}) vence em ${formatBr(hire.insurance_expires_at)}. Providencie a renovação da apólice.`
            : `O Seguro de Vida de ${candidateName} (${jobTitle}) está pendente. Registre a apólice do estagiário.`;
          await insertNotifications(supabase, recipients, {
            title: insuranceExpiringSoon ? "Vencimento de Seguro de Vida se aproximando" : "Seguro de Vida pendente",
            message: msg,
            type: "warning", related_to_type: "insurance", related_to_id: hire.id,
          });
          insuranceNotified++;
        }
      }
    }

    const summary = { scanned: hires?.length || 0, tceNotified, insuranceNotified };
    console.log("[Cron expiry] done:", JSON.stringify(summary));
    return res.status(200).json(summary);
  } catch (err: any) {
    console.error("[Cron expiry] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}

// Recipients = the company user + every agency/admin user of the company's
// agency (ANEC internal control).
async function recipientsFor(supabase: any, hire: any): Promise<string[]> {
  const ids = new Set<string>();
  if (hire.company?.user_id) ids.add(hire.company.user_id);
  const agencyId = hire.company?.agency_id;
  if (agencyId) {
    const { data: agencyUsers } = await supabase
      .from("users")
      .select("id")
      .eq("agency_id", agencyId)
      .in("role", ["agency", "admin", "super_admin"]);
    for (const u of agencyUsers || []) ids.add(u.id);
  }
  return Array.from(ids);
}

async function alreadyNotified(supabase: any, hireId: string, relatedType: string): Promise<boolean> {
  const since = new Date(Date.now() - RENOTIFY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("related_to_id", hireId)
    .eq("related_to_type", relatedType)
    .gte("created_at", since);
  return (count || 0) > 0;
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
  if (error) console.error("[Cron expiry] notify insert failed:", error.message);
}

function formatBr(dateStr: string): string {
  const [y, m, d] = String(dateStr).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
