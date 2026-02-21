// Shared tRPC procedures with role-based access control
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";

// Admin-only procedure (top-level admin role, formerly "affiliate")
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Company-only procedure
export const companyProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "company" && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Company access required" });
  }
  return next({ ctx });
});

// Candidate-only procedure
export const candidateProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "candidate" && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Candidate access required" });
  }
  return next({ ctx });
});

// Agency-only procedure (manages companies/candidates in a region)
export const agencyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "agency" && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Agency access required" });
  }
  return next({ ctx });
});

