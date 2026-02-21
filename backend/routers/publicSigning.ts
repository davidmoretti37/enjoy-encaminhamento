// @ts-nocheck
/**
 * Public Signing Router
 *
 * Handles contract signing for external parties (parents, schools)
 * who don't have user accounts. Uses token-based authentication.
 */

import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import * as hiringDb from "../db/hiring";
import { sendSigningInvitationEmail } from "./hiringEmails";

export const publicSigningRouter = router({
  /**
   * Get signing details by token
   */
  getSigningDetails: publicProcedure
    .input(z.object({
      token: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const invitation = await hiringDb.getSigningInvitationByToken(input.token);

      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado" });
      }

      if (invitation.signed_at) {
        return {
          alreadySigned: true,
          signedAt: invitation.signed_at,
        };
      }

      if (new Date(invitation.expires_at) < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este convite expirou" });
      }

      // Mark as viewed
      await hiringDb.markInvitationViewed(invitation.id);

      const process = invitation.hiring_process;

      // Fetch only the selected contract templates for this hiring process
      let contractTemplates: { name: string; fileUrl: string }[] = [];
      if (process?.selected_template_ids?.length) {
        const templates = await db.getDocumentTemplatesByIds(process.selected_template_ids);
        contractTemplates = templates.map((t: any) => ({
          name: t.name,
          fileUrl: t.file_url,
        }));
      }

      return {
        alreadySigned: false,
        invitationId: invitation.id,
        signerRole: invitation.signer_role,
        signerName: invitation.signer_name,
        signerEmail: invitation.signer_email,
        autentiqueSignUrl: invitation.autentique_sign_url || null,
        candidate: {
          name: process?.candidate?.full_name,
        },
        company: {
          name: process?.company?.company_name,
        },
        job: {
          title: process?.job?.title,
        },
        startDate: process?.start_date,
        hiringType: process?.hiring_type,
        contractTemplates,
      };
    }),

  /**
   * Sign document by token
   */
  signByToken: publicProcedure
    .input(z.object({
      token: z.string().uuid(),
      signerCpf: z.string().min(11),
      signature: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const invitation = await hiringDb.getSigningInvitationByToken(input.token);

      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado" });
      }

      if (invitation.signed_at) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este documento já foi assinado" });
      }

      if (new Date(invitation.expires_at) < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este convite expirou" });
      }

      // Get client IP from request headers if available
      const signerIp = ctx.req?.headers?.["x-forwarded-for"] as string ||
                       ctx.req?.socket?.remoteAddress;

      // Complete the invitation
      await hiringDb.completeSigningInvitation(
        invitation.id,
        input.signature,
        input.signerCpf,
        signerIp
      );

      // Update hiring process based on role
      const hiringProcessId = invitation.hiring_process_id;

      if (invitation.signer_role === "parent_guardian") {
        await hiringDb.recordParentSignature(
          hiringProcessId,
          invitation.signer_name,
          input.signerCpf
        );
      } else if (invitation.signer_role === "educational_institution") {
        await hiringDb.recordSchoolSignature(
          hiringProcessId,
          invitation.signer_name,
          invitation.signer_email
        );
      }

      // Check if all signatures complete
      const signatureStatus = await hiringDb.checkAllSignaturesComplete(hiringProcessId);

      // Notify company
      const process = invitation.hiring_process;
      if (process) {
        const company = await db.getCompanyById(process.company_id);
        if (company?.user_id) {
          const roleLabel = invitation.signer_role === "parent_guardian"
            ? "Responsável"
            : "Instituição de Ensino";

          await db.createNotification({
            user_id: company.user_id,
            title: `${roleLabel} assinou o contrato`,
            message: `${invitation.signer_name} (${roleLabel}) assinou o contrato de estágio para ${process.candidate?.full_name}.${signatureStatus.complete ? " Todas as assinaturas foram coletadas!" : ""}`,
            type: "success",
            related_to_type: "hiring",
            related_to_id: hiringProcessId,
          });
        }

        // If all signatures complete, send completion notifications
        if (signatureStatus.complete) {
          const { sendSignaturesCompleteNotifications } = await import("./hiring");
          await sendSignaturesCompleteNotifications(
            hiringProcessId,
            process,
            company
          );
        }
      }

      return {
        success: true,
        signatureStatus,
      };
    }),
});
