// @ts-nocheck
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
  createProfile: publicProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        email: z.string().email(),
        name: z.string().optional(),
        role: z.enum(["company", "candidate"]),
        agency_id: z.string().uuid().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      // Use admin client to bypass RLS
      const { error } = await db.createUserProfile({
        id: input.userId,
        email: input.email,
        name: input.name || null,
        role: input.role,
        agency_id: input.agency_id || null,
      });

      if (error) {
        console.error("[Auth] Failed to create user profile:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user profile",
        });
      }

      return { success: true };
    }),

  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
      newPassword: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
    }))
    .mutation(async ({ ctx, input }) => {
      // Re-authenticate with current password to verify identity
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: ctx.user.email,
        password: input.currentPassword,
      });

      if (signInError) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Senha atual incorreta',
        });
      }

      // Update password using admin API (after verification)
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
