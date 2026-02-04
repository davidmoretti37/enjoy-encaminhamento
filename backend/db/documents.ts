// @ts-nocheck
// Document template and signing database operations
import { supabaseAdmin } from "../supabase";

// ============================================
// Document Templates (Agency uploads)
// ============================================

export async function getDocumentTemplates(
  agencyId: string,
  category?: string
): Promise<any[]> {
  let query = supabaseAdmin
    .from("agency_document_templates")
    .select("*")
    .eq("agency_id", agencyId)
    .order("category")
    .order("sort_order", { ascending: true });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[Database] Failed to get document templates:", error);
    return [];
  }
  return data || [];
}

export async function createDocumentTemplate(input: {
  agencyId: string;
  category: string;
  name: string;
  fileUrl: string;
  fileKey: string;
}): Promise<{ id: string }> {
  // Get current max sort_order for this category
  const { data: existing } = await supabaseAdmin
    .from("agency_document_templates")
    .select("sort_order")
    .eq("agency_id", input.agencyId)
    .eq("category", input.category)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabaseAdmin
    .from("agency_document_templates")
    .insert({
      agency_id: input.agencyId,
      category: input.category,
      name: input.name,
      file_url: input.fileUrl,
      file_key: input.fileKey,
      sort_order: nextOrder,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}

export async function deleteDocumentTemplate(templateId: string, agencyId: string): Promise<{ fileKey: string | null }> {
  // Get the template first to return file key for storage deletion
  const { data: template } = await supabaseAdmin
    .from("agency_document_templates")
    .select("file_key")
    .eq("id", templateId)
    .eq("agency_id", agencyId)
    .single();

  const { error } = await supabaseAdmin
    .from("agency_document_templates")
    .delete()
    .eq("id", templateId)
    .eq("agency_id", agencyId);

  if (error) throw error;
  return { fileKey: template?.file_key || null };
}

export async function reorderDocumentTemplates(
  agencyId: string,
  templateIds: string[]
): Promise<void> {
  for (let i = 0; i < templateIds.length; i++) {
    await supabaseAdmin
      .from("agency_document_templates")
      .update({ sort_order: i })
      .eq("id", templateIds[i])
      .eq("agency_id", agencyId);
  }
}

export async function getDocumentTemplateById(templateId: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from("agency_document_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (error) return null;
  return data;
}

// ============================================
// Signed Documents
// ============================================

export async function createSignedDocument(input: {
  templateId: string;
  agencyId: string;
  companyId: string | null;
  signerUserId: string;
  category: string;
  contractId?: string;
  candidateId?: string;
  signerName: string;
  signerCpf: string;
  signature: string;
}): Promise<{ id: string }> {
  const { data, error } = await supabaseAdmin
    .from("signed_documents")
    .insert({
      template_id: input.templateId,
      agency_id: input.agencyId,
      company_id: input.companyId,
      signer_user_id: input.signerUserId,
      category: input.category,
      contract_id: input.contractId || null,
      candidate_id: input.candidateId || null,
      signer_name: input.signerName,
      signer_cpf: input.signerCpf,
      signature: input.signature,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}

export async function getSignedDocuments(filters: {
  companyId?: string;
  agencyId?: string;
  contractId?: string;
  category?: string;
}): Promise<any[]> {
  let query = supabaseAdmin
    .from("signed_documents")
    .select(`
      *,
      template:agency_document_templates(id, name, file_url, category)
    `)
    .order("signed_at", { ascending: false });

  if (filters.companyId) query = query.eq("company_id", filters.companyId);
  if (filters.agencyId) query = query.eq("agency_id", filters.agencyId);
  if (filters.contractId) query = query.eq("contract_id", filters.contractId);
  if (filters.category) query = query.eq("category", filters.category);

  const { data, error } = await query;
  if (error) {
    console.error("[Database] Failed to get signed documents:", error);
    return [];
  }
  return data || [];
}

export async function getSignedDocumentsByTemplateIds(
  companyId: string | null,
  templateIds: string[],
  contractId?: string,
  signerUserId?: string
): Promise<any[]> {
  let query = supabaseAdmin
    .from("signed_documents")
    .select("template_id")
    .in("template_id", templateIds);

  // Match by company_id or signer_user_id (for onboarding before company exists)
  if (companyId) {
    query = query.eq("company_id", companyId);
  } else if (signerUserId) {
    query = query.eq("signer_user_id", signerUserId);
  }

  if (contractId) {
    query = query.eq("contract_id", contractId);
  }

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function checkAllDocumentsSigned(input: {
  agencyId: string;
  companyId: string | null;
  category: string;
  contractId?: string;
  signerUserId?: string;
}): Promise<{ allSigned: boolean; total: number; signed: number }> {
  // Get all templates for this agency + category
  const templates = await getDocumentTemplates(input.agencyId, input.category);
  const total = templates.length;

  if (total === 0) {
    return { allSigned: true, total: 0, signed: 0 };
  }

  const templateIds = templates.map((t: any) => t.id);
  const signedDocs = await getSignedDocumentsByTemplateIds(
    input.companyId,
    templateIds,
    input.contractId,
    input.signerUserId
  );
  const signed = signedDocs.length;

  return {
    allSigned: signed >= total,
    total,
    signed,
  };
}

export async function updateSignedDocumentUrl(
  id: string,
  signedPdfUrl: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("signed_documents")
    .update({ signed_pdf_url: signedPdfUrl })
    .eq("id", id);

  if (error) {
    console.error("[Database] Failed to update signed document URL:", error);
    throw error;
  }
}

export async function updateCompanyContractSigning(
  companyId: string,
  data: {
    contract_signed_at: string;
    contract_signature: string;
    contract_signer_name: string;
    contract_signer_cpf: string;
  }
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("companies")
    .update(data)
    .eq("id", companyId);

  if (error) {
    console.error("[Database] Failed to update company contract signing:", error);
    throw error;
  }
}
