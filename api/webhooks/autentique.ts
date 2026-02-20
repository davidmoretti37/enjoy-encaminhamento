// Webhook handler for Autentique digital signature events
// Receives events when documents are viewed, signed, rejected, or completed
// Deployed as a standalone Vercel serverless function

import { createClient } from "@supabase/supabase-js";

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

  // Update the signer status
  const signer = signers[signerIndex];
  signer.signed_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("autentique_documents")
    .update({ signers })
    .eq("autentique_document_id", autentiqueDocId);

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

  const { error } = await supabase
    .from("autentique_documents")
    .update({ status: "refused" })
    .eq("autentique_document_id", autentiqueDocId);

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
    .select("*, company:companies(id, company_name, email)")
    .eq("id", hiringProcessId)
    .single();

  if (!process) return;

  if (process.status === "pending_signatures") {
    const newStatus = process.hiring_type === "clt" ? "pending_payment" : "active";
    await supabase
      .from("hiring_processes")
      .update({ status: newStatus })
      .eq("id", hiringProcessId);
  }
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
 * Create a notification about a signature event
 */
async function createSignatureNotification(supabase: any, doc: any, signer: any) {
  if (doc.context_type !== "hiring_contract") return;

  const { data: process } = await supabase
    .from("hiring_processes")
    .select("company_id, candidate:candidates(full_name)")
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

  await supabase.from("notifications").insert({
    user_id: null,
    company_id: process.company_id,
    type: "signature_received",
    title: "Assinatura recebida",
    message: `${roleLabel} (${signer.name}) assinou o documento "${doc.document_name}"`,
    data: {
      hiring_process_id: doc.context_id,
      signer_role: signer.role,
      document_name: doc.document_name,
    },
  });
}

// ============================================
// MAIN HANDLER
// ============================================

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
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
