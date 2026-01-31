// @ts-nocheck
// Outreach router - email, scheduling, meetings, contracts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { adminProcedure, agencyProcedure } from "./procedures";
import { sendEmail } from "./email";
import * as db from "../db";
import { createZoomMeeting, isZoomConfigured } from "../integrations/zoom";
import { createGoogleMeeting, isGoogleMeetConfigured } from "../integrations/googleMeet";
import { ENV } from "../_core/env";
import { generateCompanySummary } from "../services/ai/summarizer";

export const outreachRouter = router({
  // Send outreach email (available to agencies and admins)
  sendEmail: agencyProcedure
    .input(
      z.object({
        recipientEmail: z.string().email(),
        subject: z.string().min(1),
        body: z.string().min(1),
        includeFormLink: z.boolean().default(true),
        includeBookingLink: z.boolean().default(true),
        companyId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const baseUrl = ENV.appUrl;

      // Get agency context for booking links
      let agencyId: string | undefined;
      if (ctx.user.role === "agency") {
        const agency = await db.getAgencyByUserId(ctx.user.id);
        agencyId = agency?.id;
      } else if (ctx.user.role === "admin") {
        agencyId = (await db.getAdminAgencyContext(ctx.user.id)) || undefined;
      }

      let htmlBody = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">`;
      htmlBody += `<p>${input.body.replace(/\n/g, "<br>")}</p>`;

      if (input.includeFormLink || input.includeBookingLink) {
        const encodedEmail = encodeURIComponent(input.recipientEmail);
        const agencyParam = agencyId ? `&agency=${agencyId}` : "";
        htmlBody += `<hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">`;
        htmlBody += `<p><strong>Interessado? Escolha uma opção:</strong></p>`;
        if (input.includeFormLink) {
          htmlBody += `<p>📋 <a href="${baseUrl}/form/${ctx.user.id}?email=${encodedEmail}${agencyParam}" style="color: #2563eb;">Preencher formulário</a></p>`;
        }
        if (input.includeBookingLink) {
          htmlBody += `<p>📅 <a href="${baseUrl}/book/${ctx.user.id}?email=${encodedEmail}${agencyParam}" style="color: #2563eb;">Agendar uma reunião</a></p>`;
        }
      }
      htmlBody += `</div>`;

      // Track the email
      await db.createEmailOutreach({
        senderId: ctx.user.id,
        recipientEmail: input.recipientEmail,
        companyId: input.companyId,
        emailType: "outreach",
        subject: input.subject,
        bodyPreview: input.body.substring(0, 200),
      });

      // Send email via Gmail SMTP
      try {
        await sendEmail(input.recipientEmail, input.subject, htmlBody);
        return { success: true, message: "Email enviado com sucesso!" };
      } catch (err: any) {
        console.error("[Outreach] Email send error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao enviar email: ${err.message}`,
        });
      }
    }),

  // Get email history
  getEmailHistory: adminProcedure
    .input(
      z
        .object({
          companyId: z.string().uuid().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return await db.getEmailOutreachHistory(ctx.user.id, input?.companyId);
    }),

  // Get availability (agencies and admins can access)
  getAvailability: agencyProcedure
    .input(
      z
        .object({
          agencyId: z.string().uuid().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const agencyId = input?.agencyId || (await db.getAdminAgencyContext(ctx.user.id)) || undefined;
      return await db.getAdminAvailability(ctx.user.id, agencyId);
    }),

  // Save availability (agencies and admins can access)
  saveAvailability: agencyProcedure
    .input(
      z.object({
        agencyId: z.string().uuid().optional(),
        dayOfWeek: z.number().min(0).max(6).optional(),
        specificDate: z.string().optional(),
        startTime: z.string(),
        endTime: z.string(),
        isBlocked: z.boolean().default(false),
        label: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = input.agencyId || (await db.getAdminAgencyContext(ctx.user.id)) || undefined;
      return await db.createAdminAvailability({
        adminId: ctx.user.id,
        agencyId,
        ...input,
      });
    }),

  // Delete availability (agencies and admins can access)
  deleteAvailability: agencyProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteAdminAvailability(input.id, ctx.user.id);
      return { success: true };
    }),

  // Get settings (agencies and admins can access)
  getAdminSettings: agencyProcedure
    .input(
      z
        .object({
          agencyId: z.string().uuid().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const agencyId = input?.agencyId || (await db.getAdminAgencyContext(ctx.user.id)) || undefined;
      const settings = await db.getAdminSettings(ctx.user.id, agencyId);
      return settings || { meeting_duration_minutes: 30 };
    }),

  // Save settings (agencies and admins can access)
  saveAdminSettings: agencyProcedure
    .input(
      z.object({
        agencyId: z.string().uuid().optional(),
        meeting_duration_minutes: z.number().min(5).max(180),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = input.agencyId || (await db.getAdminAgencyContext(ctx.user.id)) || undefined;
      await db.saveAdminSettings(
        ctx.user.id,
        { meeting_duration_minutes: input.meeting_duration_minutes },
        agencyId
      );
      return { success: true };
    }),

  // Get blocked slots for a specific date
  getBlockedSlots: adminProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      const agencyId = await db.getAdminAgencyContext(ctx.user.id);
      return await db.getBlockedSlots(ctx.user.id, input.date, agencyId || undefined);
    }),

  // Get ALL slots for a date (for admin blocking UI - includes past times)
  getAllSlotsForDate: adminProcedure
    .input(
      z.object({
        date: z.string(),
        agencyId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const agencyId = input.agencyId || (await db.getAdminAgencyContext(ctx.user.id)) || undefined;
      return await db.getAllSlotsForDate(ctx.user.id, input.date, agencyId);
    }),

  // Block a time slot
  blockTimeSlot: adminProcedure
    .input(
      z.object({
        startTime: z.string(),
        endTime: z.string(),
        specificDate: z.string().optional(),
        dayOfWeek: z.number().min(0).max(6).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agencyId = await db.getAdminAgencyContext(ctx.user.id);
      return await db.blockTimeSlot({
        adminId: ctx.user.id,
        agencyId: agencyId || undefined,
        ...input,
      });
    }),

  // Unblock a time slot
  unblockTimeSlot: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = await db.getAdminAgencyContext(ctx.user.id);
      await db.unblockTimeSlot(input.id, ctx.user.id, agencyId || undefined);
      return { success: true };
    }),

  // Get scheduled meetings
  getMeetings: adminProcedure
    .input(
      z
        .object({
          status: z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]).optional(),
          agencyId: z.string().uuid().nullable().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const agencyId =
        input?.agencyId === null
          ? undefined
          : input?.agencyId || (await db.getAdminAgencyContext(ctx.user.id)) || undefined;
      return await db.getScheduledMeetings(ctx.user.id, input?.status, agencyId);
    }),

  // Update meeting status (with email notifications)
  updateMeetingStatus: agencyProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]),
        cancellationReason: z.string().optional(),
        sendEmail: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let agencyId: string | undefined;
      if (ctx.user.role === "admin") {
        agencyId = (await db.getAdminAgencyContext(ctx.user.id)) || undefined;
      } else if (ctx.user.role === "agency") {
        const agency = await db.getAgencyByUserId(ctx.user.id);
        agencyId = agency?.id;
      }

      const meeting = await db.getMeetingById(input.id, ctx.user.id, agencyId);
      await db.updateMeetingStatus(
        input.id,
        ctx.user.id,
        input.status,
        input.cancellationReason,
        agencyId
      );

      if (input.sendEmail && meeting) {
        const baseUrl = ENV.appUrl;
        const meetingDate = new Date(meeting.scheduled_at);
        const dateStr = meetingDate.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
        const timeStr = meetingDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

        let subject = "";
        let htmlBody = "";

        if (input.status === "confirmed") {
          subject = `Reunião Confirmada - ${dateStr}`;
          htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Reunião Confirmada!</h2>
              <p>Olá ${meeting.contact_name || "Cliente"},</p>
              <p>Sua reunião foi confirmada!</p>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>📅 Data:</strong> ${dateStr}</p>
                <p><strong>🕐 Horário:</strong> ${timeStr}</p>
              </div>
              <p>Aguardamos você!</p>
            </div>
          `;
        } else if (input.status === "cancelled") {
          subject = "Reunião Cancelada";
          const agencyParam = meeting.agency_id ? `&agency=${meeting.agency_id}` : "";
          htmlBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Reunião Cancelada</h2>
              <p>Olá ${meeting.contact_name || "Cliente"},</p>
              <p>Infelizmente sua reunião foi cancelada.</p>
              ${input.cancellationReason ? `<p><strong>Motivo:</strong> ${input.cancellationReason}</p>` : ""}
              <p>Caso deseje reagendar, acesse:</p>
              <p><a href="${baseUrl}/book/${ctx.user.id}?email=${encodeURIComponent(meeting.company_email)}${agencyParam}" style="color: #2563eb;">Agendar nova reunião</a></p>
            </div>
          `;
        }

        if (subject && htmlBody) {
          try {
            await sendEmail(meeting.company_email, subject, htmlBody);
          } catch (err) {
            console.error("[Meeting] Failed to send email:", err);
          }
        }
      }

      return { success: true };
    }),

  // Reschedule meeting
  rescheduleMeeting: agencyProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        newScheduledAt: z.string(),
        sendEmail: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let agencyId: string | undefined;
      if (ctx.user.role === "admin") {
        agencyId = (await db.getAdminAgencyContext(ctx.user.id)) || undefined;
      } else if (ctx.user.role === "agency") {
        const agency = await db.getAgencyByUserId(ctx.user.id);
        agencyId = agency?.id;
      }

      const meeting = await db.getMeetingById(input.id, ctx.user.id, agencyId);
      if (!meeting) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reunião não encontrada" });
      }

      await db.rescheduleMeeting(input.id, ctx.user.id, input.newScheduledAt, agencyId);

      if (input.sendEmail) {
        const baseUrl = ENV.appUrl;
        const newDate = new Date(input.newScheduledAt);
        const dateStr = newDate.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
        const timeStr = newDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const confirmUrl = `${baseUrl}/meeting/confirm/${meeting.confirmation_token}`;

        try {
          await sendEmail(
            meeting.company_email,
            `Reunião Reagendada - ${dateStr}`,
            `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Reunião Reagendada</h2>
                <p>Olá ${meeting.contact_name || "Cliente"},</p>
                <p>Sua reunião foi reagendada para uma nova data.</p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p><strong>📅 Nova Data:</strong> ${dateStr}</p>
                  <p><strong>🕐 Novo Horário:</strong> ${timeStr}</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${confirmUrl}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                    ✓ Confirmar Presença
                  </a>
                </div>
              </div>
            `
          );
        } catch (err) {
          console.error("[Meeting] Failed to send reschedule email:", err);
        }
      }

      return { success: true };
    }),

  // PUBLIC: Get available slots for booking
  getAvailableSlots: publicProcedure
    .input(
      z.object({
        adminId: z.string().uuid(),
        agencyId: z.string().uuid().optional(),
        date: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await db.getAvailableSlots(input.adminId, input.date, input.agencyId);
    }),

  // PUBLIC: Create a booking
  createBooking: publicProcedure
    .input(
      z.object({
        adminId: z.string().uuid(),
        agencyId: z.string().uuid().optional(),
        scheduledAt: z.string(),
        companyEmail: z.string().email(),
        companyName: z.string().optional(),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const meeting = await db.createScheduledMeeting({
        adminId: input.adminId,
        agencyId: input.agencyId,
        scheduledAt: input.scheduledAt,
        companyEmail: input.companyEmail,
        companyName: input.companyName,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        notes: input.notes,
      });
      return meeting;
    }),

  // PUBLIC: Get meeting by confirmation token
  getMeetingByToken: publicProcedure
    .input(z.object({ token: z.string().uuid() }))
    .query(async ({ input }) => {
      return await db.getMeetingByToken(input.token);
    }),

  // PUBLIC: Cancel meeting by token
  cancelMeetingByToken: publicProcedure
    .input(
      z.object({
        token: z.string().uuid(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db.cancelMeetingByToken(input.token, input.reason);
      return { success: true };
    }),

  // PUBLIC: Confirm meeting by token
  confirmMeetingByToken: publicProcedure
    .input(z.object({ token: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.confirmMeetingByToken(input.token);
      return { success: true };
    }),

  // Create Zoom meeting and send link to company
  createZoomMeeting: agencyProcedure
    .input(z.object({ meetingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      let agencyId: string | undefined;
      if (ctx.user.role === "admin") {
        agencyId = (await db.getAdminAgencyContext(ctx.user.id)) || undefined;
      } else if (ctx.user.role === "agency") {
        const agency = await db.getAgencyByUserId(ctx.user.id);
        agencyId = agency?.id;
      }

      const meeting = await db.getMeetingById(input.meetingId, ctx.user.id, agencyId);
      if (!meeting) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reunião não encontrada" });
      }

      if (!isZoomConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Zoom não está configurado",
        });
      }

      try {
        const scheduledAt = new Date(meeting.scheduled_at);
        const zoomMeeting = await createZoomMeeting({
          topic: `Reunião com ${meeting.company_name || meeting.contact_name || "Empresa"}`,
          startTime: scheduledAt,
          durationMinutes: meeting.duration_minutes || 30,
          agenda: meeting.notes || undefined,
        });

        await db.updateMeetingLink(
          input.meetingId,
          ctx.user.id,
          {
            meetingLink: zoomMeeting.joinUrl,
            meetingPlatform: "zoom",
            meetingId: zoomMeeting.meetingId,
          },
          agencyId
        );

        const dateStr = scheduledAt.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
        const timeStr = scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

        await sendEmail(
          meeting.company_email,
          `Link da Reunião - ${dateStr} às ${timeStr}`,
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Link da Sua Reunião</h2>
              <p>Olá ${meeting.contact_name || "Cliente"},</p>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>📅 Data:</strong> ${dateStr}</p>
                <p><strong>🕐 Horário:</strong> ${timeStr}</p>
                <p><strong>🎥 Plataforma:</strong> Zoom</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${zoomMeeting.joinUrl}" style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Entrar na Reunião
                </a>
              </div>
            </div>
          `
        );

        return { success: true, meetingUrl: zoomMeeting.startUrl, joinUrl: zoomMeeting.joinUrl };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao criar reunião Zoom: ${error.message}`,
        });
      }
    }),

  // Create Google Meet and send link to company
  createGoogleMeeting: agencyProcedure
    .input(z.object({ meetingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      let agencyId: string | undefined;
      if (ctx.user.role === "admin") {
        agencyId = (await db.getAdminAgencyContext(ctx.user.id)) || undefined;
      } else if (ctx.user.role === "agency") {
        const agency = await db.getAgencyByUserId(ctx.user.id);
        agencyId = agency?.id;
      }

      const meeting = await db.getMeetingById(input.meetingId, ctx.user.id, agencyId);
      if (!meeting) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Reunião não encontrada" });
      }

      if (!isGoogleMeetConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Google não está configurado",
        });
      }

      try {
        const scheduledAt = new Date(meeting.scheduled_at);
        const durationMs = (meeting.duration_minutes || 30) * 60 * 1000;
        const endTime = new Date(scheduledAt.getTime() + durationMs);

        const googleMeeting = await createGoogleMeeting({
          summary: `Reunião com ${meeting.company_name || meeting.contact_name || "Empresa"}`,
          description: meeting.notes || undefined,
          startTime: scheduledAt,
          endTime: endTime,
          attendeeEmail: meeting.company_email,
        });

        await db.updateMeetingLink(
          input.meetingId,
          ctx.user.id,
          {
            meetingLink: googleMeeting.meetingUrl,
            meetingPlatform: "google_meet",
            meetingId: googleMeeting.meetingId,
          },
          agencyId
        );

        const dateStr = scheduledAt.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
        const timeStr = scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

        await sendEmail(
          meeting.company_email,
          `Link da Reunião - ${dateStr} às ${timeStr}`,
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Link da Sua Reunião</h2>
              <p>Olá ${meeting.contact_name || "Cliente"},</p>
              <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>📅 Data:</strong> ${dateStr}</p>
                <p><strong>🕐 Horário:</strong> ${timeStr}</p>
                <p><strong>🎥 Plataforma:</strong> Google Meet</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${googleMeeting.meetingUrl}" style="background: #22c55e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Entrar na Reunião
                </a>
              </div>
            </div>
          `
        );

        return {
          success: true,
          meetingUrl: googleMeeting.meetingUrl,
          calendarEventUrl: googleMeeting.calendarEventUrl,
        };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao criar Google Meet: ${error.message}`,
        });
      }
    }),

  // Update company pipeline status (admin only)
  updatePipelineStatus: adminProcedure
    .input(
      z.object({
        companyId: z.string().uuid(),
        status: z.enum([
          "lead",
          "form_sent",
          "form_filled",
          "meeting_scheduled",
          "meeting_done",
          "contract_sent",
          "contract_signed",
        ]),
      })
    )
    .mutation(async ({ input }) => {
      await db.updateCompanyPipelineStatus(input.companyId, input.status);
      return { success: true };
    }),

  // Send contract to meeting/company (admin only)
  sendContract: adminProcedure
    .input(z.object({ meetingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const meeting = await db.getScheduledMeetingById(input.meetingId);
      if (!meeting) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
      }

      let agencyId: string | undefined = meeting.agency_id;
      if (!agencyId) {
        if (ctx.user.role === "agency") {
          const agency = await db.getAgencyByUserId(ctx.user.id);
          agencyId = agency?.id;
        } else if (ctx.user.role === "admin") {
          agencyId = (await db.getAdminAgencyContext(ctx.user.id)) || undefined;
        }
      }

      const contractToken = await db.sendContractToMeeting(input.meetingId, agencyId);
      const baseUrl = ENV.appUrl;
      const contractLink = `${baseUrl}/contract/${contractToken}`;

      await sendEmail(
        meeting.company_email,
        "Contrato de Parceria - Currículos MVP",
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a365d;">Contrato de Parceria</h2>
            <p>Olá${meeting.company_name ? ` ${meeting.company_name}` : ""},</p>
            <p>Estamos muito felizes com a nossa parceria! Por favor, acesse o link abaixo para revisar e assinar o contrato digitalmente:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${contractLink}" style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Assinar Contrato
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Este link é válido por 7 dias.</p>
          </div>
        `
      );

      return { success: true, contractToken };
    }),

  // PUBLIC: Get meeting by contract token (for contract signing page)
  getCompanyByContractToken: publicProcedure
    .input(z.object({ token: z.string().uuid() }))
    .query(async ({ input }) => {
      const meeting = await db.getMeetingByContractToken(input.token);
      if (!meeting) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid contract link" });
      }

      let formData = null;
      if (meeting.admin_id && meeting.company_email) {
        formData = await db.getCompanyFormByEmail(meeting.admin_id, meeting.company_email);
      }

      let agencyContract = null;
      if (meeting.agency_id) {
        const agency = await db.getAgencyById(meeting.agency_id);
        if (agency && agency.contract_type) {
          agencyContract = {
            type: agency.contract_type,
            pdfUrl: agency.contract_pdf_url,
            html: agency.contract_html,
          };
        }
      }

      let registrationUrl: string | null = null;
      if (meeting.contract_signed_at) {
        const existingCompany = await db.getCompanyByEmail(meeting.company_email);
        if (!existingCompany || !existingCompany.user_id) {
          const baseUrl = ENV.appUrl;
          registrationUrl = `${baseUrl}/company/register/${input.token}`;
        }
      }

      return {
        id: meeting.id,
        company_name: meeting.company_name,
        company_email: meeting.company_email,
        contact_name: meeting.contact_name,
        contact_phone: meeting.contact_phone,
        contract_signed_at: meeting.contract_signed_at,
        registrationUrl,
        formData: formData
          ? {
              legal_name: formData.legal_name,
              business_name: formData.business_name,
              cnpj: formData.cnpj,
              address: formData.address,
              neighborhood: formData.neighborhood,
              city: formData.city,
              state: formData.state,
              cep: formData.cep,
              contact_person: formData.contact_person,
              contact_phone: formData.contact_phone,
              mobile_phone: formData.mobile_phone,
              landline_phone: formData.landline_phone,
            }
          : null,
        agencyContract,
      };
    }),

  // PUBLIC: Sign contract and auto-generate registration link
  signContract: publicProcedure
    .input(
      z.object({
        contractToken: z.string().uuid(),
        signature: z.string().min(1),
        signerName: z.string().min(1),
        signerCpf: z.string().min(11),
      })
    )
    .mutation(async ({ input }) => {
      const meetingData = await db.signMeetingContract({
        contractToken: input.contractToken,
        signature: input.signature,
        signerName: input.signerName,
        signerCpf: input.signerCpf,
      });

      const formData = await db.getCompanyFormByEmailOnly(meetingData.company_email);
      const companyName =
        formData?.legal_name || formData?.business_name || meetingData.company_name || "Empresa";

      const baseUrl = ENV.appUrl;
      const registrationUrl = `${baseUrl}/company/register/${input.contractToken}`;

      try {
        await sendEmail(
          meetingData.company_email,
          "Crie sua Conta - Portal da Empresa",
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a365d;">Contrato Assinado com Sucesso!</h2>
              <p>Olá${companyName ? ` ${companyName}` : ""},</p>
              <p>Seu contrato foi assinado com sucesso. Agora você pode criar sua conta para acessar o Portal da Empresa:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${registrationUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Criar Minha Conta
                </a>
              </div>
            </div>
          `
        );
      } catch (emailError) {
        console.error("Failed to send registration email:", emailError);
      }

      return {
        success: true,
        registrationUrl,
        companyEmail: meetingData.company_email,
        companyName,
      };
    }),

  // Approve signed contract and send registration link (admin only)
  approveContract: adminProcedure
    .input(z.object({ companyId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const company = await db.getCompanyById(input.companyId);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      if (company.pipeline_status !== "contract_signed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Contract has not been signed yet" });
      }

      const registrationToken = await db.createCompanyRegistrationToken(input.companyId);
      const baseUrl = ENV.appUrl;
      const registrationLink = `${baseUrl}/company/register/${registrationToken}`;

      await sendEmail(
        company.email,
        "Conta Aprovada - Currículos MVP",
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a365d;">Seu Contrato Foi Aprovado!</h2>
            <p>Olá${company.company_name ? ` ${company.company_name}` : ""},</p>
            <p>Parabéns! Seu contrato foi aprovado. Agora você pode criar sua conta para acessar o sistema:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${registrationLink}" style="background-color: #22c55e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Criar Minha Conta
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Este link é válido por 7 dias.</p>
          </div>
        `
      );

      return { success: true };
    }),

  // PUBLIC: Get company by registration token
  getCompanyByRegistrationToken: publicProcedure
    .input(z.object({ token: z.string().uuid() }))
    .query(async ({ input }) => {
      const company = await db.getCompanyByRegistrationToken(input.token);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid registration link" });
      }
      if (company.isExpired) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Registration link has expired" });
      }
      return { id: company.id, company_name: company.company_name, email: company.email };
    }),

  // PUBLIC: Complete company registration
  completeRegistration: publicProcedure
    .input(
      z.object({
        registrationToken: z.string().uuid(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const result = await db.completeCompanyRegistration({
        registrationToken: input.registrationToken,
        password: input.password,
      });
      return { success: true, email: result.user.email };
    }),

  // PUBLIC: Get company data by contract token (for registration page)
  getCompanyDataByContractToken: publicProcedure
    .input(z.object({ token: z.string().uuid() }))
    .query(async ({ input }) => {
      const meeting = await db.getMeetingByContractToken(input.token);
      if (!meeting) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid registration link" });
      }

      if (!meeting.contract_signed_at) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Contract has not been signed yet" });
      }

      const existingCompany = await db.getCompanyByEmail(meeting.company_email);
      if (existingCompany && existingCompany.user_id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Company already registered" });
      }

      const formData = await db.getCompanyFormByEmailOnly(meeting.company_email);

      return {
        company_name:
          formData?.legal_name || formData?.business_name || meeting.company_name || "Empresa",
        email: meeting.company_email,
        cnpj: formData?.cnpj,
      };
    }),

  // PUBLIC: Complete registration using contract token
  completeRegistrationByContractToken: publicProcedure
    .input(
      z.object({
        contractToken: z.string().uuid(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const meeting = await db.getMeetingByContractToken(input.contractToken);
      if (!meeting) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid registration link" });
      }

      if (!meeting.contract_signed_at) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Contract has not been signed yet" });
      }

      const existingCompany = await db.getCompanyByEmail(meeting.company_email);
      if (existingCompany && existingCompany.user_id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Company already registered" });
      }

      const formData = await db.getCompanyFormByEmailOnly(meeting.company_email);
      const companyName =
        formData?.legal_name || formData?.business_name || meeting.company_name || "Empresa";

      const result = await db.createCompanyWithUser({
        email: meeting.company_email,
        password: input.password,
        companyName,
        cnpj: formData?.cnpj,
        phone: formData?.mobile_phone || formData?.landline_phone,
        city: formData?.city,
        state: formData?.state,
        address: formData?.address,
      });

      if (formData?.job_title && meeting.agency_id && result.companyId) {
        try {
          await db.createJobFromCompanyForm(result.companyId, meeting.agency_id, formData);
        } catch (jobError) {
          console.error("Failed to create job from form data:", jobError);
        }
      }

      // Generate company summary in background (fire and forget)
      if (result.companyId) {
        generateCompanySummary({
          companyName,
          cnpj: formData?.cnpj,
          industry: undefined,
          companySize: formData?.employee_count,
          website: formData?.website,
          description: undefined,
          city: formData?.city,
          state: formData?.state,
          jobTitle: formData?.job_title,
          contractType: formData?.employment_type,
          workType: undefined,
          compensation: formData?.compensation,
          mainActivities: formData?.main_activities,
          requiredSkills: formData?.required_skills,
          benefits: formData?.benefits,
          educationLevel: formData?.education_level,
          notes: formData?.notes,
        }).then(async (summary) => {
          if (summary && result.companyId) {
            await db.updateCompany(result.companyId, {
              summary,
              summary_generated_at: new Date().toISOString(),
            });
            console.log(`Generated summary for company ${result.companyId}`);
          }
        }).catch((err) => {
          console.error('Failed to generate company summary:', err);
        });
      }

      return { success: true, email: result.email };
    }),

  // PUBLIC: Submit company form
  submitCompanyForm: publicProcedure
    .input(
      z.object({
        adminId: z.string().uuid(),
        email: z.string().email(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        cnpj: z.string().min(14),
        businessName: z.string().optional(),
        legalName: z.string().min(1),
        landlinePhone: z.string().optional(),
        mobilePhone: z.string().optional(),
        website: z.string().optional(),
        employeeCount: z.string().optional(),
        socialMedia: z.string().optional(),
        cep: z.string().optional(),
        address: z.string().optional(),
        complement: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        jobTitle: z.string().min(1),
        compensation: z.string().min(1),
        mainActivities: z.string().min(1),
        requiredSkills: z.string().min(1),
        employmentType: z.string().optional(),
        urgency: z.string().optional(),
        ageRange: z.string().optional(),
        educationLevel: z.string().min(1),
        benefits: z.array(z.string()).optional(),
        workSchedule: z.string().min(1),
        positionsCount: z.string().optional(),
        genderPreference: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const form = await db.createCompanyForm(input);
      return { success: true, formId: form.id };
    }),

  // PUBLIC: Check if form exists for email
  checkFormExists: publicProcedure
    .input(
      z.object({
        adminId: z.string().uuid(),
        email: z.string().email(),
      })
    )
    .query(async ({ input }) => {
      const form = await db.getCompanyFormByEmail(input.adminId, input.email);
      return { exists: !!form };
    }),

  // Get company form by email (admins and agencies)
  getCompanyForm: agencyProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      const form = await db.getCompanyFormByEmail(ctx.user.id, input.email);
      return form;
    }),

  // Get full company history (forms, contracts, emails, timeline)
  getCompanyFullHistory: agencyProcedure
    .input(z.object({ companyEmail: z.string().email() }))
    .query(async ({ ctx, input }) => {
      let agencyId: string | undefined;
      if (ctx.user.role === "agency") {
        const agency = await db.getAgencyByUserId(ctx.user.id);
        agencyId = agency?.id;
      } else if (ctx.user.role === "admin") {
        agencyId = (await db.getAdminAgencyContext(ctx.user.id)) || undefined;
      }
      return await db.getCompanyFullHistory(ctx.user.id, input.companyEmail, agencyId);
    }),

  // Get all company forms (admins and agencies)
  getAllCompanyForms: agencyProcedure
    .input(z.object({ agencyId: z.string().uuid().nullable().optional() }).optional())
    .query(async ({ ctx, input }) => {
      let agencyId: string | undefined;

      if (input?.agencyId === null) {
        agencyId = undefined;
      } else if (input?.agencyId) {
        agencyId = input.agencyId;
      } else if (ctx.user.role === "agency") {
        const agency = await db.getAgencyByUserId(ctx.user.id);
        agencyId = agency?.id;
      } else if (ctx.user.role === "admin") {
        agencyId = (await db.getAdminAgencyContext(ctx.user.id)) || undefined;
      }
      return await db.getCompanyFormsByAdmin(ctx.user.id, agencyId);
    }),

  // Accept company (send contract) - admins and agencies
  acceptCompany: agencyProcedure
    .input(z.object({ meetingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const meeting = await db.getScheduledMeetingById(input.meetingId);
      if (!meeting) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
      }

      let agency = null;
      let agencyId: string | undefined;
      if (meeting.agency_id) {
        agency = await db.getAgencyById(meeting.agency_id);
        agencyId = meeting.agency_id;
      } else if (ctx.user.role === "agency") {
        agency = await db.getAgencyByUserId(ctx.user.id);
        agencyId = agency?.id;
      } else if (ctx.user.role === "admin") {
        agencyId = (await db.getAdminAgencyContext(ctx.user.id)) || undefined;
        if (agencyId) {
          agency = await db.getAgencyById(agencyId);
        }
      }

      if (agency && !agency.contract_type) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Configure um contrato nas Configuracoes antes de enviar para empresas",
        });
      }

      const form = await db.getCompanyFormByEmail(ctx.user.id, meeting.company_email);
      const contractToken = await db.sendContractToMeeting(input.meetingId, agencyId);

      if (form) {
        await db.updateCompanyFormStatus(form.id, "accepted");
      }

      const baseUrl = ENV.appUrl;

      if (form) {
        const contractLink = `${baseUrl}/contract/${contractToken}`;

        await sendEmail(
          meeting.company_email,
          "Contrato de Parceria - Curriculos MVP",
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a365d;">Contrato de Parceria</h2>
              <p>Ola ${form.legal_name || meeting.company_name || ""},</p>
              <p>Obrigado por preencher o formulario! Estamos muito felizes com a nossa parceria.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${contractLink}" style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Assinar Contrato
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">Este link e valido por 7 dias.</p>
            </div>
          `
        );

        return { success: true, formFilled: true, contractToken };
      } else {
        const formLink = `${baseUrl}/form/${ctx.user.id}?email=${encodeURIComponent(meeting.company_email)}&contract=${contractToken}`;

        await sendEmail(
          meeting.company_email,
          "Complete seu Cadastro - Curriculos MVP",
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a365d;">Complete seu Cadastro</h2>
              <p>Ola ${meeting.company_name || ""},</p>
              <p>Estamos muito felizes com a nossa parceria! Para finalizar, precisamos de algumas informacoes.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${formLink}" style="background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Preencher Formulario
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">Este link e valido por 7 dias.</p>
            </div>
          `
        );

        return { success: true, formFilled: false, contractToken };
      }
    }),

  // Admin: Reject company (delete form if exists)
  rejectCompany: adminProcedure
    .input(z.object({ meetingId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const meeting = await db.getScheduledMeetingById(input.meetingId);
      if (!meeting) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Meeting not found" });
      }

      const form = await db.getCompanyFormByEmail(ctx.user.id, meeting.company_email);
      if (form) {
        await db.deleteCompanyForm(form.id);
      }

      return { success: true };
    }),

  // Upload signed contract PDF for a company
  uploadSignedContract: agencyProcedure
    .input(z.object({
      companyEmail: z.string().email(),
      fileBase64: z.string(),
      fileName: z.string(),
      signerName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Find or create meeting record for this company
      let meeting = await db.getScheduledMeetingByEmail(ctx.user.id, input.companyEmail);

      if (!meeting) {
        // Create a meeting record if it doesn't exist (for imported companies)
        meeting = await db.createMeetingForCompany(ctx.user.id, input.companyEmail);
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(input.fileBase64, 'base64');

      // Generate unique key
      const key = `contracts/signed/${meeting.id}/${Date.now()}-${input.fileName}`;

      // Upload to storage
      const { storagePut } = await import('../storage');
      const { url } = await storagePut(key, buffer, 'application/pdf');

      // Update meeting with contract info
      await db.updateMeetingContract(meeting.id, {
        contract_pdf_url: url,
        contract_pdf_key: key,
        contract_signed_at: new Date().toISOString(),
        contract_signer_name: input.signerName || null,
      });

      return { success: true, url };
    }),
});
