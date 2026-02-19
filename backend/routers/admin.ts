// @ts-nocheck
/**
 * Admin Router - Admin dashboard and management
 */
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { adminProcedure } from "./procedures";
import * as db from "../db";

export const adminRouter = router({
  // Get dashboard statistics
  getStats: adminProcedure.query(async () => {
    return await db.getAdminDashboardStats();
  }),

  // Application management
  getAllApplications: adminProcedure.query(async () => {
    // TODO: implement getAllApplications
    return [];
  }),

  updateApplicationStatus: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['applied', 'screening', 'interview-scheduled', 'interviewed', 'selected', 'rejected', 'withdrawn']),
    }))
    .mutation(async ({ input }) => {
      // TODO: implement updateApplicationStatus
      return { success: true };
    }),

  // Contract management
  getAllContracts: adminProcedure.query(async () => {
    // TODO: implement getAllContracts
    return [];
  }),

  updateContractStatus: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['pending-signature', 'active', 'suspended', 'terminated', 'completed']),
    }))
    .mutation(async ({ ctx, input }) => {
      // Gate check: when activating a contract, verify all hiring documents are signed
      if (input.status === 'active') {
        const contract = await db.getContractWithDetails(input.id);
        if (contract && contract.company_id) {
          const company = await db.getCompanyById(contract.company_id);
          if (company?.agency_id && contract.contract_type) {
            // Map contract_type enum to document category
            const categoryMap: Record<string, string> = {
              'clt': 'clt',
              'estagio': 'estagio',
              'menor-aprendiz': 'menor_aprendiz',
            };
            const category = categoryMap[contract.contract_type];
            if (category) {
              const status = await db.checkAllDocumentsSigned({
                agencyId: company.agency_id,
                companyId: company.id,
                category,
                contractId: input.id,
              });
              if (!status.allSigned) {
                throw new TRPCError({
                  code: 'BAD_REQUEST',
                  message: `Documentos pendentes de assinatura pela empresa (${status.signed}/${status.total} assinados)`,
                });
              }
            }
          }
        }
      }

      // TODO: implement updateContractStatus

      // Generate payment schedule when contract is activated
      if (input.status === 'active') {
        try {
          const count = await db.generateContractPayments(input.id);
          console.log(`[Admin] Generated ${count} payments for contract ${input.id}`);
        } catch (err) {
          console.error(`[Admin] Failed to generate payments for contract ${input.id}:`, err);
        }
      }

      return { success: true };
    }),

  // Payment management
  getAllPayments: adminProcedure.query(async () => {
    return await db.getAllPayments();
  }),

  updatePaymentStatus: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['pending', 'paid', 'overdue', 'failed', 'refunded']),
    }))
    .mutation(async ({ input }) => {
      await db.updatePaymentStatus(input.id, input.status);
      return { success: true };
    }),

  getPaymentAlertCounts: adminProcedure.query(async () => {
    return await db.getPaymentAlertCounts();
  }),

  getPaymentsPendingReview: adminProcedure.query(async () => {
    return await db.getPaymentsPendingReview();
  }),

  reviewPaymentReceipt: adminProcedure
    .input(z.object({
      paymentId: z.string().uuid(),
      action: z.enum(['approve', 'reject']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updates: any = {
        receipt_verified_at: new Date().toISOString(),
        receipt_verified_by: ctx.user.id,
      };
      if (input.action === 'approve') {
        updates.receipt_status = 'verified';
        updates.status = 'paid';
        updates.paid_at = new Date().toISOString();
      } else {
        updates.receipt_status = 'rejected';
        if (input.notes) updates.notes = input.notes;
      }
      await db.updatePayment(input.paymentId, updates);
      return { success: true };
    }),

  // Feedback management
  getAllFeedback: adminProcedure.query(async () => {
    // TODO: implement getAllFeedback
    return [];
  }),

  updateFeedbackStatus: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['pending', 'submitted', 'reviewed']),
    }))
    .mutation(async ({ input }) => {
      // TODO: implement updateFeedbackStatus
      return { success: true };
    }),

  // AI Matching oversight
  getAIMatchingStats: adminProcedure.query(async () => {
    // TODO: implement getAIMatchingStats
    return { totalMatches: 0, averageScore: 0, matchesByJob: [] };
  }),

  getApplicationsWithScores: adminProcedure.query(async () => {
    // TODO: implement getApplicationsWithScores
    return [];
  }),
});
