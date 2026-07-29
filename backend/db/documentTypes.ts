// Document/contract type catalogue — per agency, stored as data.
//
// Replaces the four hardcoded categories that were duplicated across a DB CHECK
// constraint, two zod enums in agency.ts, two in contract.ts, and a literal
// array in the frontend. Adding a type is now a row, not a deploy.
//
// `contrato_inicial` and the other `is_system` keys are branched on by
// backend/routers/contract.ts — they can be renamed or reordered but not
// deleted, which the delete path enforces.
import { supabaseAdmin } from "../supabase";

const db = supabaseAdmin as any;

export interface DocumentType {
  id: string;
  agency_id: string;
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
  requires_signature: boolean;
  is_active: boolean;
  is_system: boolean;
}

export async function listDocumentTypes(
  agencyId: string,
  opts?: { includeInactive?: boolean },
): Promise<DocumentType[]> {
  let query = db
    .from("document_types")
    .select("*")
    .eq("agency_id", agencyId)
    .order("sort_order", { ascending: true });

  if (!opts?.includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) {
    console.error("[documentTypes] list failed:", error.message);
    throw error;
  }
  return data || [];
}

/**
 * Guard for any procedure that accepts a category from the client.
 *
 * The zod enums this replaces could not know about types added at runtime, so
 * validation has to happen against the agency's own catalogue. Throws a plain
 * Error; callers wrap it in a TRPCError.
 */
export async function assertValidCategory(agencyId: string, category: string): Promise<void> {
  const { data, error } = await db
    .from("document_types")
    .select("key")
    .eq("agency_id", agencyId)
    .eq("key", category)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("[documentTypes] category validation failed:", error.message);
    throw error;
  }
  if (!data) {
    throw new Error(`Tipo de documento inválido para esta agência: ${category}`);
  }
}

export async function createDocumentType(input: {
  agencyId: string;
  key: string;
  label: string;
  description?: string | null;
  requiresSignature?: boolean;
}): Promise<DocumentType> {
  // Derive a stable slug when the caller doesn't supply one, so the label can
  // be edited later without breaking already-uploaded templates.
  const key = (input.key || input.label)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);

  if (!key) throw new Error("Não foi possível gerar uma chave para este tipo de documento");

  // Append after the current last entry.
  const { data: last } = await db
    .from("document_types")
    .select("sort_order")
    .eq("agency_id", input.agencyId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await db
    .from("document_types")
    .insert({
      agency_id: input.agencyId,
      key,
      label: input.label,
      description: input.description ?? null,
      requires_signature: input.requiresSignature ?? true,
      sort_order: (last?.sort_order ?? 0) + 10,
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    if ((error as any).code === "23505") {
      throw new Error("Já existe um tipo de documento com esse nome nesta agência");
    }
    console.error("[documentTypes] create failed:", error.message);
    throw error;
  }
  return data;
}

export async function updateDocumentType(
  id: string,
  agencyId: string,
  patch: { label?: string; description?: string | null; requiresSignature?: boolean; isActive?: boolean },
): Promise<void> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.label !== undefined) update.label = patch.label;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.requiresSignature !== undefined) update.requires_signature = patch.requiresSignature;
  if (patch.isActive !== undefined) update.is_active = patch.isActive;

  // agency_id in the filter is the tenant guard — never trust the id alone.
  const { error } = await db
    .from("document_types")
    .update(update)
    .eq("id", id)
    .eq("agency_id", agencyId);

  if (error) {
    console.error("[documentTypes] update failed:", error.message);
    throw error;
  }
}

/**
 * Deactivate rather than hard-delete: templates already uploaded under this
 * category keep referencing its key, and signed documents keep their history.
 * System types are branched on by application code and cannot be removed.
 */
export async function deactivateDocumentType(id: string, agencyId: string): Promise<void> {
  const { data: existing } = await db
    .from("document_types")
    .select("is_system")
    .eq("id", id)
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (!existing) throw new Error("Tipo de documento não encontrado");
  if (existing.is_system) {
    throw new Error("Este tipo é usado pelo sistema e não pode ser removido. Você pode renomeá-lo.");
  }

  await updateDocumentType(id, agencyId, { isActive: false });
}
