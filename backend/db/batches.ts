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
  const { data, error } = await supabase
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
    // Handle unique constraint violation for one active batch per job
    if (error.code === '23505' && error.message?.includes('idx_one_active_batch_per_job')) {
      throw new Error('Já existe um grupo ativo para esta vaga. Cancele ou conclua o grupo existente antes de criar um novo.');
    }
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

export async function addCandidatesToBatch(
  batchId: string,
  newCandidateIds: string[]
): Promise<void> {
  const batch = await getBatchById(batchId);
  if (!batch) throw new Error("Batch not found");

  const existing: string[] = batch.candidate_ids || [];
  const merged = [...new Set([...existing, ...newCandidateIds])];

  await updateBatch(batchId, {
    candidate_ids: merged,
    batch_size: merged.length,
  } as any);
}

/**
 * Send batch (agency internal step)
 * Marks candidates as pre-selected but does NOT unlock for company.
 * Company can only see candidates after forwardBatchToCompany is called.
 */
export async function sendBatchToCompany(
  batchId: string,
  unlockFee: number
): Promise<string> {
  const batch = await getBatchById(batchId);
  if (!batch) {
    throw new Error("Batch not found");
  }

  // Mark as sent but keep locked — company cannot see yet
  await updateBatch(batchId, {
    unlock_fee: unlockFee,
    status: "sent",
    sent_at: new Date().toISOString(),
    unlocked: false,
  });

  return batchId;
}

/**
 * Forward batch to company (makes candidates visible)
 * Called after agency finishes their own review/interviews.
 */
export async function forwardBatchToCompany(batchId: string): Promise<void> {
  const batch = await getBatchById(batchId);
  if (!batch) {
    throw new Error("Batch not found");
  }

  await updateBatch(batchId, {
    status: "forwarded",
    unlocked: true,
    unlocked_at: new Date().toISOString(),
  });
}

/**
 * Get locked batches for a company
 * Returns batches awaiting payment with minimal details (candidate IDs hidden)
 */
export async function getLockedBatchesForCompany(companyId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("candidate_batches")
    .select(`
      *,
      job:jobs(id, title, description, contract_type, work_type, salary),
      agency:agencies(id, agency_name)
    `)
    .eq("company_id", companyId)
    .eq("unlocked", false)
    .in("status", ["sent"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get locked batches:", error);
    return [];
  }

  // Hide candidate IDs for locked batches
  return (data || []).map(batch => ({
    ...batch,
    candidate_count: batch.batch_size,
    candidate_ids: [], // Hide until unlocked
  }));
}

/**
 * Get forwarded batches for a company
 * Only returns batches the agency has explicitly forwarded (after their own review).
 * Returns batches with full candidate details and interview info.
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
    .in("status", ["forwarded", "unlocked", "meeting_scheduled", "interview_scheduled", "completed"])
    .order("unlocked_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get unlocked batches:", error);
    return [];
  }

  // Fetch full candidate details and interview sessions for unlocked batches
  const batchesWithCandidates = await Promise.all(
    (data || []).map(async (batch) => {
      const candidates = await getCandidatesByIds(batch.candidate_ids);

      // Fetch interview session if exists
      let interviewSession = null;
      if (batch.status === "meeting_scheduled") {
        const { data: sessionData } = await supabaseAdmin
          .from("interview_sessions")
          .select(`
            *,
            participants:interview_participants(
              id,
              candidate_id,
              status,
              responded_at
            )
          `)
          .eq("batch_id", batch.id)
          .eq("status", "scheduled")
          .single();
        interviewSession = sessionData;
      }

      return {
        ...batch,
        candidates,
        interviewSession,
      };
    })
  );

  return batchesWithCandidates;
}

/**
 * Get ALL batches (for admin users)
 */
export async function getAllBatches(status?: string): Promise<any[]> {
  console.log("[Database] getAllBatches called, status filter:", status);

  let query = supabaseAdmin
    .from("candidate_batches")
    .select(`
      *,
      job:jobs(id, title, contract_type, status),
      company:companies(id, company_name, email),
      agency:agencies(id, agency_name)
    `);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  console.log("[Database] getAllBatches result:", { count: data?.length, error });

  if (error) {
    console.error("[Database] Failed to get all batches:", error);
    return [];
  }

  return data || [];
}

/**
 * Get batches for an agency
 */
export async function getBatchesByAgencyId(
  agencyId: string,
  status?: string
): Promise<any[]> {
  let query = supabase
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

  let query = supabase
    .from("candidate_batches")
    .select(`
      *,
      job:jobs(id, title, contract_type, status),
      company:companies(id, company_name, email),
      agency:agencies(id, agency_name)
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
 * Get batches for a specific job
 * Includes candidate data with match scores
 */
export async function getBatchesByJobId(
  jobId: string
): Promise<any[]> {
  // Query batches for this job
  const { data, error } = await supabaseAdmin
    .from("candidate_batches")
    .select(`
      *,
      job:jobs(id, title, contract_type, status),
      company:companies(id, company_name, email),
      agency:agencies(id, agency_name)
    `)
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get batches by job ID:", error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // For each batch, fetch candidate details and match scores
  const batchesWithCandidates = await Promise.all(
    data.map(async (batch) => {
      // Get candidates by IDs
      const candidates = await getCandidatesByIds(batch.candidate_ids);

      // Get match scores from job_matches
      const { data: matchData } = await supabaseAdmin
        .from("job_matches")
        .select("candidate_id, composite_score")
        .eq("job_id", jobId)
        .in("candidate_id", batch.candidate_ids);

      // Create map of candidate_id to match_score
      const matchScores = new Map(
        (matchData || []).map(m => [m.candidate_id, m.composite_score])
      );

      // Format candidates with match scores (frontend expects this structure)
      const candidatesWithScores = candidates.map(candidate => ({
        candidate: candidate,
        match_score: matchScores.get(candidate.id) || null,
      }));

      return {
        ...batch,
        candidates: candidatesWithScores,
      };
    })
  );

  return batchesWithCandidates;
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
 * Get meeting info for a candidate on a specific job
 * Looks up batches where this candidate is included
 */
export async function getMeetingInfoForCandidate(
  candidateId: string,
  jobId: string
): Promise<{ meeting_scheduled_at: string | null; meeting_link: string | null; meeting_notes: string | null } | null> {
  // 1. Try batch-level meeting info (legacy)
  const { data, error } = await supabaseAdmin
    .from("candidate_batches")
    .select("id, meeting_scheduled_at, meeting_link, meeting_notes")
    .eq("job_id", jobId)
    .contains("candidate_ids", [candidateId])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  // If batch has a direct meeting_link, return it
  if (data.meeting_link && data.meeting_scheduled_at) {
    return {
      meeting_scheduled_at: data.meeting_scheduled_at,
      meeting_link: data.meeting_link,
      meeting_notes: data.meeting_notes,
    };
  }

  // 2. Fall back to interview_sessions for this candidate in this batch
  const { data: participant } = await supabaseAdmin
    .from("interview_participants")
    .select(`
      interview_session_id,
      interview_sessions!inner(
        scheduled_at,
        meeting_link,
        notes,
        status,
        interview_stage
      )
    `)
    .eq("candidate_id", candidateId)
    .eq("interview_sessions.batch_id", data.id)
    .eq("interview_sessions.interview_stage", "pre_selection")
    .neq("interview_sessions.status", "cancelled")
    .order("interview_sessions(scheduled_at)", { ascending: false } as any)
    .limit(1)
    .single();

  if (participant) {
    const session = (participant as any).interview_sessions;
    return {
      meeting_scheduled_at: session?.scheduled_at || null,
      meeting_link: session?.meeting_link || null,
      meeting_notes: session?.notes || null,
    };
  }

  // 3. Return batch-level data even without link (shows "link coming soon")
  return {
    meeting_scheduled_at: data.meeting_scheduled_at,
    meeting_link: null,
    meeting_notes: data.meeting_notes,
  };
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
