// Cron job: Mark overdue payments
// Runs daily at 6 AM UTC via Vercel Cron
// Updates all pending payments past their due_date to 'overdue' status

import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("payments")
      .update({ status: "overdue" })
      .eq("status", "pending")
      .lt("due_date", now)
      .select("id");

    if (error) {
      console.error("[Cron] Failed to update overdue payments:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`[Cron] Marked ${data?.length || 0} payments as overdue`);
    return res.status(200).json({ updated: data?.length || 0 });
  } catch (err: any) {
    console.error("[Cron] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
