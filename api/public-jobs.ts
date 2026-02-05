import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Get optional contract type filter from query
    const contractType = req.query.contractType as string | undefined;

    let query = supabase
      .from("jobs")
      .select("id, title, contract_type, work_type, location, salary, work_schedule, published_at")
      .eq("status", "open")
      .order("published_at", { ascending: false });

    if (contractType) {
      query = query.eq("contract_type", contractType);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[public-jobs] Supabase error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json(data || []);
  } catch (err: any) {
    console.error("[public-jobs] Error:", err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}
