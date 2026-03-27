// @ts-nocheck
// Candidate batch database operations
import { supabase, supabaseAdmin } from "../supabase";
import type { CandidateBatch, InsertCandidateBatch, AgencyEmployeeTypeSetting, InsertAgencyEmployeeTypeSetting } from "./types";
import { getCandidatesByIds } from "./candidates";
import { getJobById } from "./jobs";
import { getAgencyById } from "./agencies";
import { getCompanyById } from "./companies";
import { createPayment } from "./payments";

// ============================================
// CANDIDATE BATCHES
// ============================================

/**
 * Get top N AI-matched candidates for a job
 * Used by agencies to create pre-selection batches
 */
export async function getTopMatchesForJob(
  jobId: string,
  limit: number = 15,
  minScore: number = 50
): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("job_matches")
    .select(`
      *,
      candidate:candidates(*)
    `)
    .eq("job_id", jobId)
    .gte("composite_score", minScore)
    .order("composite_score", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Database] Failed to get top matches for job:", error);
    throw error;
  }

  return data || [];
}

/**
 * Create a draft batch
 * Agencies use this to save a batch before sending to company
 */
export async function createBatch(params: {
  jobId: string;
  agencyId: string;
  companyId: string;
  candidateIds: string[];
  unlockFee?: number;
  status?: string;
}): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("candidate_batches")
    .insert({
      job_id: params.jobId,
      agency_id: params.agencyId,
      company_id: params.companyId,
      candidate_ids: params.candidateIds,
      batch_size: params.candidateIds.length,
      unlock_fee: params.unlockFee || 0,
      status: params.status || "draft",
      payment_status: "pending",
      unlocked: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Database] Failed to create batch:", error);
    throw error;
  }

  return data.id;
}

/**
 * Get batch by ID with related data
 */
export async function getBatchById(batchId: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from("candidate_batches")
    .select(`
      *,
      job:jobs(*),
      agency:agencies(*),
      company:companies(*),
      payment:payments(*)
    `)
    .eq("id", batchId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[Database] Failed to get batch:", error);
    throw error;
  }

  return data;
}

/**
 * Update batch
 */
export async function updateBatch(
  batchId: string,
  updates: Partial<InsertCandidateBatch>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("candidate_batches")
    .update(updates)
    .eq("id", batchId);

  if (error) {
    console.error("[Database] Failed to update batch:", error);
    throw error;
  }
}

/**
 * Set candidate status within a batch (approved/rejected)
 * Used by agency after meeting with candidates
 */
export async function setCandidateStatus(
  batchId: string,
  candidateId: string,
  status: "approved" | "rejected" | "pending"
): Promise<void> {
  // Get current statuses
  const batch = await getBatchById(batchId);
  if (!batch) {
    throw new Error("Batch not found");
  }

  const currentStatuses = batch.candidate_statuses || {};
  const updatedStatuses = {
    ...currentStatuses,
    [candidateId]: status,
  };

  const { error } = await supabaseAdmin
    .from("candidate_batches")
    .update({ candidate_statuses: updatedStatuses })
    .eq("id", batchId);

  if (error) {
    console.error("[Database] Failed to set candidate status:", error);
    throw error;
  }
}

/**
 * Get approved candidate IDs from a batch
 */
export function getApprovedCandidateIds(
  candidateIds: string[],
  candidateStatuses: Record<string, string> | null
): string[] {
  if (!candidateStatuses || Object.keys(candidateStatuses).length === 0) {
    // If no statuses set, return all (backwards compatible)
    return candidateIds;
  }

  return candidateIds.filter(
    (id) => candidateStatuses[id] === "approved"
  );
}

/**
 * Send batch to company
 * Updates batch status to 'sent' - company can view candidates immediately
 * Payment happens later when company selects a candidate to hire
 */
export async function sendBatchToCompany(batchId: string): Promise<void> {
  // Get batch details
  const batch = await getBatchById(batchId);
  if (!batch) {
    throw new Error("Batch not found");
  }

  // Update batch status to sent
  await updateBatch(batchId, {
    status: "sent",
    sent_at: new Date().toISOString(),
  });
}

/**
 * Get batches sent to a company (with full candidate details)
 * Companies can now view candidates immediately - no payment required upfront
 */
export async function getBatchesForCompany(companyId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("candidate_batches")
    .select(`
      *,
      job:jobs(id, title, description, contract_type, work_type, salary),
      agency:agencies(id, name)
    `)
    .eq("company_id", companyId)
    .in("status", ["sent", "unlocked", "meeting_scheduled"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get batches for company:", error);
    return [];
  }

  // Fetch full candidate details for all batches
  const batchesWithCandidates = await Promise.all(
    (data || []).map(async (batch) => {
      const candidates = await getCandidatesByIds(batch.candidate_ids);
      return {
        ...batch,
        candidates,
      };
    })
  );

  return batchesWithCandidates;
}

/**
 * Get unlocked batches for a company
 * Returns batches with full candidate details
 */
export async function getUnlockedBatchesForCompany(companyId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("candidate_batches")
    .select(`
      *,
      job:jobs(*),
      agency:agencies(*)
    `)
    .eq("company_id", companyId)
    .eq("unlocked", true)
    .order("unlocked_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get unlocked batches:", error);
    return [];
  }

  // Fetch full candidate details for unlocked batches
  const batchesWithCandidates = await Promise.all(
    (data || []).map(async (batch) => {
      const candidates = await getCandidatesByIds(batch.candidate_ids);
      return {
        ...batch,
        candidates,
      };
    })
  );

  return batchesWithCandidates;
}

/**
 * Get batches for a specific job
 */
export async function getBatchesByJobId(jobId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("candidate_batches")
    .select(`
      *,
      job:jobs(id, title, contract_type, status),
      company:companies(id, company_name, email)
    `)
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get batches by job:", error);
    return [];
  }

  // Enrich with candidate details (wrapped as { candidate: {...} } to match frontend expectations)
  const enriched = await Promise.all(
    (data || []).map(async (batch) => {
      const rawCandidates = await getCandidatesByIds(batch.candidate_ids || []);
      const candidates = rawCandidates.map((c: any) => ({ candidate: c }));
      return { ...batch, candidates };
    })
  );

  return enriched;
}

/**
 * Get batches for an agency
 */
export async function getBatchesByAgencyId(
  agencyId: string,
  status?: string
): Promise<any[]> {
  let query = supabaseAdmin
    .from("candidate_batches")
    .select(`
      *,
      job:jobs(id, title, contract_type, status),
      company:companies(id, company_name, email)
    `)
    .eq("agency_id", agencyId);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get agency batches:", error);
    return [];
  }

  return data || [];
}

/**
 * Get batches for multiple agencies (for affiliate view)
 */
export async function getBatchesByAgencyIds(
  agencyIds: string[],
  status?: string
): Promise<any[]> {
  if (agencyIds.length === 0) return [];

  let query = supabaseAdmin
    .from("candidate_batches")
    .select(`
      *,
      job:jobs(id, title, contract_type, status),
      company:companies(id, company_name, email),
      agency:agencies(id, name)
    `)
    .in("agency_id", agencyIds);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get batches by agency IDs:", error);
    return [];
  }

  return data || [];
}

/**
 * Unlock a batch (called after payment)
 */
export async function unlockBatch(batchId: string): Promise<void> {
  await updateBatch(batchId, {
    unlocked: true,
    unlocked_at: new Date().toISOString(),
    payment_status: "paid",
    status: "unlocked",
  });
}

/**
 * Select candidates for interview from a batch
 * Company confirms which candidates they want to interview
 */
export async function selectCandidatesForInterview(
  batchId: string,
  candidateIds: string[]
): Promise<void> {
  await updateBatch(batchId, {
    selected_candidate_ids: candidateIds,
    selection_completed_at: new Date().toISOString(),
    status: "completed",
  });
}

/**
 * Schedule meeting for a batch
 */
export async function scheduleBatchMeeting(
  batchId: string,
  scheduledAt: string,
  meetingLink?: string,
  notes?: string
): Promise<void> {
  await updateBatch(batchId, {
    meeting_scheduled_at: scheduledAt,
    meeting_link: meetingLink,
    meeting_notes: notes,
    status: "meeting_scheduled",
  });
}

/**
 * Cancel a batch
 */
export async function cancelBatch(batchId: string, reason?: string): Promise<void> {
  await updateBatch(batchId, {
    status: "cancelled",
    meeting_notes: reason ? `Cancelled: ${reason}` : "Cancelled",
  });
}

// ============================================
// AGENCY EMPLOYEE TYPE SETTINGS
// ============================================

/**
 * Get all employee type settings for an agency
 */
export async function getAgencyEmployeeTypeSettings(
  agencyId: string
): Promise<AgencyEmployeeTypeSetting[]> {
  const { data, error } = await supabaseAdmin
    .from("agency_employee_type_settings")
    .select("*")
    .eq("agency_id", agencyId)
    .order("employee_type");

  if (error) {
    console.error("[Database] Failed to get agency employee type settings:", error);
    return [];
  }

  return data || [];
}

/**
 * Get specific employee type setting
 */
export async function getAgencyEmployeeTypeSetting(
  agencyId: string,
  employeeType: "estagio" | "clt" | "menor-aprendiz"
): Promise<AgencyEmployeeTypeSetting | null> {
  const { data, error } = await supabaseAdmin
    .from("agency_employee_type_settings")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("employee_type", employeeType)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[Database] Failed to get agency employee type setting:", error);
    return null;
  }

  return data;
}

/**
 * Upsert (insert or update) employee type setting
 */
export async function upsertAgencyEmployeeTypeSetting(
  agencyId: string,
  setting: {
    employeeType: "estagio" | "clt" | "menor-aprendiz";
    contractTemplateType?: "pdf" | "html";
    contractPdfUrl?: string;
    contractPdfKey?: string;
    contractHtml?: string;
    paymentFrequency: "one_time" | "recurring";
    defaultUnlockFee?: number;
    monthlyFee?: number;
  }
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("agency_employee_type_settings")
    .upsert(
      {
        agency_id: agencyId,
        employee_type: setting.employeeType,
        contract_template_type: setting.contractTemplateType,
        contract_pdf_url: setting.contractPdfUrl,
        contract_pdf_key: setting.contractPdfKey,
        contract_html: setting.contractHtml,
        payment_frequency: setting.paymentFrequency,
        default_unlock_fee: setting.defaultUnlockFee,
        monthly_fee: setting.monthlyFee,
      },
      {
        onConflict: "agency_id,employee_type",
      }
    )
    .select("id")
    .single();

  if (error) {
    console.error("[Database] Failed to upsert agency employee type setting:", error);
    throw error;
  }

  return data.id;
}

/**
 * Delete employee type setting
 */
export async function deleteAgencyEmployeeTypeSetting(
  agencyId: string,
  employeeType: "estagio" | "clt" | "menor-aprendiz"
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("agency_employee_type_settings")
    .delete()
    .eq("agency_id", agencyId)
    .eq("employee_type", employeeType);

  if (error) {
    console.error("[Database] Failed to delete agency employee type setting:", error);
    throw error;
  }
}

/**
 * Get contract templates for specific employee types
 * Used when company unlocks a batch to show relevant contract templates
 */
export async function getAgencyContractsByTypes(
  agencyId: string,
  employeeTypes: string[]
): Promise<AgencyEmployeeTypeSetting[]> {
  const { data, error } = await supabaseAdmin
    .from("agency_employee_type_settings")
    .select("*")
    .eq("agency_id", agencyId)
    .in("employee_type", employeeTypes);

  if (error) {
    console.error("[Database] Failed to get agency contracts by types:", error);
    return [];
  }

  return data || [];
}

// ============================================
// BATCH STATISTICS & ANALYTICS
// ============================================

/**
 * Get batch statistics for a company
 */
export async function getCompanyBatchStats(companyId: string): Promise<{
  locked: number;
  unlocked: number;
  completed: number;
  totalCandidates: number;
  totalSpent: number;
}> {
  const { data, error } = await supabaseAdmin
    .from("candidate_batches")
    .select("unlocked, status, batch_size, unlock_fee")
    .eq("company_id", companyId);

  if (error) {
    console.error("[Database] Failed to get company batch stats:", error);
    return {
      locked: 0,
      unlocked: 0,
      completed: 0,
      totalCandidates: 0,
      totalSpent: 0,
    };
  }

  const batches = data || [];

  return {
    locked: batches.filter(b => !b.unlocked && b.status === "sent").length,
    unlocked: batches.filter(b => b.unlocked && b.status !== "completed").length,
    completed: batches.filter(b => b.status === "completed").length,
    totalCandidates: batches
      .filter(b => b.unlocked)
      .reduce((sum, b) => sum + b.batch_size, 0),
    totalSpent: batches
      .filter(b => b.unlocked)
      .reduce((sum, b) => sum + (b.unlock_fee || 0), 0),
  };
}

/**
 * Get batch statistics for an agency
 */
export async function getAgencyBatchStats(agencyId: string): Promise<{
  draft: number;
  sent: number;
  unlocked: number;
  completed: number;
  totalRevenue: number;
}> {
  const { data, error } = await supabaseAdmin
    .from("candidate_batches")
    .select("status, unlocked, unlock_fee")
    .eq("agency_id", agencyId);

  if (error) {
    console.error("[Database] Failed to get agency batch stats:", error);
    return {
      draft: 0,
      sent: 0,
      unlocked: 0,
      completed: 0,
      totalRevenue: 0,
    };
  }

  const batches = data || [];

  return {
    draft: batches.filter(b => b.status === "draft").length,
    sent: batches.filter(b => b.status === "sent").length,
    unlocked: batches.filter(b => b.unlocked && b.status !== "completed").length,
    completed: batches.filter(b => b.status === "completed").length,
    totalRevenue: batches
      .filter(b => b.unlocked)
      .reduce((sum, b) => sum + (b.unlock_fee || 0), 0),
  };
}
