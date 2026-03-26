// @ts-nocheck
// Company invitation router - invite imported companies to access the platform
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { agencyProcedure } from "./procedures";
import { sendEmail } from "./email";
import * as db from "../db/companyInvitations";
import { supabaseAdmin } from "../supabase";
import { ENV } from "../_core/env";
import { passwordSchema } from "../_core/passwordSchema";

// Email template for company invitation
function generateInvitationEmail(
  companyName: string,
  jobTitle: string | null,
  inviteUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Bem-vindo à Plataforma de Recrutamento</h1>
      </div>

      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px;">Olá <strong>${companyName}</strong>,</p>

        <p>Sua empresa foi cadastrada em nossa plataforma de recrutamento${jobTitle ? ` e uma vaga para <strong>"${jobTitle}"</strong> já foi criada` : ''}.</p>

        <p>Para acessar sua conta e gerenciar suas vagas, clique no botão abaixo para criar sua senha:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Criar Senha e Acessar
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">Este link expira em 7 dias. Se você não solicitou este cadastro, ignore este email.</p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

        <p style="color: #999; font-size: 12px; text-align: center;">
          Plataforma de Recrutamento - Conectando empresas aos melhores talentos
        </p>
      </div>
    </body>
    </html>
  `;
}

export const companyInvitationRouter = router({
  // Create and send invitation (agency only)
  createAndSend: agencyProcedure
    .input(z.object({
      companyId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get company details
      const { data: company, error: companyError } = await supabaseAdmin
        .from("companies")
        .select("id, company_name, email, user_id, agency_id")
        .eq("id", input.companyId)
        .single();

      if (companyError || !company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      // Check if company already has a user linked
      if (company.user_id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Company already has an account"
        });
      }

      if (!company.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Company has no email address"
        });
      }

      // Check for existing pending invitation
      const existingInvitation = await db.getCompanyInvitationByCompanyId(input.companyId);
      if (existingInvitation && existingInvitation.status === "pending") {
        // Revoke old invitation and create new one
        await db.revokeCompanyInvitation(existingInvitation.token);
      }

      // Create invitation
      const invitation = await db.createCompanyInvitation(
        input.companyId,
        company.email,
        ctx.user.id
      );

      // Get job info for email
      const jobs = await db.getJobsForCompany(input.companyId);
      const firstJob = jobs[0];

      // Generate invite URL
      const baseUrl = ENV.isDevelopment ? "http://localhost:5001" : ENV.appUrl;
      const inviteUrl = `${baseUrl}/company/invite/${invitation.token}`;

      // Send email
      const emailSent = await sendEmail(
        company.email,
        "Acesse sua conta na plataforma de recrutamento",
        generateInvitationEmail(company.company_name, firstJob?.title || null, inviteUrl)
      );

      return {
        success: true,
        invitation,
        emailSent
      };
    }),

  // Resend invitation email
  resend: agencyProcedure
    .input(z.object({
      companyId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get company details
      const { data: company, error: companyError } = await supabaseAdmin
        .from("companies")
        .select("id, company_name, email, user_id")
        .eq("id", input.companyId)
        .single();

      if (companyError || !company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      if (company.user_id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Company already has an account"
        });
      }

      // Get existing invitation
      const invitation = await db.getCompanyInvitationByCompanyId(input.companyId);
      if (!invitation || invitation.status !== "pending") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No pending invitation found"
        });
      }

      // Get job info for email
      const jobs = await db.getJobsForCompany(input.companyId);
      const firstJob = jobs[0];

      // Generate invite URL
      const baseUrl = ENV.isDevelopment ? "http://localhost:5001" : ENV.appUrl;
      const inviteUrl = `${baseUrl}/company/invite/${invitation.token}`;

      // Send email
      const emailSent = await sendEmail(
        company.email,
        "Acesse sua conta na plataforma de recrutamento",
        generateInvitationEmail(company.company_name, firstJob?.title || null, inviteUrl)
      );

      return {
        success: true,
        emailSent
      };
    }),

  // Validate invitation token (public)
  validate: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const { data: row } = await supabaseAdmin
        .from("company_invitations")
        .select("*")
        .eq("token", input.token)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (!row) {
        return { valid: false as const };
      }

      return {
        valid: true as const,
        email: row.email,
        companyName: row.company_name,
        role: row.role,
      };
    }),

  // Accept invitation (authenticated user)
  accept: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data: invitation } = await supabaseAdmin
        .from("company_invitations")
        .select("*")
        .eq("token", input.token)
        .single();

      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
      }
      if (invitation.accepted_at) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation already accepted" });
      }
      if (new Date(invitation.expires_at) < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invitation expired" });
      }

      const { error: acceptError } = await supabaseAdmin
        .from("company_invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("token", input.token);

      if (acceptError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to accept invitation" });
      }

      const { error: userUpdateError } = await supabaseAdmin
        .from("users")
        .update({ company_id: invitation.company_id })
        .eq("id", ctx.user.id);

      if (userUpdateError) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update user profile" });
      }

      return { success: true };
    }),

  // Accept invitation and create account (public)
  acceptWithPassword: publicProcedure
    .input(z.object({
      token: z.string(),
      password: z.string().min(8),
      name: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { data: invitation } = await supabaseAdmin
        .from("company_invitations")
        .select("*")
        .eq("token", input.token)
        .single();

      if (!invitation || invitation.accepted_at || new Date(invitation.expires_at) < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired invitation" });
      }

      const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: invitation.email,
        password: input.password,
        email_confirm: true,
      });

      if (authError || !newUser?.user) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: authError?.message || "Failed to create user" });
      }

      const { error: insertError } = await supabaseAdmin
        .from("users")
        .insert({
          id: newUser.user.id,
          email: invitation.email,
          name: input.name,
          role: invitation.role,
          company_id: invitation.company_id,
        });

      if (insertError) {
        // Roll back: delete the auth user we just created
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user profile",
        });
      }

      const { error: acceptError } = await supabaseAdmin
        .from("company_invitations")
        .update({ accepted_at: new Date().toISOString() })
        .eq("token", input.token);

      if (acceptError) {
        // Roll back: delete the auth user we just created
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to mark invitation as accepted",
        });
      }

      return { success: true, email: invitation.email };
    }),

  // Get invitation status for a company (agency only)
  getStatus: agencyProcedure
    .input(z.object({
      companyId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      // Check if company has user linked
      const { data: company } = await supabaseAdmin
        .from("companies")
        .select("user_id")
        .eq("id", input.companyId)
        .single();

      if (company?.user_id) {
        return { status: "registered", hasAccount: true };
      }

      // Check for invitation
      const invitation = await db.getCompanyInvitationByCompanyId(input.companyId);

      if (!invitation) {
        return { status: "not_invited", hasAccount: false };
      }

      if (invitation.status === "accepted") {
        return { status: "registered", hasAccount: true };
      }

      if (invitation.status === "pending") {
        const isExpired = new Date(invitation.expires_at) < new Date();
        return {
          status: isExpired ? "expired" : "pending",
          hasAccount: false,
          sentAt: invitation.created_at,
          expiresAt: invitation.expires_at,
        };
      }

      return { status: invitation.status, hasAccount: false };
    }),
});
