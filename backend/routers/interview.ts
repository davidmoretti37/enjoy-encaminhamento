// Interview router - interview scheduling and management
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { companyProcedure, candidateProcedure } from "./procedures";
import * as db from "../db";
import * as interviewDb from "../db/interviews";
import { sendEmail } from "./email";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Generate Jitsi Meet link
function generateJitsiLink(sessionId: string): string {
  return `https://meet.jit.si/enjoy-interview-${sessionId}`;
}

export const interviewRouter = router({
  // ============================================
  // COMPANY ENDPOINTS
  // ============================================

  /**
   * Schedule an interview for selected candidates
   * Creates interview session and sends invitations
   */
  scheduleInterview: companyProcedure
    .input(z.object({
      batchId: z.string().uuid().optional(),
      jobId: z.string().uuid(),
      candidateIds: z.array(z.string().uuid()).min(1),
      interviewType: z.enum(["online", "in_person"]),
      scheduledAt: z.string().datetime(),
      durationMinutes: z.number().int().min(15).max(180).optional().default(30),
      // For in-person
      locationAddress: z.string().optional(),
      locationCity: z.string().optional(),
      locationState: z.string().optional(),
      locationNotes: z.string().optional(),
      // Notes
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get company
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      // Get job
      const job = await db.getJobById(input.jobId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      // Verify company owns this job
      if (job.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      // Get applications for these candidates
      const candidateApplications: Array<{ candidateId: string; applicationId: string }> = [];

      for (const candidateId of input.candidateIds) {
        const application = await db.getApplicationByJobAndCandidate(input.jobId, candidateId);
        if (application) {
          candidateApplications.push({
            candidateId,
            applicationId: application.id,
          });
        }
      }

      if (candidateApplications.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No valid applications found for selected candidates",
        });
      }

      // Generate meeting link for online interviews
      const sessionId = uuidv4();
      const meetingLink = input.interviewType === "online"
        ? generateJitsiLink(sessionId)
        : undefined;

      // Use company address for in-person if not provided
      const locationAddress = input.interviewType === "in_person"
        ? (input.locationAddress || (company as any).address || undefined)
        : undefined;
      const locationCity = input.interviewType === "in_person"
        ? (input.locationCity || (company as any).city || undefined)
        : undefined;
      const locationState = input.interviewType === "in_person"
        ? (input.locationState || (company as any).state || undefined)
        : undefined;

      // Create interview session
      const session = await interviewDb.createInterviewSession({
        batchId: input.batchId,
        jobId: input.jobId,
        companyId: company.id,
        interviewType: input.interviewType,
        interviewStage: 'company_interview',
        scheduledAt: input.scheduledAt,
        durationMinutes: input.durationMinutes,
        locationAddress,
        locationCity,
        locationState,
        locationNotes: input.locationNotes,
        meetingLink,
        notes: input.notes,
        candidateApplications,
      });

      // Update application status to interview-scheduled
      for (const ca of candidateApplications) {
        await db.updateApplication(ca.applicationId, {
          status: "interview-scheduled",
          interview_date: input.scheduledAt,
        });
      }

      // Update batch status if provided
      if (input.batchId) {
        await db.updateBatch(input.batchId, {
          status: "meeting_scheduled",
          selected_candidate_ids: input.candidateIds,
        } as any);
      }

      // Format date for notifications
      const formattedDate = format(new Date(input.scheduledAt), "dd 'de' MMMM 'às' HH:mm", {
        locale: ptBR,
      });

      // Send notifications to candidates
      for (const ca of candidateApplications) {
        const candidate = await db.getCandidateById(ca.candidateId);
        if (!candidate) continue;

        // In-app notification
        await db.createNotification({
          user_id: candidate.user_id,
          title: "Entrevista agendada",
          message: `Você foi convidado para uma entrevista para a vaga "${job.title}" em ${formattedDate}. Por favor, confirme sua presença.`,
          type: "info",
          related_to_type: "interview",
          related_to_id: session.id,
        });

        // Email notification
        if (candidate.email) {
          const locationInfo = input.interviewType === "online"
            ? `<p><strong>Link da reunião:</strong> <a href="${meetingLink}">${meetingLink}</a></p>`
            : `<p><strong>Local:</strong> ${locationAddress}, ${locationCity} - ${locationState}</p>${input.locationNotes ? `<p><strong>Observações:</strong> ${input.locationNotes}</p>` : ''}`;

          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
                .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
                .info-box { background: white; padding: 16px; border-radius: 6px; margin: 16px 0; border: 1px solid #e5e7eb; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin:0;">Entrevista Agendada</h1>
                </div>
                <div class="content">
                  <p>Olá ${candidate.full_name || 'Candidato'},</p>
                  <p>Você foi convidado para uma entrevista para a vaga <strong>"${job.title}"</strong>.</p>

                  <div class="info-box">
                    <p><strong>Data:</strong> ${formattedDate}</p>
                    <p><strong>Duração:</strong> ${input.durationMinutes} minutos</p>
                    <p><strong>Tipo:</strong> ${input.interviewType === 'online' ? 'Online' : 'Presencial'}</p>
                    ${locationInfo}
                  </div>

                  <p>Por favor, acesse a plataforma para confirmar sua presença.</p>

                  <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/candidate/applications" class="button">
                    Confirmar Presença
                  </a>

                  <p style="margin-top: 24px; color: #666; font-size: 14px;">
                    Se não puder comparecer na data agendada, acesse a plataforma para solicitar reagendamento.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `;

          await sendEmail(
            candidate.email,
            `Entrevista agendada - ${job.title}`,
            emailHtml
          ).catch((err) => console.error("[Email] Error sending interview invitation:", err));
        }
      }

      return {
        success: true,
        sessionId: session.id,
        meetingLink,
        participantCount: candidateApplications.length,
      };
    }),

  /**
   * Get interview sessions for company
   */
  getCompanyInterviews: companyProcedure
    .input(z.object({
      status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) return [];

      return await interviewDb.getInterviewSessionsByCompany(company.id, input?.status);
    }),

  /**
   * Cancel an interview session
   */
  cancelInterview: companyProcedure
    .input(z.object({
      sessionId: z.string().uuid(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      const session = await interviewDb.getInterviewSessionById(input.sessionId);
      if (!session || session.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      await interviewDb.cancelInterviewSession(input.sessionId);

      // Notify participants
      const participants = await interviewDb.getSessionParticipants(input.sessionId);
      for (const participant of participants) {
        if (participant.candidate?.user_id) {
          await db.createNotification({
            user_id: participant.candidate.user_id,
            title: "Entrevista cancelada",
            message: `A entrevista para a vaga "${session.job?.title}" foi cancelada.${input.reason ? ` Motivo: ${input.reason}` : ''}`,
            type: "warning",
            related_to_type: "interview",
            related_to_id: input.sessionId,
          });
        }
      }

      return { success: true };
    }),

  /**
   * Mark attendance after interview
   * Company marks which candidates attended or were no-shows
   */
  markAttendance: companyProcedure
    .input(z.object({
      sessionId: z.string().uuid(),
      attendees: z.array(z.object({
        participantId: z.string().uuid(),
        attended: z.boolean(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      // Get session and verify ownership
      const session = await interviewDb.getInterviewSessionById(input.sessionId);
      if (!session || session.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      if (session.status !== "scheduled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Attendance can only be marked for scheduled interviews",
        });
      }

      const attendedCandidates: Array<{ candidateId: string; applicationId: string; candidateName: string }> = [];

      // Update each participant's status
      for (const attendee of input.attendees) {
        const participant = await interviewDb.getParticipantById(attendee.participantId);
        if (!participant || participant.interview_session_id !== input.sessionId) {
          continue; // Skip invalid participants
        }

        const newStatus = attendee.attended ? "attended" : "no_show";
        await interviewDb.updateParticipantStatus(attendee.participantId, newStatus);

        // Update application status to 'interviewed'
        if (participant.application_id) {
          await db.updateApplication(participant.application_id, {
            status: "interviewed",
          });
        }

        // Track attended candidates for potential hiring
        if (attendee.attended) {
          const candidate = await db.getCandidateById(participant.candidate_id);
          attendedCandidates.push({
            candidateId: participant.candidate_id,
            applicationId: participant.application_id,
            candidateName: candidate?.full_name || "Candidato",
          });
        }
      }

      // Update session status to completed
      await interviewDb.updateInterviewSession(input.sessionId, {
        status: "completed",
      });

      // Notify candidates of their status
      for (const attendee of input.attendees) {
        const participant = await interviewDb.getParticipantById(attendee.participantId);
        if (!participant) continue;

        const candidate = await db.getCandidateById(participant.candidate_id);
        if (!candidate?.user_id) continue;

        if (attendee.attended) {
          await db.createNotification({
            user_id: candidate.user_id,
            title: "Entrevista concluída",
            message: `Sua entrevista para a vaga "${session.job?.title}" foi registrada. Aguarde o retorno da empresa.`,
            type: "info",
            related_to_type: "interview",
            related_to_id: input.sessionId,
          });
        } else {
          await db.createNotification({
            user_id: candidate.user_id,
            title: "Ausência registrada",
            message: `Sua ausência na entrevista para a vaga "${session.job?.title}" foi registrada.`,
            type: "warning",
            related_to_type: "interview",
            related_to_id: input.sessionId,
          });
        }
      }

      return {
        success: true,
        attendedCount: attendedCandidates.length,
        attendedCandidates,
      };
    }),

  // ============================================
  // CANDIDATE ENDPOINTS
  // ============================================

  /**
   * Get interviews for current candidate
   */
  getMyInterviews: candidateProcedure.query(async ({ ctx }) => {
    const candidate = await db.getCandidateByUserId(ctx.user.id);
    if (!candidate) return [];

    return await interviewDb.getInterviewsByCandidate(candidate.id);
  }),

  /**
   * Confirm interview attendance
   */
  confirmAttendance: candidateProcedure
    .input(z.object({
      participantId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const candidate = await db.getCandidateByUserId(ctx.user.id);
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not found" });
      }

      const participant = await interviewDb.getParticipantById(input.participantId);
      if (!participant || participant.candidate_id !== candidate.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      if (participant.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot confirm - interview is not pending",
        });
      }

      await interviewDb.updateParticipantStatus(input.participantId, "confirmed");

      // Notify company
      const session = participant.session;
      if (session?.company?.user_id) {
        // Get company user_id
        const companyData = await db.getCompanyById(session.company_id);
        if (companyData?.user_id) {
          await db.createNotification({
            user_id: companyData.user_id,
            title: "Candidato confirmou entrevista",
            message: `${candidate.full_name || 'Candidato'} confirmou presença na entrevista para a vaga "${session.job?.title}".`,
            type: "success",
            related_to_type: "interview",
            related_to_id: session.id,
          });
        }
      }

      return { success: true };
    }),

  /**
   * Candidate marks that they attended the interview
   * Updates participant to "attended" and application to "interviewed"
   */
  markAsAttended: candidateProcedure
    .input(z.object({
      participantId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const candidate = await db.getCandidateByUserId(ctx.user.id);
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not found" });
      }

      const participant = await interviewDb.getParticipantById(input.participantId);
      if (!participant || participant.candidate_id !== candidate.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      if (participant.status !== "confirmed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Só é possível marcar presença em entrevistas confirmadas",
        });
      }

      // Update participant status to attended
      await interviewDb.updateParticipantStatus(input.participantId, "attended");

      // Update application status to interviewed (waiting for result)
      if (participant.application_id) {
        await db.updateApplication(participant.application_id, {
          status: "interviewed",
        });
      }

      // Notify company
      const session = participant.session;
      if (session) {
        const companyData = await db.getCompanyById(session.company_id);
        if (companyData?.user_id) {
          await db.createNotification({
            user_id: companyData.user_id,
            title: "Candidato compareceu à entrevista",
            message: `${candidate.full_name || 'Candidato'} informou que compareceu à entrevista para a vaga "${session.job?.title}".`,
            type: "info",
            related_to_type: "interview",
            related_to_id: session.id,
          });
        }
      }

      return { success: true };
    }),

  /**
   * Request interview reschedule
   */
  requestReschedule: candidateProcedure
    .input(z.object({
      participantId: z.string().uuid(),
      reason: z.string().min(10, "Por favor, explique o motivo do reagendamento"),
    }))
    .mutation(async ({ ctx, input }) => {
      const candidate = await db.getCandidateByUserId(ctx.user.id);
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not found" });
      }

      const participant = await interviewDb.getParticipantById(input.participantId);
      if (!participant || participant.candidate_id !== candidate.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      if (participant.status !== "pending" && participant.status !== "confirmed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot request reschedule for this interview",
        });
      }

      await interviewDb.updateParticipantStatus(
        input.participantId,
        "reschedule_requested",
        input.reason
      );

      // Notify company
      const session = participant.session;
      if (session) {
        const companyData = await db.getCompanyById(session.company_id);
        if (companyData?.user_id) {
          await db.createNotification({
            user_id: companyData.user_id,
            title: "Candidato solicitou reagendamento",
            message: `${candidate.full_name || 'Candidato'} solicitou reagendamento da entrevista para a vaga "${session.job?.title}". Motivo: ${input.reason}`,
            type: "warning",
            related_to_type: "interview",
            related_to_id: session.id,
          });
        }
      }

      return { success: true };
    }),
});
