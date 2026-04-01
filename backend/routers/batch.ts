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

      // Get match score from job_matches
      const { data: batch } = await supabaseAdmin
        .from('candidate_batches')
        .select('job_id')
        .eq('id', input.batchId)
        .single();

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

      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }

      if (job.agency_id !== agency.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Create batch
      const batchId = await batchDb.createBatch({
        jobId: input.jobId,
        agencyId: agency.id,
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

      // Create notification for company
      await db.createNotification({
        user_id: batch.company.user_id,
        title: "Novos candidatos disponíveis",
        message: `${batch.batch_size} candidatos foram selecionados para a vaga "${batch.job.title}". Acesse o portal para revisar.`,
        type: "info",
        related_to_type: "batch",
        related_to_id: input.batchId,
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
      if (!agency) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }

      const batches = await batchDb.getBatchesByJobId(input.jobId);
      // Filter to only this agency's batches (unless admin)
      if (ctx.user.role !== "admin") {
        return batches.filter((b: any) => b.agency_id === agency.id);
      }
      return batches;
    }),

  getBatchSessions: agencyProcedure
    .input(z.object({ batchId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { getInterviewSessionsByBatch } = await import("../db/interviews");
      return await getInterviewSessionsByBatch(input.batchId);
    }),

  getCompanyInterviewSessions: agencyProcedure
    .input(z.object({ batchId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
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
      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }

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
      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }

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
    .mutation(async ({ input }) => {
      const { createPreSelectionSession } = await import("../db/interviews");

      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: 'NOT_FOUND', message: 'Batch not found' });

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

      return { success: true };
    }),

  removeCandidateFromBatch: agencyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
      candidateId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: 'NOT_FOUND', message: 'Batch not found' });

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
    .mutation(async ({ input }) => {
      const { createPreSelectionSession } = await import("../db/interviews");

      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch) throw new TRPCError({ code: 'NOT_FOUND', message: 'Batch not found' });

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
