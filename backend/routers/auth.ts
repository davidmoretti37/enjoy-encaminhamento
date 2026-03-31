// Auth router - authentication endpoints
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { supabase, supabaseAdmin } from "../supabase";
import * as db from "../db";

export const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    try {
      // Clear any session cookies
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("sb-access-token", { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie("sb-refresh-token", { ...cookieOptions, maxAge: -1 });
    } catch (error) {
      console.error("[Auth] Logout error:", error);
    }
    return { success: true } as const;
  }),

  // Create user profile after signup - called from frontend after Supabase auth signup
  createProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Idempotent: if profile already exists, return it
      const existingUser = await db.getUserById(ctx.user.id);
      if (existingUser) {
        return { success: true, existing: true };
      }

      // Derive role and agency_id from invitation — never from client input
      let role: "company" | "candidate" = "candidate";
      let agencyId: string | null = null;

      // Check for pending company invitation by email
      const { data: invitation } = await (supabaseAdmin as any)
        .from("company_invitations")
        .select("*, companies(id, agency_id)")
        .eq("email", ctx.user.email)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (invitation?.companies) {
        role = "company";
        agencyId = (invitation.companies as any).agency_id || null;
      }

      // Check for agency invitation if no company invitation found
      if (!invitation) {
        const { data: agencyInvitation } = await (supabaseAdmin as any)
          .from("agency_invitations")
          .select("*")
          .eq("email", ctx.user.email)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (agencyInvitation) {
          role = "candidate"; // Agency invitations create agency users via a separate flow
          agencyId = agencyInvitation.agency_id || null;
        }
      }

      // Fall back to signup metadata if no invitation was found
      if (!agencyId && ctx.user.agency_id) {
        agencyId = ctx.user.agency_id;
      }
      if (role === "candidate" && ctx.user.role === "company") {
        role = "company";
      }

      const { error } = await db.createUserProfile({
        id: ctx.user.id,
        email: ctx.user.email || "",
        name: input.name || null,
        role,
        agency_id: agencyId,
      });

      if (error) {
        console.error("[Auth] Failed to create user profile:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user profile",
        });
      }

      return { success: true, existing: false };
    }),

  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().optional(),
      newPassword: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update password using admin API (user is already authenticated)
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        ctx.user.id,
        { password: input.newPassword }
      );

      if (updateError) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao atualizar senha',
        });
      }

      return { success: true };
    }),
});
