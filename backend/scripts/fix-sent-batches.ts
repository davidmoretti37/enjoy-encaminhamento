/**
 * One-off: Reset batch back to "forwarded" so user can redo the interview scheduling flow.
 * The previous click only marked candidates without creating an interview session.
 *
 * Usage: npx tsx backend/scripts/fix-sent-batches.ts
 */
import "dotenv/config";
import { supabaseAdmin } from "../supabase";

async function main() {
  const { data, error } = await (supabaseAdmin
    .from("candidate_batches") as any)
    .update({
      status: "forwarded",
      selected_candidate_ids: null,
      selection_completed_at: null,
    })
    .eq("status", "meeting_scheduled")
    .select("id, status");

  if (error) {
    console.error("Error:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`Reset ${data.length} batch(es) back to "forwarded":`);
    for (const b of data as any[]) {
      console.log(`  - ${b.id} → ${b.status}`);
    }
  } else {
    console.log("No batches to reset.");
  }
}

main();
