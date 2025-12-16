// @ts-nocheck
// Auth router - authentication endpoints
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, router } from "../_core/trpc";
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
        school_id: z.string().uuid().optional().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      // Use admin client to bypass RLS
      const { error } = await db.createUserProfile({
        id: input.userId,
        email: input.email,
        name: input.name || null,
        role: input.role,
        school_id: input.school_id || null,
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
});
