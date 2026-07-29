// Batch router - candidate batch management and payment
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { agencyProcedure, companyProcedure, adminProcedure, candidateProcedure } from "./procedures";
import * as _db from "../db";
import * as _batchDb from "../db/batches";
const db: any = _db;
const batchDb: any = _batchDb;
import { supabaseAdmin as _supabaseAdmin } from "../supabase";
const supabaseAdmin = _supabaseAdmin as any;
import { generateCandidateCardPdf } from "../lib/candidateCardPdf";
import { notifyCandidateRejected, notifyCompany, notifyCandidate } from "../lib/funnelNotify";

/**
 * Assert the caller's agency owns the batch. admin/super_admin bypass. Returns
 * the loaded batch. agencyProcedure only checks role, so every agency endpoint
 * that takes a client batchId must call this before reading/mutating.
 */
// Head office browsing in "all agencies" mode has NO agency context, and every
// endpoint here treated that as an error and treated only "admin" (never
// "super_admin") as privileged. The result: batch.getBatchesByJobId threw
// "Agency not found", so the entire Gerenciar Grupo step was invisible to head
// office, and creating a group from that view failed outright.
// assertAgencyOwnsBatch already got this right; these helpers bring the rest of
// the router in line with it and with job.ts's assertAgencyOwnsJob.
function isPlatformAdmin(role: string | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

/**
 * The agency a batch should be attributed to. Platform admins fall back to the
 * job's own agency, which is the correct owner regardless of what they happen to
 * have selected in the agency switcher.
 */
async function resolveActingAgencyId(ctx: any, job: any): Promise<string> {
  const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
  if (isPlatformAdmin(ctx.user.role)) {
    const agencyId = job.agency_id || agency?.id;
    if (!agencyId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Esta vaga não tem agência associada" });
    }
    return agencyId;
  }
  if (!agency) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
  }
  if (job.agency_id !== agency.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Esta vaga não pertence à sua agência" });
  }
  return agency.id;
}

export async function assertAgencyOwnsBatch(ctx: any, batchId: string): Promise<any> {
  const batch = await batchDb.getBatchById(batchId);
  if (!batch) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
  }
  if (ctx.user.role === "admin" || ctx.user.role === "super_admin") return batch;
  const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
  if (!agency || batch.agency_id !== agency.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Este lote não pertence à sua agência" });
  }
  return batch;
}

/**
 * Assert the caller's agency owns the interview session (via its batch).
 */
async function assertAgencyOwnsSession(ctx: any, sessionId: string): Promise<any> {
  const { getInterviewSessionById } = await import("../db/interviews");
  const session = await getInterviewSessionById(sessionId);
  if (!session) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
  }
  if (ctx.user.role === "admin" || ctx.user.role === "super_admin") return session;
  if (!session.batch_id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Sessão sem lote associado" });
  }
  await assertAgencyOwnsBatch(ctx, session.batch_id);
  return session;
}

export const batchRouter = router({
  // Get meeting info for a candidate's batch (candidate access)
  getCandidateMeetingInfo: candidateProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const candidate = await db.getCandidateByUserId(ctx.user.id);
      if (!candidate) return null;

      // Find batches for this job that include this candidate
      const { data: batches } = await supabaseAdmin
        .from('candidate_batches')
        .select('id, meeting_scheduled_at, meeting_link, meeting_notes, status')
        .eq('job_id', input.jobId)
        .contains('candidate_ids', [candidate.id])
        .order('created_at', { ascending: false })
        .limit(1);

      if (!batches || batches.length === 0) return null;

      const batch = batches[0];

      // Also check interview_sessions for meeting link (agency sets it there)
      let meetingLink = batch.meeting_link;
      let meetingScheduledAt = batch.meeting_scheduled_at;
      if (!meetingLink || !meetingScheduledAt) {
        const { data: sessions } = await supabaseAdmin
          .from('interview_sessions')
          .select('scheduled_at, meeting_link, notes')
          .eq('batch_id', batch.id)
          .neq('status', 'cancelled')
          .order('scheduled_at', { ascending: false })
          .limit(1);

        if (sessions && sessions.length > 0) {
          const session = sessions[0];
          if (!meetingLink && session.meeting_link) meetingLink = session.meeting_link;
          if (!meetingScheduledAt && session.scheduled_at) meetingScheduledAt = session.scheduled_at;
        }
      }

      return {
        meeting_scheduled_at: meetingScheduledAt,
        meeting_link: meetingLink,
        meeting_notes: batch.meeting_notes,
      };
    }),

  // Get candidate card details for company interview view
  getCandidateCard: companyProcedure
    .input(z.object({
      candidateId: z.string().uuid(),
      batchId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      // AC-6: only the owning company may read this candidate's PII, and only for a
      // candidate in one of its own unlocked batches (mirror generateCandidateCardPdf).
      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Batch not found' });
      }
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company || batch.company_id !== company.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }
      if (!batch.candidate_ids?.includes(input.candidateId)) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Candidate not in batch' });
      }
      if (!batch.unlocked) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Batch not unlocked' });
      }

      const candidate = await db.getCandidateById(input.candidateId);
      if (!candidate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Candidate not found' });
      }

      // Calculate age
      let age = null;
      if (candidate.date_of_birth) {
        const today = new Date();
        const birth = new Date(candidate.date_of_birth);
        age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      }

      // Get interview session for this batch + candidate
      const { data: participation } = await supabaseAdmin
        .from('interview_participants')
        .select('*, session:interview_sessions(*)')
        .eq('candidate_id', input.candidateId)
        .eq('session.batch_id', input.batchId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const session = (participation as any)?.session;

      // Get match score from job_matches (batch already loaded and authorized above)
      let matchScore = null;
      if (batch?.job_id) {
        const { data: match } = await supabaseAdmin
          .from('job_matches')
          .select('final_score')
          .eq('job_id', batch.job_id)
          .eq('candidate_id', input.candidateId)
          .maybeSingle();
        matchScore = match?.final_score ?? null;
      }

      return {
        profile: {
          ...candidate,
          age,
          name: candidate.full_name,
          has_work_experience: Array.isArray(candidate.experience) && candidate.experience.length > 0,
        },
        interview: session ? {
          id: session.id,
          interview_type: session.interview_type,
          scheduled_at: session.scheduled_at,
          duration_minutes: session.duration_minutes,
          meeting_link: session.meeting_link,
          location_address: session.location_address,
          location_city: session.location_city,
          location_state: session.location_state,
        } : null,
        matchScore,
      };
    }),

  // ============================================
  // AGENCY ENDPOINTS
  // ============================================

  /**
   * Get top AI-matched candidates for a job
   * Agencies use this to review candidates before creating a batch
   */
  getTopCandidatesForJob: agencyProcedure
    .input(z.object({
      jobId: z.string().uuid(),
      limit: z.number().int().min(5).max(50).optional().default(15),
      minScore: z.number().min(0).max(100).optional().default(50),
    }))
    .query(async ({ ctx, input }) => {
      // Verify agency has access to this job
      const job = await db.getJobById(input.jobId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      // Get agency for current user
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }

      // Verify agency owns this job
      if (job.agency_id !== agency.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this job" });
      }

      // Get top matches
      const matches = await batchDb.getTopMatchesForJob(
        input.jobId,
        input.limit,
        input.minScore
      );

      return {
        jobId: input.jobId,
        matches,
        count: matches.length,
      };
    }),

  /**
   * Create a draft batch
   * Agencies can create and save a batch without sending it
   */
  createDraftBatch: agencyProcedure
    .input(z.object({
      jobId: z.string().uuid(),
      candidateIds: z.array(z.string().uuid()).min(1).max(50),
      unlockFee: z.number().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get job and verify access
      const job = await db.getJobById(input.jobId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      const actingAgencyId = await resolveActingAgencyId(ctx, job);

      // Create batch
      const batchId = await batchDb.createBatch({
        jobId: input.jobId,
        agencyId: actingAgencyId,
        companyId: job.company_id,
        candidateIds: input.candidateIds,
        unlockFee: input.unlockFee || 0,
        status: "draft",
      });

      // Update application status for selected candidates
      for (const candidateId of input.candidateIds) {
        await supabaseAdmin
          .from('applications')
          .update({ status: 'screening' })
          .eq('job_id', input.jobId)
          .eq('candidate_id', candidateId)
          .eq('status', 'applied');
      }

      return { batchId, success: true };
    }),

  /**
   * Send batch to company
   * Updates status to 'sent' - company can view candidates immediately
   */
  sendBatchToCompany: agencyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }

      // Verify batch exists and belongs to agency
      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }

      if (batch.agency_id !== agency.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (batch.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Batch already sent",
        });
      }

      // Send batch (updates status)
      await batchDb.sendBatchToCompany(input.batchId);

      // Fix D: notify the company IN-APP + EMAIL — this is the highest-value
      // pull-back moment and companies won't sit in the portal waiting.
      const company = await db.getCompanyById(batch.company_id) || batch.company;
      await notifyCompany(company, {
        title: "Novos candidatos disponíveis",
        message: `${batch.batch_size} candidato(s) foram selecionados para a vaga "${batch.job.title}". Acesse o portal para revisar.`,
        relatedType: "batch",
        relatedId: input.batchId,
        emailSubject: `Novos candidatos para "${batch.job.title}" — ANEC`,
        emailHtml: `<p>Boas notícias!</p>
          <p><strong>${batch.batch_size} candidato(s)</strong> foram pré-selecionados para a sua vaga <strong>"${batch.job.title}"</strong>.</p>
          <p>Acesse o portal ANEC para revisar os perfis, ver o match de cada um e agendar as entrevistas.</p>`,
      });

      return { success: true, batchId: input.batchId };
    }),

  /**
   * Schedule meeting for a batch
   */
  scheduleBatchMeeting: agencyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
      scheduledAt: z.string().datetime(),
      meetingLink: z.string().url().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }

      // Verify batch belongs to agency
      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch || (batch.agency_id !== agency.id && ctx.user.role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Verify batch is unlocked
      if (!batch.unlocked) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot schedule meeting for locked batch",
        });
      }

      await batchDb.scheduleBatchMeeting(
        input.batchId,
        input.scheduledAt,
        input.meetingLink,
        input.notes
      );

      // Notify company
      await db.createNotification({
        user_id: batch.company.user_id,
        title: "Reunião agendada",
        message: `Reunião agendada para revisar candidatos da vaga "${batch.job.title}"`,
        type: "info",
        related_to_type: "batch",
        related_to_id: input.batchId,
      });

      return { success: true };
    }),

  /**
   * Complete a batch (mark meeting as done)
   */
  completeBatch: agencyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }

      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch || (batch.agency_id !== agency.id && ctx.user.role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (batch.status !== "meeting_scheduled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Somente processos com reunião agendada podem ser concluídos",
        });
      }

      await batchDb.updateBatch(input.batchId, {
        status: "completed",
        meeting_completed_at: new Date().toISOString(),
        ...(input.notes ? { meeting_notes: input.notes } : {}),
      });

      // Notify company
      await db.createNotification({
        user_id: batch.company.user_id,
        title: "Processo concluído",
        message: `O processo seletivo para a vaga "${batch.job.title}" foi concluído`,
        type: "info",
        related_to_type: "batch",
        related_to_id: input.batchId,
      });

      return { success: true };
    }),

  /**
   * Get all batches for agency
   */
  getAgencyBatches: agencyProcedure
    .input(z.object({
      status: z.enum(["draft", "sent", "unlocked", "meeting_scheduled", "completed", "cancelled"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }

      const batches = await batchDb.getBatchesByAgencyId(agency.id, input?.status);
      return batches;
    }),

  /**
   * Get batch statistics for agency
   */
  getAgencyBatchStats: agencyProcedure
    .query(async ({ ctx }) => {
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }

      const stats = await batchDb.getAgencyBatchStats(agency.id);
      return stats;
    }),

  /**
   * Cancel a batch
   */
  cancelBatch: agencyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }

      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch || (batch.agency_id !== agency.id && ctx.user.role !== "admin")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await batchDb.cancelBatch(input.batchId, input.reason);
      return { success: true };
    }),

  /**
   * Update candidate status within a batch (approve/reject)
   * Agency uses this after meeting with candidates
   */
  updateCandidateStatus: agencyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
      candidateId: z.string().uuid(),
      status: z.enum(["approved", "rejected", "pending"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }

      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }

      if (batch.agency_id !== agency.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Verify candidate is in this batch
      if (!batch.candidate_ids.includes(input.candidateId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Candidate not in this batch",
        });
      }

      await batchDb.setCandidateStatus(input.batchId, input.candidateId, input.status);

      // Update application status based on approval/rejection
      if (input.status === "approved") {
        await supabaseAdmin
          .from('applications')
          .update({ status: 'interview-scheduled' })
          .eq('job_id', batch.job_id)
          .eq('candidate_id', input.candidateId);
      } else if (input.status === "rejected") {
        await supabaseAdmin
          .from('applications')
          .update({ status: 'rejected' })
          .eq('job_id', batch.job_id)
          .eq('candidate_id', input.candidateId);
        // Fix B: never ghost the candidate — tell them they weren't selected.
        try {
          const [cand, job] = await Promise.all([
            db.getCandidateById(input.candidateId),
            db.getJobById(batch.job_id),
          ]);
          await notifyCandidateRejected(cand, job?.title || "a vaga", null, batch.job_id);
        } catch (e: any) {
          console.error("[batch.updateCandidateStatus] reject notify failed:", e?.message);
        }
      }

      return { success: true };
    }),

  // ============================================
  // AFFILIATE ENDPOINTS
  // ============================================

  /**
   * Get all batches for agencies under an affiliate
   */
  getAffiliateBatches: adminProcedure
    .input(z.object({
      agencyId: z.string().uuid().nullable().optional(),
      status: z.enum(["draft", "sent", "unlocked", "meeting_scheduled", "completed", "cancelled"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Affiliate not found" });
      }

      // If specific agency selected, get batches for that agency only
      if (input?.agencyId) {
        const batches = await batchDb.getBatchesByAgencyId(input.agencyId, input?.status);
        return batches;
      }

      // Otherwise, get all agencies under this affiliate
      const agencies = await db.getAgenciesByAffiliateId(affiliate.id);
      const agencyIds = agencies.map((a: any) => a.id);

      const batches = await batchDb.getBatchesByAgencyIds(agencyIds, input?.status);
      return batches;
    }),

  // ============================================
  // COMPANY ENDPOINTS
  // ============================================

  /**
   * Get all batches for company with full candidate details
   * No payment required - companies can view candidates immediately
   */
  getCompanyBatches: companyProcedure
    .query(async ({ ctx }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      const batches = await batchDb.getBatchesForCompany(company.id);
      return batches;
    }),

  // Keep old endpoints for backward compatibility (but they now return empty/full data)
  getLockedBatches: companyProcedure
    .query(async ({ ctx }) => {
      // No more locked batches - return empty array
      return [];
    }),

  getUnlockedBatches: companyProcedure
    .query(async ({ ctx }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }
      // Return all batches with full details
      const batches = await batchDb.getBatchesForCompany(company.id);
      return batches;
    }),

  /**
   * Get specific batch details
   * If locked, only shows count; if unlocked, shows full details
   */
  getBatchDetails: companyProcedure
    .input(z.object({ batchId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch || batch.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // If locked, hide candidate details
      if (!batch.unlocked) {
        return {
          ...batch,
          candidate_count: batch.batch_size,
          candidate_ids: [],
          candidates: [],
        };
      }

      // If unlocked, return full details
      const candidates = await db.getCandidatesByIds(batch.candidate_ids);
      return {
        ...batch,
        candidates,
      };
    }),

  /**
   * Pay for batch to unlock candidate details
   * This creates/updates the payment record
   * The actual unlock happens via database trigger when payment is confirmed
   */
  payForBatch: companyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
      paymentMethod: z.enum(["pix", "boleto", "credit-card", "bank-transfer"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch || batch.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (batch.unlocked) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Batch already unlocked",
        });
      }

      // In a real implementation, integrate with payment gateway here
      // For now, we return the payment ID for manual confirmation
      // The payment was already created when the batch was sent

      return {
        success: true,
        paymentId: batch.payment_id,
        amount: batch.unlock_fee,
        method: input.paymentMethod,
        message: "Use confirmPaymentMade to confirm payment after completion",
      };
    }),

  /**
   * Get contract templates for an unlocked batch
   * Shows contract templates for all employee types in the batch
   */
  getBatchContracts: companyProcedure
    .input(z.object({ batchId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch || batch.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (!batch.unlocked) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Batch not unlocked. Pay to view contracts.",
        });
      }

      // Get candidates in batch
      const candidates = await db.getCandidatesByIds(batch.candidate_ids);

      // Determine which employee types are in the batch
      const employeeTypes = new Set<string>();
      candidates.forEach((c: any) => {
        if (c.available_for_internship) employeeTypes.add("estagio");
        if (c.available_for_clt) employeeTypes.add("clt");
        if (c.available_for_apprentice) employeeTypes.add("menor-aprendiz");
      });

      // Get contract templates for these employee types
      const contracts = await batchDb.getAgencyContractsByTypes(
        batch.agency_id,
        Array.from(employeeTypes)
      );

      return {
        contracts,
        employeeTypesInBatch: Array.from(employeeTypes),
      };
    }),

  /**
   * Select candidates for interview from a batch
   * Company confirms which candidates they want to interview after reviewing
   */
  selectCandidatesForInterview: companyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
      candidateIds: z.array(z.string().uuid()).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch || batch.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (!batch.unlocked) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot select candidates from locked batch",
        });
      }

      // Verify all selected candidates are in the batch
      const invalidIds = input.candidateIds.filter(
        (id) => !batch.candidate_ids.includes(id)
      );
      if (invalidIds.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Some candidate IDs are not in this batch",
        });
      }

      await batchDb.selectCandidatesForInterview(input.batchId, input.candidateIds);

      // Notify agency
      const agency2 = await db.getAgencyById(batch.agency_id);
      if (agency2) {
        await db.createNotification({
          user_id: agency2.user_id,
          title: "Empresa selecionou candidatos",
          message: `${input.candidateIds.length} candidatos foram selecionados para entrevistas da vaga "${batch.job.title}"`,
          type: "success",
          related_to_type: "batch",
          related_to_id: input.batchId,
        });
      }

      return { success: true, selectedCount: input.candidateIds.length };
    }),

  /**
   * Get batch statistics for company
   */
  getCompanyBatchStats: companyProcedure
    .query(async ({ ctx }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      const stats = await batchDb.getCompanyBatchStats(company.id);
      return stats;
    }),

  // ============================================
  // SHARED ENDPOINTS (agency + admin)
  // ============================================

  getBatchesByJobId: agencyProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      // Platform admins see the job's groups whether or not they have an agency
      // selected. Throwing here is what hid the Gerenciar Grupo step entirely
      // from head office in "all agencies" mode.
      if (isPlatformAdmin(ctx.user.role)) {
        return await batchDb.getBatchesByJobId(input.jobId);
      }
      if (!agency) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }
      const batches = await batchDb.getBatchesByJobId(input.jobId);
      return batches.filter((b: any) => b.agency_id === agency.id);
    }),

  getBatchSessions: agencyProcedure
    .input(z.object({ batchId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertAgencyOwnsBatch(ctx, input.batchId);
      const { getInterviewSessionsByBatch } = await import("../db/interviews");
      return await getInterviewSessionsByBatch(input.batchId);
    }),

  getCompanyInterviewSessions: agencyProcedure
    .input(z.object({ batchId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertAgencyOwnsBatch(ctx, input.batchId);
      const { getCompanyInterviewSessionsByBatch } = await import("../db/interviews");
      return await getCompanyInterviewSessionsByBatch(input.batchId);
    }),

  markSessionAttendance: agencyProcedure
    .input(z.object({
      sessionId: z.string().uuid(),
      attendance: z.array(z.object({
        participantId: z.string().uuid(),
        status: z.enum(["attended", "no_show"]),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertAgencyOwnsSession(ctx, input.sessionId);
      const { markSessionAttendance } = await import("../db/interviews");
      await markSessionAttendance(input.sessionId, input.attendance);
      return { success: true };
    }),

  updateMeetingLink: agencyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
      meetingLink: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertAgencyOwnsBatch(ctx, input.batchId);

      await batchDb.updateBatch(input.batchId, {
        meeting_link: input.meetingLink,
      });
      return { success: true };
    }),

  updateSessionMeetingLink: agencyProcedure
    .input(z.object({
      sessionId: z.string().uuid(),
      meetingLink: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertAgencyOwnsSession(ctx, input.sessionId);
      const { data, error } = await supabaseAdmin
        .from("interview_sessions")
        .update({ meeting_link: input.meetingLink })
        .eq("id", input.sessionId)
        .select("id")
        .single();

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update meeting link" });
      }
      return { success: true };
    }),

  addCandidatesToBatch: agencyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
      candidateIds: z.array(z.string().uuid()),
    }))
    .mutation(async ({ ctx, input }) => {
      const batch = await assertAgencyOwnsBatch(ctx, input.batchId);

      const existingIds = batch.candidate_ids || [];
      const newIds = [...new Set([...existingIds, ...input.candidateIds])];

      await batchDb.updateBatch(input.batchId, {
        candidate_ids: newIds,
        batch_size: newIds.length,
      });
      return { success: true };
    }),

  scheduleCompanyInterview: agencyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
      candidateIds: z.array(z.string().uuid()),
      interviewType: z.enum(['online', 'in_person']),
      sessionFormat: z.enum(['group', 'individual']),
      scheduledAt: z.string(),
      durationMinutes: z.number().default(30),
      locationAddress: z.string().optional(),
      locationCity: z.string().optional(),
      locationState: z.string().optional(),
      notes: z.string().optional(),
      candidateSchedules: z.array(z.object({
        candidateId: z.string().uuid(),
        scheduledAt: z.string(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { createPreSelectionSession } = await import("../db/interviews");

      const batch = await assertAgencyOwnsBatch(ctx, input.batchId);

      if (input.sessionFormat === 'individual' && input.candidateSchedules?.length) {
        for (const cs of input.candidateSchedules) {
          await createPreSelectionSession({
            batchId: input.batchId,
            jobId: batch.job_id,
            companyId: batch.company_id,
            interviewType: input.interviewType,
            sessionFormat: 'individual',
            interviewStage: 'company_interview',
            scheduledAt: cs.scheduledAt,
            durationMinutes: input.durationMinutes,
            locationAddress: input.locationAddress,
            locationCity: input.locationCity,
            locationState: input.locationState,
            notes: input.notes,
            candidates: [{ candidateId: cs.candidateId, applicationId: null }],
          });
        }
      } else {
        await createPreSelectionSession({
          batchId: input.batchId,
          jobId: batch.job_id,
          companyId: batch.company_id,
          interviewType: input.interviewType,
          sessionFormat: input.sessionFormat,
          interviewStage: 'company_interview',
          scheduledAt: input.scheduledAt,
          durationMinutes: input.durationMinutes,
          locationAddress: input.locationAddress,
          locationCity: input.locationCity,
          locationState: input.locationState,
          notes: input.notes,
          candidates: input.candidateIds.map(id => ({ candidateId: id, applicationId: null })),
        });
      }

      // Auto-send batch to company if still in draft
      if (batch.status === 'draft') {
        await batchDb.updateBatch(input.batchId, {
          status: 'sent',
          sent_at: new Date().toISOString(),
        } as any);
      }

      // Fix E: this path used to schedule interviews SILENTLY (no notification,
      // no email) while the UI toast falsely claimed the company was notified.
      // Notify every scheduled candidate + the company, in-app + email.
      try {
        const [job, company] = await Promise.all([
          db.getJobById(batch.job_id),
          db.getCompanyById(batch.company_id),
        ]);
        const jobTitle = (job as any)?.title || "a vaga";
        const scheduleMap = new Map<string, string>();
        if (input.sessionFormat === "individual" && input.candidateSchedules?.length) {
          for (const cs of input.candidateSchedules) scheduleMap.set(cs.candidateId, cs.scheduledAt);
        }
        const typeStr = input.interviewType === "online" ? "online" : "presencial";
        const locStr =
          input.interviewType === "in_person" && (input.locationAddress || input.locationCity)
            ? ` Local: ${[input.locationAddress, input.locationCity, input.locationState].filter(Boolean).join(", ")}.`
            : "";
        const fmt = (iso: string) => {
          const d = new Date(iso);
          return isNaN(d.getTime()) ? "" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
        };
        for (const candId of input.candidateIds) {
          const at = fmt(scheduleMap.get(candId) || input.scheduledAt);
          const cand = await db.getCandidateById(candId);
          await notifyCandidate(cand as any, {
            title: "Entrevista agendada",
            message: `Sua entrevista para "${jobTitle}" foi agendada (${typeStr})${at ? " para " + at : ""}.${locStr} Confira os detalhes no seu portal.`,
            type: "info",
            relatedType: "batch",
            relatedId: input.batchId,
            emailSubject: `Entrevista agendada — ${jobTitle}`,
            emailHtml: `<p>Olá ${(cand as any)?.full_name || "Candidato"},</p>
              <p>Sua entrevista para a vaga <strong>"${jobTitle}"</strong> foi agendada (${typeStr})${at ? " para <strong>" + at + "</strong>" : ""}.${locStr}</p>
              <p>Acesse o portal ANEC para ver todos os detalhes${input.interviewType === "online" ? " e o link da chamada" : ""}.</p>`,
          });
        }
        await notifyCompany(company as any, {
          title: "Entrevista agendada",
          message: `Uma entrevista foi agendada para candidato(s) da vaga "${jobTitle}"${fmt(input.scheduledAt) ? " em " + fmt(input.scheduledAt) : ""}.`,
          relatedType: "batch",
          relatedId: input.batchId,
        });
      } catch (e: any) {
        console.error("[scheduleCompanyInterview] notify failed:", e?.message);
      }

      return { success: true };
    }),

  removeCandidateFromBatch: agencyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
      candidateId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const batch = await assertAgencyOwnsBatch(ctx, input.batchId);

      const newIds = (batch.candidate_ids || []).filter((id: string) => id !== input.candidateId);
      await batchDb.updateBatch(input.batchId, {
        candidate_ids: newIds,
        batch_size: newIds.length,
      });
      return { success: true };
    }),

  schedulePreSelectionSessions: agencyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
      candidateIds: z.array(z.string().uuid()),
      interviewType: z.enum(['online', 'in_person']),
      sessionFormat: z.enum(['group', 'individual']),
      scheduledAt: z.string(),
      durationMinutes: z.number().default(30),
      locationAddress: z.string().optional(),
      locationCity: z.string().optional(),
      locationState: z.string().optional(),
      meetingLink: z.string().optional(),
      notes: z.string().optional(),
      candidateSchedules: z.array(z.object({
        candidateId: z.string().uuid(),
        scheduledAt: z.string(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { createPreSelectionSession } = await import("../db/interviews");

      const batch = await assertAgencyOwnsBatch(ctx, input.batchId);

      if (input.sessionFormat === 'individual' && input.candidateSchedules?.length) {
        // Create individual sessions for each candidate
        const sessions = [];
        for (const cs of input.candidateSchedules) {
          const session = await createPreSelectionSession({
            batchId: input.batchId,
            jobId: batch.job_id,
            companyId: batch.company_id,
            interviewType: input.interviewType,
            sessionFormat: 'individual',
            scheduledAt: cs.scheduledAt,
            durationMinutes: input.durationMinutes,
            locationAddress: input.locationAddress,
            locationCity: input.locationCity,
            locationState: input.locationState,
            meetingLink: input.meetingLink,
            notes: input.notes,
            candidates: [{ candidateId: cs.candidateId, applicationId: null }],
          });
          sessions.push(session);
        }
        return { success: true, sessionsCreated: sessions.length };
      } else {
        // Create one group session with all candidates
        const session = await createPreSelectionSession({
          batchId: input.batchId,
          jobId: batch.job_id,
          companyId: batch.company_id,
          interviewType: input.interviewType,
          sessionFormat: input.sessionFormat,
          scheduledAt: input.scheduledAt,
          durationMinutes: input.durationMinutes,
          locationAddress: input.locationAddress,
          locationCity: input.locationCity,
          locationState: input.locationState,
          meetingLink: input.meetingLink,
          notes: input.notes,
          candidates: input.candidateIds.map(id => ({ candidateId: id, applicationId: null })),
        });
        return { success: true, sessionsCreated: 1 };
      }
    }),

  /**
   * Generate a candidate card PDF for download
   */
  generateCandidateCardPdf: companyProcedure
    .input(z.object({
      candidateId: z.string().uuid(),
      batchId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }

      // Verify company owns this batch
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company || batch.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      // Verify candidate is in this batch
      if (!batch.candidate_ids?.includes(input.candidateId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not in batch" });
      }

      const candidate = await db.getCandidateById(input.candidateId);
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not found" });
      }

      // Get interview session for this batch/candidate
      const sessions = await db.getInterviewSessionsByBatch(input.batchId);
      const session = sessions.find((s: any) =>
        s.participants?.some((p: any) => p.candidate_id === input.candidateId)
      );

      // Calculate age
      let age = null;
      const birthDate = candidate.birth_date || candidate.date_of_birth;
      if (birthDate) {
        const bd = new Date(birthDate);
        const today = new Date();
        age = today.getFullYear() - bd.getFullYear();
        const monthDiff = today.getMonth() - bd.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < bd.getDate())) {
          age--;
        }
      }

      const pdfBytes = await generateCandidateCardPdf({
        name: candidate.full_name,
        city: candidate.city,
        state: candidate.state,
        age,
        education: candidate.education_level,
        institution: candidate.institution,
        course: candidate.course,
        skills: candidate.skills,
        languages: candidate.languages,
        experience: candidate.experience,
        summary: candidate.summary || candidate.profile_summary,
        disc_dominante: candidate.disc_dominante,
        disc_influente: candidate.disc_influente,
        disc_estavel: candidate.disc_estavel,
        disc_conforme: candidate.disc_conforme,
        pdp_top_10_competencies: candidate.pdp_top_10_competencies,
        pdp_develop_competencies: candidate.pdp_develop_competencies,
        interview: session ? {
          interview_type: session.interview_type,
          scheduled_at: session.scheduled_at,
          duration_minutes: session.duration_minutes,
          location_address: session.location_address,
          location_city: session.location_city,
          location_state: session.location_state,
          meeting_link: session.meeting_link,
        } : null,
        matchScore: null,
        jobTitle: batch.job?.title || null,
      });

      const safeName = candidate.full_name?.replace(/[^a-zA-Z0-9]/g, "_") || "candidato";
      return {
        base64: Buffer.from(pdfBytes).toString("base64"),
        filename: `${safeName}_ficha.pdf`,
      };
    }),
});
