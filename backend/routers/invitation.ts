// @ts-nocheck
// Invitation router - agency invitations management
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure } from "../_core/trpc";
import { adminProcedure } from "./procedures";
import * as db from "../db";

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
      console.log('[Invitation] Validating token:', input.token);
      // TODO: implement getInvitationByToken
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
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
      // TODO: implement acceptAgencyInvitationWithPassword
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
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
      // TODO: implement acceptInvitation
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
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
