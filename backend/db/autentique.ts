// @ts-nocheck
// Autentique document tracking database operations
import { supabaseAdmin } from "../supabase";

// ============================================
// TYPES
// ============================================

export interface AutentiqueDocumentRecord {
  id: string;
  autentique_document_id: string;
  document_name: string;
  context_type: "outreach_contract" | "hiring_contract";
  context_id: string;
  template_id: string | null;
  status: "pending" | "processing" | "signed" | "refused" | "expired";
  signed_pdf_url: string | null;
  signers: AutentiqueSignerRecord[];
  created_at: string;
  updated_at: string;
}

export interface AutentiqueSignerRecord {
  role: string;
  email: string;
  name: string;
  autentique_signer_id: string;
  sign_url: string;
  signed_at: string | null;
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Create an Autentique document tracking record
 */
export async function createAutentiqueDocument(params: {
  autentiqueDocumentId: string;
  documentName: string;
  contextType: "outreach_contract" | "hiring_contract";
  contextId: string;
  templateId?: string;
  signers: Array<{
    role: string;
    email: string;
    name: string;
    autentiqueSignerId: string;
    signUrl: string;
  }>;
}): Promise<{ id: string }> {
  const signers = params.signers.map((s) => ({
    role: s.role,
    email: s.email,
    name: s.name,
    autentique_signer_id: s.autentiqueSignerId,
    sign_url: s.signUrl,
    signed_at: null,
  }));

  const { data, error } = await supabaseAdmin
    .from("autentique_documents")
    .insert({
      autentique_document_id: params.autentiqueDocumentId,
      document_name: params.documentName,
      context_type: params.contextType,
      context_id: params.contextId,
      template_id: params.templateId || null,
      signers,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Autentique DB] Failed to create document record:", error);
    throw error;
  }

  return { id: data.id };
}

/**
 * Get Autentique document by Autentique's document ID
 */
export async function getAutentiqueDocumentByAutentiqueId(
  autentiqueDocumentId: string
): Promise<AutentiqueDocumentRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("autentique_documents")
    .select("*")
    .eq("autentique_document_id", autentiqueDocumentId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[Autentique DB] Failed to get document:", error);
    return null;
  }

  return data;
}

/**
 * Get all Autentique documents for a context (e.g., all documents for a hiring process)
 */
export async function getAutentiqueDocumentsByContext(
  contextType: "outreach_contract" | "hiring_contract",
  contextId: string
): Promise<AutentiqueDocumentRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("autentique_documents")
    .select("*")
    .eq("context_type", contextType)
    .eq("context_id", contextId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[Autentique DB] Failed to get documents by context:", error);
    return [];
  }

  return data || [];
}

/**
 * Update the status of an Autentique document
 */
export async function updateAutentiqueDocumentStatus(
  autentiqueDocumentId: string,
  status: string,
  signedPdfUrl?: string
): Promise<void> {
  const updates: any = { status };
  if (signedPdfUrl) {
    updates.signed_pdf_url = signedPdfUrl;
  }

  const { error } = await supabaseAdmin
    .from("autentique_documents")
    .update(updates)
    .eq("autentique_document_id", autentiqueDocumentId);

  if (error) {
    console.error("[Autentique DB] Failed to update document status:", error);
    throw error;
  }
}

/**
 * Update a specific signer's status within an Autentique document
 * Uses JSONB manipulation to update the signed_at for a specific signer
 */
export async function updateAutentiqueSignerStatus(
  autentiqueDocumentId: string,
  autentiqueSignerId: string,
  signedAt: string
): Promise<{ role: string; email: string; name: string } | null> {
  // First get the document to find the signer
  const doc = await getAutentiqueDocumentByAutentiqueId(autentiqueDocumentId);
  if (!doc) return null;

  const signers = doc.signers as AutentiqueSignerRecord[];
  const signerIndex = signers.findIndex(
    (s) => s.autentique_signer_id === autentiqueSignerId
  );

  if (signerIndex === -1) {
    console.warn(`[Autentique DB] Signer ${autentiqueSignerId} not found in document ${autentiqueDocumentId}`);
    return null;
  }

  // Already signed - idempotent
  if (signers[signerIndex].signed_at) {
    return {
      role: signers[signerIndex].role,
      email: signers[signerIndex].email,
      name: signers[signerIndex].name,
    };
  }

  // Update the signer
  signers[signerIndex].signed_at = signedAt;

  const { error } = await supabaseAdmin
    .from("autentique_documents")
    .update({ signers })
    .eq("autentique_document_id", autentiqueDocumentId);

  if (error) {
    console.error("[Autentique DB] Failed to update signer status:", error);
    throw error;
  }

  return {
    role: signers[signerIndex].role,
    email: signers[signerIndex].email,
    name: signers[signerIndex].name,
  };
}

/**
 * Check if all Autentique documents for a context are fully signed
 */
export async function checkAllAutentiqueDocumentsSigned(
  contextType: "outreach_contract" | "hiring_contract",
  contextId: string
): Promise<{ allSigned: boolean; total: number; signed: number }> {
  const docs = await getAutentiqueDocumentsByContext(contextType, contextId);

  if (docs.length === 0) {
    return { allSigned: false, total: 0, signed: 0 };
  }

  const total = docs.length;
  const signed = docs.filter((d) => d.status === "signed").length;

  return {
    allSigned: signed >= total,
    total,
    signed,
  };
}
