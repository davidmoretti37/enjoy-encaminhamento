// @ts-nocheck
// Batch router - candidate batch management and payment
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { agencyProcedure, candidateProcedure, companyProcedure, adminProcedure } from "./procedures";
import * as db from "../db";
import * as batchDb from "../db/batches";
import * as interviewDb from "../db/interviews";
import { sendEmail } from "./email";
import { ENV } from "../_core/env";

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
      const agency = await db.getAgencyByUserId(ctx.user.id);
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

      // For admins, use the job's agency; for agency users, verify they own the job
      let agencyId: string;

      if (ctx.user.role === "admin") {
        // Admin can create batch for any job, use the job's agency
        agencyId = job.agency_id;
      } else {
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
        }
        if (job.agency_id !== agency.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        agencyId = agency.id;
      }

      // Create batch
      const batchId = await batchDb.createBatch({
        jobId: input.jobId,
        agencyId: agencyId,
        companyId: job.company_id,
        candidateIds: input.candidateIds,
        unlockFee: input.unlockFee || 0,
        status: "draft",
      });

      // Update job status to show progress (step 3: Pré-seleção em andamento)
      await db.updateJob(input.jobId, { status: "in_selection" });

      // Get company to send notification
      const company = await db.getCompanyById(job.company_id);
      if (company?.user_id) {
        await db.createNotification({
          user_id: company.user_id,
          title: "Pré-seleção em andamento",
          message: `Estamos selecionando os melhores candidatos para a vaga "${job.title}". Em breve você receberá a lista.`,
          type: "info",
          related_to_type: "job",
          related_to_id: input.jobId,
        });
      }

      // Create applications and notify candidates added to the group
      const candidates = await db.getCandidatesByIds(input.candidateIds);
      for (const candidateId of input.candidateIds) {
        // Create or update application so the candidate's funnel shows this job
        const existingApp = await db.getApplicationByJobAndCandidate(input.jobId, candidateId);
        if (!existingApp) {
          await db.createApplication({
            job_id: input.jobId,
            candidate_id: candidateId,
            status: "screening",
          });
        } else if (existingApp.status === "applied") {
          await db.updateApplication(existingApp.id, { status: "screening" });
        }

        // Notify the candidate
        const candidate = candidates.find((c: any) => c.id === candidateId);
        if (candidate?.user_id) {
          await db.createNotification({
            user_id: candidate.user_id,
            title: "Você foi pré-selecionado para uma vaga",
            message: `Parabéns! Você foi pré-selecionado para a vaga "${job.title}". Acesse seu portal para acompanhar o processo.`,
            type: "success",
            related_to_type: "job",
            related_to_id: input.jobId,
          });
        }
      }

      return { batchId, success: true };
    }),

  /**
   * Add candidates to an existing batch for a job
   */
  addCandidatesToBatch: agencyProcedure
    .input(z.object({
      jobId: z.string().uuid(),
      candidateIds: z.array(z.string().uuid()).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const batches = await batchDb.getBatchesByJobId(input.jobId);
      const batch = batches.find((b: any) => b.status === 'draft') ||
                    batches.find((b: any) => b.status === 'active') ||
                    batches[0];

      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Nenhum grupo encontrado para esta vaga" });
      }

      await batchDb.addCandidatesToBatch(batch.id, input.candidateIds);

      // Create applications and notify newly added candidates
      const job = await db.getJobById(input.jobId);
      const candidates = await db.getCandidatesByIds(input.candidateIds);
      for (const candidateId of input.candidateIds) {
        const existingApp = await db.getApplicationByJobAndCandidate(input.jobId, candidateId);
        if (!existingApp) {
          await db.createApplication({
            job_id: input.jobId,
            candidate_id: candidateId,
            status: "screening",
          });
        } else if (existingApp.status === "applied") {
          await db.updateApplication(existingApp.id, { status: "screening" });
        }

        const candidate = candidates.find((c: any) => c.id === candidateId);
        if (candidate?.user_id && job) {
          await db.createNotification({
            user_id: candidate.user_id,
            title: "Você foi pré-selecionado para uma vaga",
            message: `Parabéns! Você foi pré-selecionado para a vaga "${job.title}". Acesse seu portal para acompanhar o processo.`,
            type: "success",
            related_to_type: "job",
            related_to_id: input.jobId,
          });
        }
      }

      return { success: true, batchId: batch.id };
    }),

  /**
   * Send batch to company
   * Creates payment requirement and updates batch status
   */
  sendBatchToCompany: agencyProcedure
    .input(z.object({
      batchId: z.string().uuid().optional(),
      jobId: z.string().uuid().optional(),
      candidateIds: z.array(z.string().uuid()).min(1).optional(),
      unlockFee: z.number().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      // For admins, we don't require an agency - they can send any batch
      let agency = null;
      if (ctx.user.role !== "admin") {
        agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
        }
      }

      let batchId = input.batchId;

      // If no batchId provided, create a new batch
      if (!batchId && input.jobId && input.candidateIds) {
        const job = await db.getJobById(input.jobId);
        if (!job) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        }

        if (ctx.user.role !== "admin" && agency && job.agency_id !== agency.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        // Create batch first
        batchId = await batchDb.createBatch({
          jobId: input.jobId,
          agencyId: job.agency_id, // Use job's agency
          companyId: job.company_id,
          candidateIds: input.candidateIds,
          unlockFee: input.unlockFee,
          status: "draft",
        });
      }

      if (!batchId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Must provide either batchId or (jobId + candidateIds)",
        });
      }

      // Verify batch belongs to agency (skip for admins)
      let batch = await batchDb.getBatchById(batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }

      if (ctx.user.role !== "admin" && agency && batch.agency_id !== agency.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // If candidateIds provided, update the batch with selected candidates
      if (input.candidateIds && input.candidateIds.length > 0) {
        await batchDb.updateBatch(batchId, {
          candidate_ids: input.candidateIds,
          batch_size: input.candidateIds.length,
        });
        // Refresh batch data after update
        batch = await batchDb.getBatchById(batchId);
      }

      // Send batch (updates status)
      const paymentId = await batchDb.sendBatchToCompany(batchId, input.unlockFee);

      // Immediately forward to company (makes candidates visible)
      await batchDb.forwardBatchToCompany(batchId);

      // Update job status to show progress
      await db.updateJob(batch.job.id, { status: "list_sent" });

      // Create notification for company
      await db.createNotification({
        user_id: batch.company.user_id,
        title: "Candidatos e entrevistas agendadas",
        message: `${batch.batch_size} candidato(s) foram selecionados para a vaga "${batch.job.title}" com entrevistas agendadas. Acesse para ver os perfis completos e detalhes das entrevistas.`,
        type: "success",
        related_to_type: "batch",
        related_to_id: batchId,
      });

      // Send email to company
      if (batch.company.email) {
        const companyEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0A2342, #FF6B35); color: white; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">Candidatos e Entrevistas Agendadas</h1>
            </div>
            <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p>Olá,</p>
              <p><strong>${batch.batch_size} candidato(s)</strong> foram selecionados para a vaga <strong>"${batch.job.title}"</strong>.</p>
              <p>As entrevistas já foram agendadas pela nossa equipe. Acesse a plataforma para:</p>
              <ul>
                <li>Ver os perfis completos dos candidatos (DISC, competências, currículo)</li>
                <li>Conferir os horários das entrevistas agendadas</li>
                <li>Baixar o cartão do candidato em PDF</li>
              </ul>
              <div style="margin: 24px 0;">
                <a href="${ENV.appUrl}/company"
                   style="background: linear-gradient(135deg, #1B4D7A, #FF6B35); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                  Ver Candidatos e Entrevistas
                </a>
              </div>
            </div>
          </div>
        `;

        await sendEmail(
          batch.company.email,
          `Candidatos e entrevistas agendadas - "${batch.job.title}"`,
          companyEmailHtml
        ).catch(err => console.error("[Batch] Failed to send company email:", err));
      }

      // Get candidates in the batch and notify them
      const candidates = await db.getCandidatesByIds(batch.candidate_ids);

      for (const candidate of candidates) {
        // Create in-app notification for candidate
        await db.createNotification({
          user_id: candidate.user_id,
          title: "Seu perfil foi enviado para a empresa",
          message: `Seu perfil foi encaminhado para a empresa ${batch.company.company_name} para a vaga "${batch.job.title}". Fique atento aos próximos passos!`,
          type: "success",
          related_to_type: "batch",
          related_to_id: batchId,
        });

        // Send email to candidate
        if (candidate.email) {
          const candidateEmailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937;">Você foi pré-selecionado!</h2>
              <p>Olá ${candidate.full_name},</p>
              <p>Parabéns! Você foi <strong>pré-selecionado</strong> para a vaga:</p>
              <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin: 0 0 8px 0; color: #1f2937;">${batch.job.title}</h3>
                <p style="margin: 0; color: #6b7280;">Empresa: ${batch.company.company_name}</p>
              </div>
              <p>A empresa receberá seu perfil e poderá entrar em contato para os próximos passos do processo seletivo.</p>
              <div style="margin: 24px 0;">
                <a href="${ENV.appUrl}/candidate"
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Acessar Minha Conta
                </a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                Boa sorte no processo seletivo!
              </p>
            </div>
          `;

          await sendEmail(
            candidate.email,
            `Você foi pré-selecionado para "${batch.job.title}"`,
            candidateEmailHtml
          ).catch(err => console.error("[Batch] Failed to send candidate email:", err));
        }
      }

      // Update candidate applications to "interview-scheduled" status (moves to Entrevista step)
      await db.updateApplicationsByCandidateIds(batch.job.id, batch.candidate_ids, "interview-scheduled");

      return { success: true, paymentId, batchId };
    }),

  /**
   * Forward batch to company
   * Makes candidates visible to the company after agency review
   */
  forwardToCompany: agencyProcedure
    .input(z.object({ batchId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      let agency = null;
      if (ctx.user.role !== "admin") {
        agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
        }
      }

      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }
      if (ctx.user.role !== "admin" && agency && batch.agency_id !== agency.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await batchDb.forwardBatchToCompany(input.batchId);

      // Advance candidates to interview-scheduled (moves them to Entrevista step)
      if (batch.candidate_ids && batch.candidate_ids.length > 0 && batch.job_id) {
        await db.updateApplicationsByCandidateIds(batch.job_id, batch.candidate_ids, "interview-scheduled");
      }

      // Notify company
      if (batch.company?.user_id) {
        await db.createNotification({
          user_id: batch.company.user_id,
          title: "Candidatos disponíveis",
          message: `${batch.batch_size} candidatos foram encaminhados para a vaga "${batch.job?.title}". Acesse para visualizar os perfis.`,
          type: "success",
          related_to_type: "batch",
          related_to_id: input.batchId,
        });
      }

      return { success: true };
    }),

  /**
   * Schedule meeting with candidates for a batch
   * Agency schedules a meeting to evaluate candidates before forwarding to company
   */
  scheduleBatchMeeting: agencyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
      interviewType: z.enum(["online", "in_person"]).default("online"),
      scheduledAt: z.string().datetime(),
      durationMinutes: z.number().int().min(15).max(180).optional().default(30),
      customMeetingLink: z.string().optional(),
      locationAddress: z.string().optional(),
      locationCity: z.string().optional(),
      locationState: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // For admins, skip agency check
      let agency = null;
      if (ctx.user.role !== "admin") {
        agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
        }
      }

      // Verify batch exists and belongs to agency
      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }
      if (ctx.user.role !== "admin" && agency && batch.agency_id !== agency.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // No meeting link at scheduling time — agency adds it later
      const meetingLink = undefined;

      // Update batch with meeting details
      await batchDb.scheduleBatchMeeting(
        input.batchId,
        input.scheduledAt,
        meetingLink,
        input.notes
      );

      // Format date for emails
      const scheduledDate = new Date(input.scheduledAt);
      const formattedDate = scheduledDate.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const formattedTime = scheduledDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Send email and notification to each candidate
      const candidates = await db.getCandidatesByIds(batch.candidate_ids);

      for (const candidate of candidates) {
        // In-app notification
        await db.createNotification({
          user_id: candidate.user_id,
          title: "Reunião agendada",
          message: `Você foi convidado para uma reunião sobre a vaga "${batch.job.title}" em ${formattedDate} às ${formattedTime}. O link será enviado em breve.`,
          type: "info",
          related_to_type: "batch",
          related_to_id: input.batchId,
        });

        // Email notification
        if (candidate.email) {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #0A2342, #FF6B35); color: white; padding: 24px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 20px;">Reunião Agendada</h1>
              </div>
              <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                <p>Olá ${candidate.full_name || "Candidato"},</p>
                <p>Você foi convidado para uma reunião referente à vaga <strong>"${batch.job.title}"</strong>.</p>
                <div style="background: white; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e5e7eb;">
                  <p style="margin: 4px 0;"><strong>Data:</strong> ${formattedDate}</p>
                  <p style="margin: 4px 0;"><strong>Horário:</strong> ${formattedTime}</p>
                  <p style="margin: 4px 0;"><strong>Duração:</strong> ${input.durationMinutes} minutos</p>
                </div>
                ${input.notes ? `<p><strong>Observações:</strong> ${input.notes}</p>` : ""}
                <p style="color: #6b7280; font-size: 14px;">
                  O link da reunião será enviado em breve. Por favor, seja pontual!
                </p>
              </div>
            </div>
          `;

          await sendEmail(
            candidate.email,
            `Reunião agendada - Vaga "${batch.job.title}"`,
            emailHtml
          ).catch(err => console.error("[Batch] Failed to send meeting email:", err));
        }
      }

      return { success: true, scheduledAt: input.scheduledAt };
    }),

  /**
   * Update meeting link for a batch
   * Agency adds the meeting link when the time comes
   */
  updateMeetingLink: agencyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
      meetingLink: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify batch exists and belongs to agency
      let agency = null;
      if (ctx.user.role !== "admin") {
        agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
        }
      }

      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }
      if (ctx.user.role !== "admin" && agency && batch.agency_id !== agency.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Update batch with meeting link
      await batchDb.updateBatch(input.batchId, {
        meeting_link: input.meetingLink,
      });

      // Notify candidates with the link
      const candidates = await db.getCandidatesByIds(batch.candidate_ids);

      for (const candidate of candidates) {
        await db.createNotification({
          user_id: candidate.user_id,
          title: "Link da reunião disponível",
          message: `O link da reunião para a vaga "${batch.job.title}" foi disponibilizado. Acesse sua candidatura para ver.`,
          type: "info",
          related_to_type: "batch",
          related_to_id: input.batchId,
        });

        if (candidate.email) {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #0A2342, #FF6B35); color: white; padding: 24px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 20px;">Link da Reunião</h1>
              </div>
              <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                <p>Olá ${candidate.full_name || "Candidato"},</p>
                <p>O link para a reunião referente à vaga <strong>"${batch.job.title}"</strong> está disponível:</p>
                <div style="margin: 24px 0;">
                  <a href="${input.meetingLink}"
                     style="background-color: #FF6B35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Entrar na Reunião
                  </a>
                </div>
                <p style="color: #6b7280; font-size: 14px;">
                  Por favor, seja pontual. Boa sorte!
                </p>
              </div>
            </div>
          `;

          await sendEmail(
            candidate.email,
            `Link da reunião - Vaga "${batch.job.title}"`,
            emailHtml
          ).catch(err => console.error("[Batch] Failed to send meeting link email:", err));
        }
      }

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
      // Admins can see all batches
      if (ctx.user.role === "admin") {
        const batches = await batchDb.getAllBatches(input?.status);
        return batches;
      }

      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
      }

      const batches = await batchDb.getBatchesByAgencyId(agency.id, input?.status);
      return batches;
    }),

  /**
   * Get batches for a specific job
   * Used by agencies to view and manage candidate groups for a job
   */
  getBatchesByJobId: agencyProcedure
    .input(z.object({
      jobId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify user has access to this job
      const job = await db.getJobById(input.jobId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      // For admins, allow access to any job
      if (ctx.user.role !== "admin") {
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
        }

        // Verify agency owns this job
        if (job.agency_id !== agency.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this job" });
        }
      }

      // Get batches with candidate data
      const batches = await batchDb.getBatchesByJobId(input.jobId);
      return batches;
    }),

  /**
   * Get batch statistics for agency
   */
  getAgencyBatchStats: agencyProcedure
    .query(async ({ ctx }) => {
      const agency = await db.getAgencyByUserId(ctx.user.id);
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
      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }

      // Admins can cancel any batch
      if (ctx.user.role === "admin") {
        await batchDb.cancelBatch(input.batchId, input.reason);
        return { success: true };
      }

      // Agency users can only cancel their own batches
      const agency = await db.getAgencyByUserId(ctx.user.id);
      if (!agency || batch.agency_id !== agency.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await batchDb.cancelBatch(input.batchId, input.reason);
      return { success: true };
    }),

  /**
   * Schedule pre-selection meetings for selected candidates in a batch
   * Supports online/in-person and group/individual formats
   */
  schedulePreSelectionSessions: agencyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
      candidateIds: z.array(z.string().uuid()).min(1),
      interviewType: z.enum(["online", "in_person"]),
      sessionFormat: z.enum(["group", "individual"]),
      scheduledAt: z.string().datetime(),
      durationMinutes: z.number().int().min(15).max(180).optional().default(30),
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
      // Verify agency access
      let agency = null;
      if (ctx.user.role !== "admin") {
        agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
        }
      }

      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }
      if (ctx.user.role !== "admin" && agency && batch.agency_id !== agency.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Verify all candidates are in the batch
      const invalidIds = input.candidateIds.filter(
        (id) => !batch.candidate_ids.includes(id)
      );
      if (invalidIds.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Alguns candidatos não pertencem a este grupo",
        });
      }

      // Try to find applications for candidates (may not exist for pre-selection)
      const candidateApplications: Array<{ candidateId: string; applicationId: string | null }> = [];
      for (const candidateId of input.candidateIds) {
        const application = await db.getApplicationByJobAndCandidate(batch.job_id, candidateId);
        candidateApplications.push({
          candidateId,
          applicationId: application?.id || null,
        });
      }

      const createdSessions: string[] = [];

      if (input.sessionFormat === "group") {
        // Create 1 session with all candidates as participants
        const meetingLink = input.interviewType === "online"
          ? `https://meet.jit.si/enjoy-preselecao-${input.batchId.slice(0, 8)}-${Date.now().toString(36)}`
          : undefined;

        const session = await interviewDb.createPreSelectionSession({
          batchId: input.batchId,
          jobId: batch.job_id,
          companyId: batch.company_id,
          interviewType: input.interviewType,
          sessionFormat: "group",
          scheduledAt: input.scheduledAt,
          durationMinutes: input.durationMinutes,
          locationAddress: input.interviewType === "in_person" ? input.locationAddress : undefined,
          locationCity: input.interviewType === "in_person" ? input.locationCity : undefined,
          locationState: input.interviewType === "in_person" ? input.locationState : undefined,
          meetingLink,
          notes: input.notes,
          candidates: candidateApplications,
        });

        createdSessions.push(session.id);
      } else {
        // Individual: create 1 session per candidate
        const scheduleMap = new Map(
          (input.candidateSchedules || []).map((s) => [s.candidateId, s.scheduledAt])
        );
        for (const ca of candidateApplications) {
          const candidateScheduledAt = scheduleMap.get(ca.candidateId) || input.scheduledAt;
          const meetingLink = input.interviewType === "online"
            ? `https://meet.jit.si/enjoy-preselecao-${ca.candidateId.slice(0, 8)}-${Date.now().toString(36)}`
            : undefined;

          const session = await interviewDb.createPreSelectionSession({
            batchId: input.batchId,
            jobId: batch.job_id,
            companyId: batch.company_id,
            interviewType: input.interviewType,
            sessionFormat: "individual",
            scheduledAt: candidateScheduledAt,
            durationMinutes: input.durationMinutes,
            locationAddress: input.interviewType === "in_person" ? input.locationAddress : undefined,
            locationCity: input.interviewType === "in_person" ? input.locationCity : undefined,
            locationState: input.interviewType === "in_person" ? input.locationState : undefined,
            meetingLink,
            notes: input.notes,
            candidates: [ca],
          });

          createdSessions.push(session.id);
        }
      }

      // Update batch status
      await batchDb.updateBatch(input.batchId, {
        status: "meeting_scheduled",
        meeting_scheduled_at: input.scheduledAt,
        meeting_notes: input.notes,
      });

      // Format date for notifications
      const scheduledDate = new Date(input.scheduledAt);
      const formattedDate = scheduledDate.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const formattedTime = scheduledDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const typeLabel = input.interviewType === "online" ? "online" : "presencial";
      const formatLabel = input.sessionFormat === "group" ? "em grupo" : "individual";

      // Notify candidates
      const candidates = await db.getCandidatesByIds(input.candidateIds);
      for (const candidate of candidates) {
        await db.createNotification({
          user_id: candidate.user_id,
          title: "Reuniao agendada",
          message: `Voce foi convidado para uma reuniao ${typeLabel} (${formatLabel}) sobre a vaga "${batch.job.title}" em ${formattedDate} as ${formattedTime}.`,
          type: "info",
          related_to_type: "batch",
          related_to_id: input.batchId,
        });

        if (candidate.email) {
          const locationInfo = input.interviewType === "in_person"
            ? `<p><strong>Local:</strong> ${input.locationAddress || "A definir"}${input.locationCity ? `, ${input.locationCity}` : ""}${input.locationState ? ` - ${input.locationState}` : ""}</p>`
            : `<p><strong>Formato:</strong> Online (link sera enviado em breve)</p>`;

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #0A2342, #FF6B35); color: white; padding: 24px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 20px;">Reuniao Agendada</h1>
              </div>
              <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                <p>Ola ${candidate.full_name || "Candidato"},</p>
                <p>Voce foi convidado para uma reuniao referente a vaga <strong>"${batch.job.title}"</strong>.</p>
                <div style="background: white; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e5e7eb;">
                  <p style="margin: 4px 0;"><strong>Data:</strong> ${formattedDate}</p>
                  <p style="margin: 4px 0;"><strong>Horario:</strong> ${formattedTime}</p>
                  <p style="margin: 4px 0;"><strong>Duracao:</strong> ${input.durationMinutes} minutos</p>
                  <p style="margin: 4px 0;"><strong>Tipo:</strong> ${input.interviewType === "online" ? "Online" : "Presencial"} - ${input.sessionFormat === "group" ? "Grupo" : "Individual"}</p>
                  ${locationInfo}
                </div>
                ${input.notes ? `<p><strong>Observacoes:</strong> ${input.notes}</p>` : ""}
                <p style="color: #6b7280; font-size: 14px;">
                  ${input.interviewType === "online" ? "O link da reuniao sera enviado em breve. " : ""}Por favor, seja pontual!
                </p>
              </div>
            </div>
          `;

          await sendEmail(
            candidate.email,
            `Reuniao agendada - Vaga "${batch.job.title}"`,
            emailHtml
          ).catch(err => console.error("[Batch] Failed to send meeting email:", err));
        }
      }

      return {
        success: true,
        sessionIds: createdSessions,
        candidateCount: input.candidateIds.length,
      };
    }),

  /**
   * Get all interview sessions for a batch
   * Used by agencies to see per-candidate meeting assignments
   */
  getBatchSessions: agencyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify agency access
      if (ctx.user.role !== "admin") {
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
        }

        const batch = await batchDb.getBatchById(input.batchId);
        if (!batch || batch.agency_id !== agency.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      return await interviewDb.getInterviewSessionsByBatch(input.batchId);
    }),

  /**
   * Agency marks attendance for a pre-selection session
   * Moves participants to "attended" or "no_show" status
   */
  markSessionAttendance: agencyProcedure
    .input(z.object({
      sessionId: z.string().uuid(),
      attendees: z.array(z.object({
        participantId: z.string().uuid(),
        attended: z.boolean(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify agency access to this session
      const session = await interviewDb.getInterviewSessionById(input.sessionId);
      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      if (ctx.user.role !== "admin") {
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
        }
        const batch = await batchDb.getBatchById(session.batch_id);
        if (!batch || batch.agency_id !== agency.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      // Update each participant's status
      for (const attendee of input.attendees) {
        const newStatus = attendee.attended ? "attended" : "no_show";
        await interviewDb.updateParticipantStatus(attendee.participantId, newStatus);

        // Advance attended candidates to "Entrevista" step
        if (attendee.attended) {
          const participant = await interviewDb.getParticipantById(attendee.participantId);
          if (participant?.application_id) {
            await db.updateApplication(participant.application_id, { status: "interview-scheduled" });
          }
        }
      }

      // Mark session as completed
      await interviewDb.updateInterviewSession(input.sessionId, {
        status: "completed",
      });

      return { success: true };
    }),

  // ============================================
  // CANDIDATE ENDPOINTS
  // ============================================

  /**
   * Get meeting info for a candidate's application
   * Returns scheduled meeting date/time and link if available
   */
  getCandidateMeetingInfo: candidateProcedure
    .input(z.object({
      jobId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const candidate = await db.getCandidateByUserId(ctx.user.id);
      if (!candidate) {
        return null;
      }

      const meetingInfo = await batchDb.getMeetingInfoForCandidate(candidate.id, input.jobId);
      return meetingInfo;
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
      console.log("[Batch] getAffiliateBatches called by user:", ctx.user.id, "role:", ctx.user.role, "input:", input);

      // If specific agency selected, filter by that agency
      if (input?.agencyId) {
        console.log("[Batch] Filtering by agency:", input.agencyId);
        const batches = await batchDb.getBatchesByAgencyId(input.agencyId, input?.status);
        return batches;
      }

      // Admin sees ALL batches (no affiliate filtering - affiliates don't exist anymore)
      console.log("[Batch] Getting ALL batches for admin");
      const batches = await batchDb.getAllBatches(input?.status);
      console.log("[Batch] Returning", batches.length, "batches");
      return batches;
    }),

  // ============================================
  // COMPANY ENDPOINTS
  // ============================================

  /**
   * Get locked batches for company
   * Shows batches awaiting payment with minimal details (no candidate IDs)
   */
  getLockedBatches: companyProcedure
    .query(async ({ ctx }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      const batches = await batchDb.getLockedBatchesForCompany(company.id);
      return batches;
    }),

  /**
   * Get unlocked batches for company
   * Shows batches with full candidate details
   */
  getUnlockedBatches: companyProcedure
    .query(async ({ ctx }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      const batches = await batchDb.getUnlockedBatchesForCompany(company.id);
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

  // ============================================
  // COMPANY INTERVIEW SCHEDULING (BY AGENCY)
  // ============================================

  /**
   * Schedule company-candidate interviews (agency schedules on behalf of company)
   * This is a separate step from pre-selection meetings
   */
  scheduleCompanyInterview: agencyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
      candidateIds: z.array(z.string().uuid()).min(1),
      interviewType: z.enum(["online", "in_person"]),
      sessionFormat: z.enum(["group", "individual"]),
      scheduledAt: z.string().datetime(),
      durationMinutes: z.number().int().min(15).max(180).optional().default(30),
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
      // Verify agency access
      let agency = null;
      if (ctx.user.role !== "admin") {
        agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
        }
      }

      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
      }
      if (ctx.user.role !== "admin" && agency && batch.agency_id !== agency.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Verify all candidates are in the batch
      const invalidIds = input.candidateIds.filter(
        (id) => !batch.candidate_ids.includes(id)
      );
      if (invalidIds.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Alguns candidatos não pertencem a este grupo",
        });
      }

      // Find applications for candidates
      const candidateApplications: Array<{ candidateId: string; applicationId: string | null }> = [];
      for (const candidateId of input.candidateIds) {
        const application = await db.getApplicationByJobAndCandidate(batch.job_id, candidateId);
        candidateApplications.push({
          candidateId,
          applicationId: application?.id || null,
        });
      }

      const createdSessions: string[] = [];

      if (input.sessionFormat === "group") {
        const meetingLink = input.interviewType === "online"
          ? `https://meet.jit.si/enjoy-entrevista-${input.batchId.slice(0, 8)}-${Date.now().toString(36)}`
          : undefined;

        const session = await interviewDb.createPreSelectionSession({
          batchId: input.batchId,
          jobId: batch.job_id,
          companyId: batch.company_id,
          interviewType: input.interviewType,
          sessionFormat: "group",
          interviewStage: "company_interview",
          scheduledAt: input.scheduledAt,
          durationMinutes: input.durationMinutes,
          locationAddress: input.interviewType === "in_person" ? input.locationAddress : undefined,
          locationCity: input.interviewType === "in_person" ? input.locationCity : undefined,
          locationState: input.interviewType === "in_person" ? input.locationState : undefined,
          meetingLink,
          notes: input.notes,
          candidates: candidateApplications,
        });

        createdSessions.push(session.id);
      } else {
        const scheduleMap = new Map(
          (input.candidateSchedules || []).map((s) => [s.candidateId, s.scheduledAt])
        );
        for (const ca of candidateApplications) {
          const candidateScheduledAt = scheduleMap.get(ca.candidateId) || input.scheduledAt;
          const meetingLink = input.interviewType === "online"
            ? `https://meet.jit.si/enjoy-entrevista-${ca.candidateId.slice(0, 8)}-${Date.now().toString(36)}`
            : undefined;

          const session = await interviewDb.createPreSelectionSession({
            batchId: input.batchId,
            jobId: batch.job_id,
            companyId: batch.company_id,
            interviewType: input.interviewType,
            sessionFormat: "individual",
            interviewStage: "company_interview",
            scheduledAt: candidateScheduledAt,
            durationMinutes: input.durationMinutes,
            locationAddress: input.interviewType === "in_person" ? input.locationAddress : undefined,
            locationCity: input.interviewType === "in_person" ? input.locationCity : undefined,
            locationState: input.interviewType === "in_person" ? input.locationState : undefined,
            meetingLink,
            notes: input.notes,
            candidates: [ca],
          });

          createdSessions.push(session.id);
        }
      }

      // Update batch status and unlock for company portal
      await batchDb.updateBatch(input.batchId, {
        status: "interview_scheduled",
        unlocked: true,
        unlocked_at: new Date().toISOString(),
      });

      // Format date for notifications
      const scheduledDate = new Date(input.scheduledAt);
      const formattedDate = scheduledDate.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const formattedTime = scheduledDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const typeLabel = input.interviewType === "online" ? "online" : "presencial";

      // Notify candidates about the company interview
      const candidates = await db.getCandidatesByIds(input.candidateIds);
      for (const candidate of candidates) {
        await db.createNotification({
          user_id: candidate.user_id,
          title: "Entrevista com empresa agendada",
          message: `Sua entrevista ${typeLabel} para a vaga "${batch.job.title}" foi agendada para ${formattedDate} às ${formattedTime}.`,
          type: "success",
          related_to_type: "batch",
          related_to_id: input.batchId,
        });

        if (candidate.email) {
          const locationInfo = input.interviewType === "in_person"
            ? `<p><strong>Local:</strong> ${input.locationAddress || "A definir"}${input.locationCity ? `, ${input.locationCity}` : ""}${input.locationState ? ` - ${input.locationState}` : ""}</p>`
            : `<p><strong>Formato:</strong> Online (link será enviado em breve)</p>`;

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #0A2342, #FF6B35); color: white; padding: 24px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 20px;">Entrevista com Empresa Agendada</h1>
              </div>
              <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
                <p>Olá ${candidate.full_name || "Candidato"},</p>
                <p>Sua entrevista com a empresa para a vaga <strong>"${batch.job.title}"</strong> foi agendada!</p>
                <div style="background: white; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e5e7eb;">
                  <p style="margin: 4px 0;"><strong>Data:</strong> ${formattedDate}</p>
                  <p style="margin: 4px 0;"><strong>Horário:</strong> ${formattedTime}</p>
                  <p style="margin: 4px 0;"><strong>Duração:</strong> ${input.durationMinutes} minutos</p>
                  <p style="margin: 4px 0;"><strong>Tipo:</strong> ${input.interviewType === "online" ? "Online" : "Presencial"}</p>
                  ${locationInfo}
                </div>
                ${input.notes ? `<p><strong>Observações:</strong> ${input.notes}</p>` : ""}
              </div>
            </div>
          `;

          await sendEmail(
            candidate.email,
            `Entrevista agendada - Vaga "${batch.job.title}"`,
            emailHtml
          ).catch(err => console.error("[Batch] Failed to send company interview email:", err));
        }
      }

      // Notify company about the scheduled interviews
      const companyRecord = await db.getCompanyById(batch.company_id);
      if (companyRecord) {
        await db.createNotification({
          user_id: companyRecord.user_id,
          title: "Entrevistas agendadas",
          message: `${input.candidateIds.length} entrevista(s) foram agendadas para a vaga "${batch.job.title}" em ${formattedDate} às ${formattedTime}.`,
          type: "success",
          related_to_type: "batch",
          related_to_id: input.batchId,
        });
      }

      return {
        success: true,
        sessionIds: createdSessions,
        candidateCount: input.candidateIds.length,
      };
    }),

  /**
   * Get company interview sessions for a batch
   * Returns only company_interview stage sessions (not pre-selection)
   */
  getCompanyInterviewSessions: agencyProcedure
    .input(z.object({
      batchId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found" });
        }

        const batch = await batchDb.getBatchById(input.batchId);
        if (!batch || batch.agency_id !== agency.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      return await interviewDb.getCompanyInterviewSessionsByBatch(input.batchId);
    }),

  /**
   * Get full candidate card data for company viewing
   * Returns DISC, PDP, AI summary, resume, skills, and interview details
   */
  getCandidateCard: companyProcedure
    .input(z.object({
      candidateId: z.string().uuid(),
      batchId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      // Verify batch belongs to company and is unlocked/forwarded
      const batch = await batchDb.getBatchById(input.batchId);
      if (!batch || batch.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Verify candidate is in the batch
      if (!batch.candidate_ids?.includes(input.candidateId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not in batch" });
      }

      // Get full candidate profile (now includes PDP fields)
      const profile = await db.getCandidateProfileForCompany(input.candidateId, company.id);
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate profile not found" });
      }

      // Auto-generate AI summary if missing
      if (!profile.summary && !profile.profile_summary) {
        try {
          const { generateCandidateSummary } = await import("../services/ai/summarizer");
          const summary = await generateCandidateSummary({
            fullName: profile.name || "Candidato",
            city: profile.city || "",
            state: profile.state || "",
            educationLevel: profile.education || "",
            institution: profile.institution,
            course: profile.course,
            skills: profile.skills || [],
            languages: (profile.languages || []).map((l: any) =>
              typeof l === "string" ? l : l.language || ""
            ),
            discDominante: profile.disc_dominante,
            discInfluente: profile.disc_influente,
            discEstavel: profile.disc_estavel,
            discConforme: profile.disc_conforme,
            pdpCompetencies: profile.pdp_competencies,
            pdpTop10Competencies: profile.pdp_top_10_competencies,
            pdpDevelopCompetencies: profile.pdp_develop_competencies,
            pdpSkills: profile.pdp_skills,
          });
          // Save to DB for future views
          const { supabaseAdmin } = await import("../supabase");
          await supabaseAdmin
            .from("candidates")
            .update({ summary, summary_generated_at: new Date().toISOString() })
            .eq("id", input.candidateId);
          profile.summary = summary;
        } catch (err) {
          console.error("[getCandidateCard] Failed to auto-generate summary:", err);
        }
      }

      // Get company interview session for this candidate
      const companyInterviews = await interviewDb.getCompanyInterviewSessionsByBatch(input.batchId);
      const candidateInterview = companyInterviews.find(session =>
        session.participants?.some((p: any) => p.candidate_id === input.candidateId)
      );

      // Get match score from job_matches
      const { data: matchData } = await (await import("../supabase")).supabaseAdmin
        .from("job_matches")
        .select("composite_score")
        .eq("candidate_id", input.candidateId)
        .eq("job_id", batch.job_id)
        .single();

      return {
        profile,
        interview: candidateInterview || null,
        matchScore: matchData?.composite_score || null,
        jobTitle: batch.job?.title || "",
      };
    }),

  generateCandidateCardPdf: companyProcedure
    .input(z.object({
      candidateId: z.string().uuid(),
      batchId: z.string().uuid(),
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

      if (!batch.candidate_ids?.includes(input.candidateId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not in batch" });
      }

      const profile = await db.getCandidateProfileForCompany(input.candidateId, company.id);
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate profile not found" });
      }

      // Get company interview session
      const companyInterviews = await interviewDb.getCompanyInterviewSessionsByBatch(input.batchId);
      const candidateInterview = companyInterviews.find(session =>
        session.participants?.some((p: any) => p.candidate_id === input.candidateId)
      );

      // Get match score
      const { data: matchData } = await (await import("../supabase")).supabaseAdmin
        .from("job_matches")
        .select("composite_score")
        .eq("candidate_id", input.candidateId)
        .eq("job_id", batch.job_id)
        .single();

      const { generateCandidateCardPdf: genPdf } = await import("../lib/candidateCardPdf");

      const pdfBytes = await genPdf({
        name: (profile as any).full_name || (profile as any).name || "Candidato",
        city: (profile as any).city,
        state: (profile as any).state,
        age: (profile as any).age,
        education: (profile as any).education_level,
        institution: (profile as any).institution,
        course: (profile as any).course,
        skills: (profile as any).skills,
        languages: (profile as any).languages,
        experience: (profile as any).experience,
        summary: (profile as any).profile_summary || (profile as any).summary,
        disc_dominante: (profile as any).disc_dominante,
        disc_influente: (profile as any).disc_influente,
        disc_estavel: (profile as any).disc_estavel,
        disc_conforme: (profile as any).disc_conforme,
        pdp_top_10_competencies: (profile as any).pdp_top_10_competencies,
        pdp_develop_competencies: (profile as any).pdp_develop_competencies,
        interview: candidateInterview ? {
          interview_type: candidateInterview.interview_type,
          scheduled_at: candidateInterview.scheduled_at,
          duration_minutes: candidateInterview.duration_minutes,
          location_address: candidateInterview.location_address,
          location_city: candidateInterview.location_city,
          location_state: candidateInterview.location_state,
          meeting_link: candidateInterview.meeting_link,
        } : null,
        matchScore: matchData?.composite_score,
        jobTitle: batch.job?.title,
      });

      // Return as base64 for frontend download
      const base64 = Buffer.from(pdfBytes).toString("base64");
      return {
        base64,
        filename: `candidato-${(profile as any).full_name || "card"}.pdf`.replace(/\s+/g, "-").toLowerCase(),
      };
    }),
});
