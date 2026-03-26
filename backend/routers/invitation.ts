// @ts-nocheck
// Invitation router - agency invitations management
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure } from "../_core/trpc";
import { adminProcedure } from "./procedures";
import * as db from "../db";
import { supabaseAdmin } from "../supabase";

export const invitationRouter = router({
  // Create invitation (admin only)
  create: adminProcedure
    .input(z.object({
      email: z.string().email(),
      affiliateId: z.string().uuid(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await db.createAgencyInvitation(
        input.email,
        input.affiliateId,
        ctx.user.id,
        input.notes
      );
    }),

  // Validate invitation token (public)
  validate: publicProcedure
    .input(z.object({ token: z.string().uuid() }))
    .query(async ({ input }) => {
      const invitation = await db.getAgencyInvitationByToken(input.token);
      if (!invitation) {
        return { valid: false };
      }
      if (invitation.status !== 'pending') {
        return { valid: false };
      }
      if (new Date(invitation.expires_at) < new Date()) {
        return { valid: false };
      }
      return {
        valid: true,
        email: invitation.email,
        affiliateName: invitation.affiliates?.name || null,
      };
    }),

  // Accept invitation (public - creates user account)
  acceptWithPassword: publicProcedure
    .input(z.object({
      token: z.string().uuid(),
      password: z.string().min(6),
      agencyData: z.object({
        agency_name: z.string().min(1),
        trade_name: z.string().optional(),
        legal_name: z.string().optional(),
        cnpj: z.string().min(14),
        email: z.string().email(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postal_code: z.string().optional(),
        website: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const result = await db.acceptAgencyInvitation(
        input.token,
        input.password,
        {
          agency_name: input.agencyData.agency_name,
          cnpj: input.agencyData.cnpj,
          email: input.agencyData.email,
          phone: input.agencyData.phone,
          city: input.agencyData.city,
          state: input.agencyData.state,
          address: input.agencyData.address,
        }
      );
      return { success: true, email: result.user.email };
    }),

  // Accept invitation (authenticated - legacy)
  accept: protectedProcedure
    .input(z.object({
      token: z.string().uuid(),
      agencyData: z.object({
        agency_name: z.string().min(1),
        trade_name: z.string().optional(),
        legal_name: z.string().optional(),
        cnpj: z.string().min(14),
        email: z.string().email(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postal_code: z.string().optional(),
        website: z.string().optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify invitation exists and is valid
      const invitation = await db.getAgencyInvitationByToken(input.token);
      if (!invitation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
      }
      if (invitation.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invitation already used' });
      }
      if (new Date(invitation.expires_at) < new Date()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invitation expired' });
      }

      // Create agency record linked to the authenticated user
      const { data: agency, error: agencyError } = await supabaseAdmin
        .from("agencies")
        .insert({
          user_id: ctx.user.id,
          affiliate_id: invitation.affiliate_id,
          agency_name: input.agencyData.agency_name,
          cnpj: input.agencyData.cnpj || null,
          email: input.agencyData.email,
          phone: input.agencyData.phone || null,
          city: input.agencyData.city || null,
          state: input.agencyData.state || null,
          address: input.agencyData.address || null,
          status: "active",
        })
        .select()
        .single();

      if (agencyError) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: agencyError.message });
      }

      // Update user role to agency
      await supabaseAdmin
        .from("users")
        .update({ role: "agency" })
        .eq("id", ctx.user.id);

      // Mark invitation as accepted
      await supabaseAdmin
        .from("agency_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          agency_id: agency.id,
        })
        .eq("token", input.token);

      return { success: true };
    }),

  // List all invitations (admin only)
  list: adminProcedure.query(async () => {
    // TODO: implement getAllInvitations
    return [];
  }),

  // Revoke invitation (admin only)
  revoke: adminProcedure
    .input(z.object({ token: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // TODO: implement revokeInvitation
      return { success: true };
    }),

  // Get all affiliates for dropdown (admin only)
  getAffiliates: adminProcedure.query(async () => {
    return await db.getAllAffiliates();
  }),
});
