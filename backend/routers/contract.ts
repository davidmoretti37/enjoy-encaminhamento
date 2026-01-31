// @ts-nocheck
// Contract router - employment contract management
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";
import { adminProcedure, companyProcedure, candidateProcedure } from "./procedures";
import * as db from "../db";

export const contractRouter = router({
  // Create contract
  create: companyProcedure
    .input(z.object({
      candidateId: z.string().uuid(),
      jobId: z.string().uuid(),
      applicationId: z.string().uuid(),
      contractType: z.enum(["estagio", "clt", "menor-aprendiz"]),
      contractNumber: z.string(),
      monthlySalary: z.number(),
      monthlyFee: z.number(),
      startDate: z.string(),
      endDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }

      const contractId = await db.createContract({
        companyId: company.id,
        ...input,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : undefined,
      });
      return { contractId };
    }),

  // Get contracts by company
  getByCompany: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) return [];
    return await db.getContractsByCompanyId(company.id);
  }),

  // Get contracts by candidate
  getByCandidate: candidateProcedure.query(async ({ ctx }) => {
    const candidate = await db.getCandidateByUserId(ctx.user.id);
    if (!candidate) return [];
    return await db.getContractsByCandidateId(candidate.id);
  }),

  // Get all active contracts (admin)
  getAllActive: adminProcedure.query(async () => {
    return await db.getAllActiveContracts();
  }),

  // Update contract
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(["pending-signature", "active", "suspended", "terminated", "completed"]).optional(),
      terminationReason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateContract(id, data);
      return { success: true };
    }),
});
