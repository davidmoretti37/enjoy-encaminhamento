// Webhook handler for Autentique digital signature events
// Receives events when documents are viewed, signed, rejected, or completed
// Deployed as a standalone Vercel serverless function

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// ============================================
// AUTHENTICITY CHECK
// ============================================

/**
 * Verify the request genuinely came from Autentique before acting on it.
 * Autentique webhooks are configured with a shared secret embedded in the
 * URL (?secret=) and/or sent as a header; we accept either, compared in
 * constant time.
 *
 * Behaviour:
 *  - secret configured + request presents matching secret  -> allowed
 *  - secret configured + missing/wrong secret              -> rejected (401)
 *  - secret NOT configured                                 -> allowed, but a
 *    CRITICAL warning is logged. This keeps the deploy from breaking signing
 *    if the env var hasn't been set yet; the moment AUTENTIQUE_WEBHOOK_SECRET
 *    is set (in BOTH the Vercel env and the Autentique webhook config) forged
 *    events start getting rejected. Set it — until then this endpoint is
 *    unauthenticated and anyone can forge "signed" events.
 */
function isAuthenticWebhook(req: any): boolean {
  const expected = process.env.AUTENTIQUE_WEBHOOK_SECRET || "";
  if (!expected) {
    console.error(
      "[Webhook] SECURITY: AUTENTIQUE_WEBHOOK_SECRET is not set — set it in the Vercel env AND the Autentique webhook configuration. Until then this endpoint is UNAUTHENTICATED."
    );
    // Allow through until the secret is configured, so shipping this before the
    // env var is set does NOT break live signing. The moment
    // AUTENTIQUE_WEBHOOK_SECRET is set (in BOTH Vercel and the Autentique webhook
    // config), the check below enforces it and forged events are rejected. SET IT.
    return true;
  }

  const provided =
    (req.query?.secret as string) ||
    (req.query?.token as string) ||
    (req.headers?.["x-webhook-secret"] as string) ||
    (req.headers?.["x-autentique-secret"] as string) ||
    "";

  // Constant-time compare; length check first so timingSafeEqual never throws
  // on mismatched buffer lengths.
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

// ============================================
// SUPABASE CLIENT
// ============================================

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handle signature.accepted - A signer has signed
 */
async function handleSignatureAccepted(supabase: any, eventData: any) {
  const document = eventData.object?.document || eventData.object;
  const signature = eventData.object?.signature || eventData.object;

  const autentiqueDocId = document?.id;
  const signerPublicId = signature?.public_id;
  const signerEmail = signature?.email;

  if (!autentiqueDocId) {
    console.warn("[Webhook] signature.accepted missing document ID");
    return;
  }

  console.log(`[Webhook] Signature accepted: doc=${autentiqueDocId}, signer=${signerEmail || signerPublicId}`);

  // Look up our tracking record
  const { data: doc, error: docError } = await supabase
    .from("autentique_documents")
    .select("*")
    .eq("autentique_document_id", autentiqueDocId)
    .single();

  if (docError || !doc) {
    console.warn(`[Webhook] No tracking record for Autentique document: ${autentiqueDocId}`, docError?.message);
    return;
  }

  // Find the signer in our signers array
  const signers = doc.signers || [];
  const signerIndex = signers.findIndex(
    (s: any) => s.autentique_signer_id === signerPublicId || s.email === signerEmail
  );

  if (signerIndex === -1) {
    console.warn(`[Webhook] Signer not found in our records: ${signerPublicId || signerEmail}`);
    return;
  }

  // Idempotent: skip if already signed
  if (signers[signerIndex].signed_at) {
    console.log(`[Webhook] Signer already recorded as signed, skipping`);
    return;
  }

  // Update the signer status ATOMICALLY (single UPDATE via RPC) so a concurrent
  // signature.accepted for a different signer on the same document can't clobber
  // this write. Keep the local mutation for the downstream "all signed?" logic.
  const signedAt = new Date().toISOString();
  const signer = signers[signerIndex];
  signer.signed_at = signedAt;

  const { error: updateError } = await supabase.rpc("mark_autentique_signer_signed", {
    p_autentique_document_id: autentiqueDocId,
    p_signer_public_id: signerPublicId || null,
    p_signer_email: signerEmail || null,
    p_signed_at: signedAt,
  });

  if (updateError) {
    console.error(`[Webhook] Failed to update signer status:`, updateError.message);
  }

  // Update signing_invitations if applicable
  if (doc.context_type === "hiring_contract") {
    try {
      const { data: invitations } = await supabase
        .from("signing_invitations")
        .select("*")
        .eq("autentique_signer_id", signerPublicId);

      if (invitations && invitations.length > 0) {
        await supabase
          .from("signing_invitations")
          .update({ signed_at: new Date().toISOString() })
          .eq("autentique_signer_id", signerPublicId)
          .is("signed_at", null);
      }

      // Update hiring_processes signature flags based on role
      await updateHiringSignatureFlag(supabase, doc.context_id, signer.role, signer.name, signer.email);
    } catch (err: any) {
      console.error(`[Webhook] Error updating hiring data:`, err.message);
    }
  }

  // Create notification (non-critical)
  try {
    await createSignatureNotification(supabase, doc, signer);
  } catch (err: any) {
    console.error(`[Webhook] Error creating notification:`, err.message);
  }
}

/**
 * Handle document.finished - All signers have signed
 */
async function handleDocumentFinished(supabase: any, eventData: any) {
  const document = eventData.object || {};
  const autentiqueDocId = document.id;

  if (!autentiqueDocId) {
    console.warn("[Webhook] document.finished missing document ID");
    return;
  }

  console.log(`[Webhook] Document finished: ${autentiqueDocId}`);

  // Get our tracking record
  const { data: doc, error: docError } = await supabase
    .from("autentique_documents")
    .select("*")
    .eq("autentique_document_id", autentiqueDocId)
    .single();

  if (docError || !doc) {
    console.warn(`[Webhook] No tracking record for finished document: ${autentiqueDocId}`, docError?.message);
    return;
  }

  // Idempotent: skip if already marked signed
  if (doc.status === "signed") {
    console.log(`[Webhook] Document already marked as signed, skipping`);
    return;
  }

  // Get signed PDF URL from Autentique
  const signedPdfUrl = document.files?.signed || null;

  // Update document status
  const { error: updateError } = await supabase
    .from("autentique_documents")
    .update({
      status: "signed",
      signed_pdf_url: signedPdfUrl,
    })
    .eq("autentique_document_id", autentiqueDocId);

  if (updateError) {
    console.error(`[Webhook] Failed to update document status:`, updateError.message);
    return;
  }

  // Check if all documents for this context are now complete
  const { data: allDocs } = await supabase
    .from("autentique_documents")
    .select("status")
    .eq("context_type", doc.context_type)
    .eq("context_id", doc.context_id);

  const allSigned = allDocs && allDocs.every((d: any) => d.status === "signed");

  if (!allSigned) {
    console.log(`[Webhook] Not all documents complete yet for ${doc.context_type}:${doc.context_id}`);
    return;
  }

  console.log(`[Webhook] All documents complete for ${doc.context_type}:${doc.context_id}`);

  // Trigger context-specific completion logic
  try {
    if (doc.context_type === "outreach_contract") {
      await handleOutreachContractComplete(supabase, doc.context_id);
    } else if (doc.context_type === "hiring_contract") {
      await handleHiringContractComplete(supabase, doc.context_id);
    } else if (doc.context_type === "onboarding_contract") {
      await handleOnboardingContractComplete(supabase, doc.context_id);
    }
  } catch (err: any) {
    console.error(`[Webhook] Error in completion handler:`, err.message);
  }
}

/**
 * Handle signature.rejected - A signer refused
 */
async function handleSignatureRejected(supabase: any, eventData: any) {
  const document = eventData.object?.document || eventData.object;
  const signature = eventData.object?.signature || eventData.object;

  const autentiqueDocId = document?.id;
  const signerEmail = signature?.email;
  const reason = signature?.rejected?.reason || "Não informado";

  console.log(`[Webhook] Signature rejected: doc=${autentiqueDocId}, signer=${signerEmail}, reason=${reason}`);

  if (!autentiqueDocId) return;

  // SIGN-8: never revert an already-signed document back to "refused".
  const { data: existingDoc } = await supabase
    .from("autentique_documents")
    .select("status")
    .eq("autentique_document_id", autentiqueDocId)
    .single();

  if (existingDoc?.status === "signed") {
    console.log(`[Webhook] Document already signed, ignoring rejection: ${autentiqueDocId}`);
    return;
  }

  const { error } = await supabase
    .from("autentique_documents")
    .update({ status: "refused" })
    .eq("autentique_document_id", autentiqueDocId)
    .neq("status", "signed");

  if (error) {
    console.error(`[Webhook] Failed to update rejected status:`, error.message);
  }
}

/**
 * Handle signature.viewed - A signer viewed the document
 */
async function handleSignatureViewed(supabase: any, eventData: any) {
  const signature = eventData.object?.signature || eventData.object;
  const signerPublicId = signature?.public_id;

  if (!signerPublicId) return;

  const { error } = await supabase
    .from("signing_invitations")
    .update({ viewed_at: new Date().toISOString() })
    .eq("autentique_signer_id", signerPublicId)
    .is("viewed_at", null);

  if (error) {
    console.error(`[Webhook] Failed to update viewed_at:`, error.message);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Update hiring_processes signature flag based on signer role
 */
async function updateHiringSignatureFlag(
  supabase: any,
  hiringProcessId: string,
  signerRole: string,
  signerName: string,
  signerEmail: string
) {
  const now = new Date().toISOString();
  let updates: Record<string, any> = {};

  switch (signerRole) {
    case "company":
      updates = {
        company_signed: true,
        company_signed_at: now,
        company_signer_name: signerName,
      };
      break;
    case "candidate":
      updates = {
        candidate_signed: true,
        candidate_signed_at: now,
      };
      break;
    case "parent_guardian":
      updates = {
        parent_signed: true,
        parent_signed_at: now,
        parent_signer_name: signerName,
      };
      break;
    case "educational_institution":
      updates = {
        school_signed: true,
        school_signed_at: now,
        school_signer_name: signerName,
        school_signer_contact: signerEmail,
      };
      break;
    default:
      console.warn(`[Webhook] Unknown signer role: ${signerRole}`);
      return;
  }

  const { error } = await supabase
    .from("hiring_processes")
    .update(updates)
    .eq("id", hiringProcessId);

  if (error) {
    console.error(`[Webhook] Failed to update hiring signature flag:`, error.message);
  }
}

/**
 * Handle completion of all outreach contract documents
 */
async function handleOutreachContractComplete(supabase: any, meetingId: string) {
  console.log(`[Webhook] Outreach contract complete for meeting: ${meetingId}`);

  await supabase
    .from("scheduled_meetings")
    .update({ contract_signed_at: new Date().toISOString() })
    .eq("id", meetingId);

  const { data: meeting } = await supabase
    .from("scheduled_meetings")
    .select("company_id, agency_id")
    .eq("id", meetingId)
    .single();

  if (meeting?.company_id) {
    await supabase
      .from("companies")
      .update({
        contract_signed_at: new Date().toISOString(),
        pipeline_status: "contract_signed",
      })
      .eq("id", meeting.company_id);
  }
}

/**
 * Handle completion of all hiring contract documents
 */
async function handleHiringContractComplete(supabase: any, hiringProcessId: string) {
  console.log(`[Webhook] Hiring contract complete for process: ${hiringProcessId}`);

  const { data: process } = await supabase
    .from("hiring_processes")
    .select("*, company:companies(id, user_id, company_name, email), candidate:candidates(id, user_id, full_name, email), job:jobs(title)")
    .eq("id", hiringProcessId)
    .single();

  if (!process) return;

  // Safety-net status transition. The DB trigger check_hiring_signatures_complete
  // usually advances status on the final signature already, so this is redundant
  // in the common case but harmless.
  if (process.status === "pending_signatures") {
    // estágio → active. CLT/PJ gate on the setup fee: if already paid (pay-first
    // ordering) → active; otherwise → pending_payment to await confirmCLTPayment.
    let newStatus: string;
    if (process.hiring_type === "clt" || process.hiring_type === "pj") {
      newStatus = process.setup_fee_paid ? "active" : "pending_payment";
    } else {
      newStatus = "active";
    }
    await supabase
      .from("hiring_processes")
      .update({ status: newStatus })
      .eq("id", hiringProcessId);
  }

  // Estágio billing: the production (all-Autentique) completion path never
  // generated the recurring monthly-fee schedule, so those hires went active
  // UNBILLED (revenue leak). We can't gate on status (the trigger already moved
  // it) or contract_id (never populated), so we gate on the completion_processed_at
  // marker via a compare-and-set — the SAME marker the in-app path
  // (handleEstagioSignaturesComplete) uses. Whichever path completes the hire
  // wins the CAS and bills exactly once; the other skips. No double-bill.
  if (process.hiring_type === "estagio") {
    const { data: wonCompletion } = await supabase
      .from("hiring_processes")
      .update({ completion_processed_at: new Date().toISOString() })
      .eq("id", hiringProcessId)
      .is("completion_processed_at", null)
      .select("id");
    if (wonCompletion && wonCompletion.length > 0) {
      let billed = false;
      try {
        await generateEstagioBilling(supabase, process);
        billed = true;
      } catch (err: any) {
        // Billing failed AFTER we won the marker CAS. Release the marker so a retry
        // re-attempts billing — BUT only if nothing landed. The batch insert is
        // atomic; if rows exist despite the error it committed (e.g. connection
        // dropped after commit), and releasing would let the reconcile cron
        // double-bill. In that case keep the marker and treat it as billed.
        const { count } = await supabase
          .from("payments")
          .select("*", { count: "exact", head: true })
          .eq("hiring_process_id", hiringProcessId)
          .eq("payment_type", "monthly-fee");
        if (!count) {
          console.error("[Webhook] generateEstagioBilling failed (0 rows) — releasing completion marker for retry:", err?.message);
          await supabase
            .from("hiring_processes")
            .update({ completion_processed_at: null })
            .eq("id", hiringProcessId);
        } else {
          console.error(`[Webhook] generateEstagioBilling threw but ${count} rows exist — keeping marker (no double-bill):`, err?.message);
          billed = true;
        }
      }
      // Completion notification only once billing actually succeeded (don't tell
      // anyone they're hired if we just released the marker to retry). In the
      // all-Autentique flow no in-app path runs, so without this neither party is
      // ever told the hire completed.
      if (billed) {
        try {
          await notifyHiringComplete(supabase, process);
        } catch (err: any) {
          console.error("[Webhook] notifyHiringComplete failed:", err?.message);
        }
      }
    } else {
      console.log("[Webhook] estágio completion already processed — skipping billing + notify:", hiringProcessId);
    }
  }
}

/**
 * Generate the recurring estágio monthly-fee payments + follow-up schedule
 * (raw supabase — the webhook is a standalone function). The caller has already
 * won the completion marker CAS, so this runs exactly once; bill regardless of
 * contract_id (which is never populated). Mirrors hiring.ts handleEstagioSignaturesComplete.
 */
async function generateEstagioBilling(supabase: any, process: any) {
  // Parse the calendar parts directly from the YYYY-MM-DD string. `new Date(str)`
  // parses as UTC, which shifts to the previous day/month in negative-offset zones
  // and, combined with setMonth() day-overflow, produced DUPLICATE + SKIPPED billing
  // periods (e.g. Oct twice, Sep missing) — silently wrong before the unique index,
  // now rejected by it. Building each due date from parts fixes both.
  const [baseYear, baseMonth1, baseDay] = String(process.start_date).slice(0, 10).split("-").map(Number);
  const baseMonth0 = (baseMonth1 || 1) - 1;
  const startDate = new Date(baseYear, baseMonth0, baseDay || 1);
  const paymentDay = Math.min(process.payment_day || baseDay || 5, 28); // clamp <=28 so no month has >28 days -> no setMonth overflow -> distinct periods
  const monthlyFee = process.calculated_fee;
  const durationMonths = process.contract_duration_months || 12;
  const candidateName = process.candidate?.full_name || "candidato";
  const companyId = process.company?.id;
  const cid = process.contract_id || null;

  const payments: any[] = [];
  for (let i = 0; i < durationMonths; i++) {
    const due = new Date(baseYear, baseMonth0 + i, paymentDay);
    payments.push({
      contract_id: cid,
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
  // ONE batch insert → all-or-nothing: on failure zero rows land, so the caller
  // can safely release the completion marker and a replay retries without dupes.
  const { error: payErr } = await supabase.from("payments").insert(payments);
  if (payErr) {
    console.error("[Webhook] BILLING INSERT FAILED (revenue!):", payErr.message);
    throw new Error(`estágio billing insert failed: ${payErr.message}`);
  }

  const followUps: any[] = [];
  const end = new Date(startDate);
  end.setFullYear(end.getFullYear() + 1);
  for (let i = 1; i <= 3; i++) {
    const d = new Date(startDate); d.setMonth(d.getMonth() + i);
    followUps.push({ hiring_process_id: process.id, contract_id: cid, company_id: companyId, scheduled_at: d.toISOString(), type: "monthly" });
  }
  for (let m = 5; m <= 12; m += 2) {
    const d = new Date(startDate); d.setMonth(d.getMonth() + m);
    if (d < end) followUps.push({ hiring_process_id: process.id, contract_id: cid, company_id: companyId, scheduled_at: d.toISOString(), type: "bimonthly" });
  }
  const alert = new Date(end); alert.setDate(alert.getDate() - 30);
  followUps.push({ hiring_process_id: process.id, contract_id: cid, company_id: companyId, scheduled_at: alert.toISOString(), type: "contract_expiring" });
  const { error: fuErr } = await supabase.from("follow_up_schedule").insert(followUps);
  if (fuErr) console.error("[Webhook] follow-up insert failed:", fuErr.message);

  console.log(`[Webhook] estágio billing generated: ${payments.length} payments for ${process.id}`);
}

/**
 * Handle completion of all onboarding contract documents
 */
async function handleOnboardingContractComplete(supabase: any, contextId: string) {
  console.log(`[Webhook] Onboarding contract complete for context: ${contextId}`);

  // contextId can be a company ID or user ID — try company first
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", contextId)
    .single();

  if (company) {
    await supabase
      .from("companies")
      .update({
        contract_signed_at: new Date().toISOString(),
        pipeline_status: "contract_signed",
      })
      .eq("id", company.id);
    console.log(`[Webhook] Company ${company.id} marked as contract_signed`);
  } else {
    // contextId is a user ID — find the company by user
    const { data: companyByUser } = await supabase
      .from("companies")
      .select("id")
      .eq("user_id", contextId)
      .single();

    if (companyByUser) {
      await supabase
        .from("companies")
        .update({
          contract_signed_at: new Date().toISOString(),
          pipeline_status: "contract_signed",
        })
        .eq("id", companyByUser.id);
      console.log(`[Webhook] Company ${companyByUser.id} (via user) marked as contract_signed`);
    }
  }
}

/**
 * Notify both parties that the hire is fully complete (all signatures collected).
 * Raw supabase (standalone webhook). Caller has already won the completion marker
 * CAS, so this runs at most once per hire. `process` carries the joined
 * company/candidate user_ids from handleHiringContractComplete's select.
 */
async function notifyHiringComplete(supabase: any, process: any) {
  const jobTitle = process.job?.title || "a vaga";
  const candidateName = process.candidate?.full_name || "o candidato";
  const rows: any[] = [];
  if (process.company?.user_id) {
    rows.push({
      user_id: process.company.user_id,
      title: "Contratação concluída!",
      message: `O contrato de ${candidateName} para "${jobTitle}" foi finalizado — todas as assinaturas foram coletadas.`,
      type: "success",
      related_to_type: "hiring",
      related_to_id: process.id,
      is_read: false,
    });
  }
  if (process.candidate?.user_id) {
    rows.push({
      user_id: process.candidate.user_id,
      title: "Você foi contratado!",
      message: `Seu contrato para "${jobTitle}" foi finalizado. Todas as assinaturas foram coletadas. Parabéns!`,
      type: "success",
      related_to_type: "hiring",
      related_to_id: process.id,
      is_read: false,
    });
  }
  if (rows.length === 0) return;
  const { error } = await supabase.from("notifications").insert(rows);
  if (error) {
    console.error("[Webhook] notifyHiringComplete insert failed:", error.message);
    throw error;
  }
}

/**
 * Create a notification about a signature event
 */
async function createSignatureNotification(supabase: any, doc: any, signer: any) {
  if (doc.context_type !== "hiring_contract") return;

  // Fetch the USER ids so we can write a valid notification row. The previous
  // version inserted { user_id: null, company_id, type: 'signature_received', data }
  // into columns that don't exist / a NOT-NULL user_id / an invalid type — so it
  // ALWAYS failed and the error was swallowed. Correct shape mirrors
  // backend/db/notifications.ts createNotification.
  const { data: process } = await supabase
    .from("hiring_processes")
    .select("company:companies(user_id), candidate:candidates(user_id, full_name)")
    .eq("id", doc.context_id)
    .single();

  if (!process) return;

  const roleLabels: Record<string, string> = {
    company: "Empresa",
    candidate: "Candidato",
    parent_guardian: "Responsável Legal",
    educational_institution: "Instituição de Ensino",
  };
  const roleLabel = roleLabels[signer.role] || signer.role;
  const candidateName = process.candidate?.full_name || "candidato";
  const message = `${roleLabel} (${signer.name}) assinou o contrato de ${candidateName}.`;

  const rows: any[] = [];
  // Company wants to see each party sign.
  if (process.company?.user_id) {
    rows.push({
      user_id: process.company.user_id,
      title: "Assinatura recebida",
      message,
      type: "info",
      related_to_type: "hiring",
      related_to_id: doc.context_id,
      is_read: false,
    });
  }
  // Candidate sees progress when someone OTHER than them signs.
  if (process.candidate?.user_id && signer.role !== "candidate") {
    rows.push({
      user_id: process.candidate.user_id,
      title: "Assinatura recebida",
      message,
      type: "info",
      related_to_type: "hiring",
      related_to_id: doc.context_id,
      is_read: false,
    });
  }
  if (rows.length === 0) return;

  const { error } = await supabase.from("notifications").insert(rows);
  if (error) {
    // Surface instead of vanishing.
    console.error("[Webhook] createSignatureNotification insert failed:", error.message);
    throw error;
  }
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Reject forged events before touching any signature/hiring state.
  if (!isAuthenticWebhook(req)) {
    console.warn("[Webhook] Rejected Autentique event: missing or invalid secret");
    return res.status(401).json({ error: "unauthorized" });
  }

  // Log the raw event for debugging
  console.log("[Webhook] Received Autentique event:", JSON.stringify(req.body).slice(0, 500));

  // Always return 200 to Autentique to stop retries, even if processing fails
  try {
    const body = req.body;

    // Autentique may send different payload structures — handle both
    const eventType = body?.webhook?.event?.type || body?.event?.type || body?.type;
    const eventData = body?.webhook?.event?.data || body?.event?.data || body?.data;
    const eventId = body?.webhook?.event?.id || body?.event?.id || body?.id;

    if (!eventType) {
      console.warn("[Webhook] Could not determine event type from payload");
      return res.status(200).json({ received: true, status: "unknown_format" });
    }

    console.log(`[Webhook] Processing event: ${eventType} (${eventId})`);

    const supabase = getSupabase();

    // Idempotency: process each Autentique event id at most once. A replayed or
    // duplicated POST becomes a true no-op instead of re-advancing signature /
    // hiring / billing state. Fail-OPEN on unexpected DB errors so a transient
    // issue never silently drops a real event.
    if (eventId) {
      const { error: dedupError } = await supabase
        .from("webhook_events")
        .insert({ event_id: String(eventId), source: "autentique", event_type: eventType });
      if (dedupError) {
        if (dedupError.code === "23505") {
          console.log(`[Webhook] Duplicate event ${eventId} ignored (idempotent)`);
          return res.status(200).json({ received: true, duplicate: true });
        }
        console.warn("[Webhook] webhook_events insert failed (continuing):", dedupError.message);
      }
    }

    switch (eventType) {
      case "signature.accepted":
        await handleSignatureAccepted(supabase, eventData);
        break;

      case "document.finished":
        await handleDocumentFinished(supabase, eventData);
        break;

      case "signature.rejected":
        await handleSignatureRejected(supabase, eventData);
        break;

      case "signature.viewed":
        await handleSignatureViewed(supabase, eventData);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${eventType}`);
    }

    return res.status(200).json({ received: true, event: eventType });
  } catch (err: any) {
    console.error("[Webhook] Error processing event:", err);
    // Still return 200 to prevent Autentique from retrying endlessly
    return res.status(200).json({ received: true, error: err.message });
  }
}
