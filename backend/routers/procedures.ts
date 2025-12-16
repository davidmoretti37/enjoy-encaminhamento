// @ts-nocheck
// Shared tRPC procedures with role-based access control
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";

// Admin-only procedure (affiliate role)
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "affiliate") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Company-only procedure
export const companyProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "company" && ctx.user.role !== "affiliate") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Company access required" });
  }
  return next({ ctx });
});

// Candidate-only procedure
export const candidateProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "candidate" && ctx.user.role !== "affiliate") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Candidate access required" });
  }
  return next({ ctx });
});

// School-only procedure
export const schoolProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "school" && ctx.user.role !== "affiliate") {
    throw new TRPCError({ code: "FORBIDDEN", message: "School access required" });
  }
  return next({ ctx });
});
