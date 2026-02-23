// @ts-nocheck
// Batch router - candidate batch management and payment
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { agencyProcedure, companyProcedure, adminProcedure } from "./procedures";
import * as db from "../db";
import * as batchDb from "../db/batches";

export const batchRouter = router({
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
      candidates.forEach((c) => {
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
});
