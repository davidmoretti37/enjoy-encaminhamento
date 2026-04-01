/**
 * Admin Router - Admin dashboard and management
 * Endpoints marked with agencyProcedure are accessible to both admin and agency users.
 * Agency users see only data scoped to their own agency.
 */
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { adminProcedure, agencyProcedure } from "./procedures";
import * as db from "../db";
import type { User } from "../db/types";

// Helper: get agency ID for scoping. Returns null for admins (meaning "all").
async function getAgencyScope(ctx: { user: User }): Promise<string | null> {
  if (ctx.user.role === 'agency') {
    const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
    if (!agency) throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
    return agency.id;
  }
  // Admin/super_admin — no scoping
  return null;
}

// Helper: verify a payment belongs to the user's agency
async function verifyPaymentBelongsToAgency(paymentId: string, agencyId: string) {
  const { data } = await (await import('../supabase')).supabaseAdmin
    .from('payments')
    .select('id, company_id, companies!inner(agency_id)')
    .eq('id', paymentId)
    .single();
  if (!data || (data as any).companies?.agency_id !== agencyId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Payment does not belong to your agency' });
  }
}

// Helper: verify a contract belongs to the user's agency
async function verifyContractBelongsToAgency(contractId: string, agencyId: string) {
  const contract = await db.getContractWithDetails(contractId);
  if (!contract || !contract.company_id) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Contract not found' });
  }
  const company = await db.getCompanyById(contract.company_id);
  if (!company || (company as any).agency_id !== agencyId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Contract does not belong to your agency' });
  }
  return { contract, company };
}

export const adminRouter = router({
  // Get dashboard statistics (admin-only — platform-wide stats)
  getStats: adminProcedure.query(async () => {
    return await db.getAdminDashboardStats();
  }),

  // Application management (admin-only)
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

  // Contract management — agency + admin
  getAllContracts: adminProcedure.query(async () => {
    // TODO: implement getAllContracts
    return [];
  }),

  updateContractStatus: agencyProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['pending-signature', 'active', 'suspended', 'terminated', 'completed']),
    }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = await getAgencyScope(ctx);

      // If agency user, verify contract belongs to their agency
      if (agencyId) {
        await verifyContractBelongsToAgency(input.id, agencyId);
      }

      // Gate check: when activating a contract, verify all hiring documents are signed
      if (input.status === 'active') {
        const contract = await db.getContractWithDetails(input.id);
        if (contract && contract.company_id) {
          const company = await db.getCompanyById(contract.company_id);
          if ((company as any)?.agency_id && contract.contract_type) {
            // Map contract_type enum to document category
            const categoryMap: Record<string, string> = {
              'clt': 'clt',
              'estagio': 'estagio',
              'menor-aprendiz': 'menor_aprendiz',
            };
            const category = categoryMap[contract.contract_type];
            if (category) {
              const status = await db.checkAllDocumentsSigned({
                agencyId: (company as any).agency_id,
                companyId: company!.id,
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

  // Payment management — agency + admin
  getAllPayments: adminProcedure.query(async () => {
    return await db.getAllPayments();
  }),

  updatePaymentStatus: agencyProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['pending', 'paid', 'overdue', 'failed', 'refunded']),
    }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = await getAgencyScope(ctx);
      if (agencyId) {
        await verifyPaymentBelongsToAgency(input.id, agencyId);
      }
      await db.updatePaymentStatus(input.id, input.status);
      return { success: true };
    }),

  getPaymentAlertCounts: agencyProcedure.query(async ({ ctx }) => {
    const agencyId = await getAgencyScope(ctx);
    if (agencyId) {
      return await db.getPaymentAlertCountsByAgency(agencyId);
    }
    return await db.getPaymentAlertCounts();
  }),

  getPaymentsPendingReview: agencyProcedure.query(async ({ ctx }) => {
    const agencyId = await getAgencyScope(ctx);
    if (agencyId) {
      return await db.getPaymentsPendingReviewByAgency(agencyId);
    }
    return await db.getPaymentsPendingReview();
  }),

  updatePaymentDetails: agencyProcedure
    .input(z.object({
      paymentId: z.string().uuid(),
      amount: z.number().min(0).optional(),
      due_date: z.string().optional(),
      billing_period: z.string().optional(),
      notes: z.string().optional(),
      job_id: z.string().uuid().nullable().optional(),
      payment_type: z.enum(['monthly-fee', 'insurance-fee', 'annual-insurance', 'setup-fee', 'penalty', 'refund']).optional(),
      status: z.enum(['pending', 'paid', 'overdue', 'failed', 'refunded']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = await getAgencyScope(ctx);
      if (agencyId) {
        await verifyPaymentBelongsToAgency(input.paymentId, agencyId);
      }

      const { paymentId, ...fields } = input;
      const updates: any = {};
      if (fields.amount !== undefined) updates.amount = fields.amount;
      if (fields.due_date !== undefined) updates.due_date = fields.due_date;
      if (fields.billing_period !== undefined) updates.billing_period = fields.billing_period;
      if (fields.notes !== undefined) updates.notes = fields.notes;
      if (fields.job_id !== undefined) updates.job_id = fields.job_id;
      if (fields.payment_type !== undefined) updates.payment_type = fields.payment_type;
      if (fields.status !== undefined) {
        updates.status = fields.status;
        if (fields.status === 'paid') {
          updates.paid_at = new Date().toISOString();
        }
      }

      await db.updatePayment(paymentId, updates);
      return { success: true };
    }),

  createManualPayment: agencyProcedure
    .input(z.object({
      company_id: z.string().uuid(),
      job_id: z.string().uuid().optional(),
      amount: z.number().min(0),
      due_date: z.string(),
      billing_period: z.string().optional(),
      payment_type: z.enum(['monthly-fee', 'insurance-fee', 'annual-insurance', 'setup-fee', 'penalty', 'refund']),
      status: z.enum(['pending', 'paid', 'overdue']).default('pending'),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = await getAgencyScope(ctx);
      if (agencyId) {
        // Verify company belongs to agency
        const company = await db.getCompanyById(input.company_id);
        if (!company || (company as any).agency_id !== agencyId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Company does not belong to your agency' });
        }
      }

      const paymentData: any = {
        company_id: input.company_id,
        job_id: input.job_id || null,
        amount: input.amount,
        due_date: input.due_date,
        billing_period: input.billing_period || null,
        payment_type: input.payment_type,
        status: input.status,
        notes: input.notes || null,
      };
      if (input.status === 'paid') {
        paymentData.paid_at = new Date().toISOString();
      }

      const id = await db.createPayment(paymentData);
      return { success: true, id };
    }),

  deletePayment: agencyProcedure
    .input(z.object({
      paymentId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = await getAgencyScope(ctx);
      if (agencyId) {
        await verifyPaymentBelongsToAgency(input.paymentId, agencyId);
      }

      await db.deletePayment(input.paymentId);
      return { success: true };
    }),

  reviewPaymentReceipt: agencyProcedure
    .input(z.object({
      paymentId: z.string().uuid(),
      action: z.enum(['approve', 'reject']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = await getAgencyScope(ctx);
      if (agencyId) {
        await verifyPaymentBelongsToAgency(input.paymentId, agencyId);
      }

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

  // Upload receipt for a payment (agency)
  uploadPaymentReceipt: agencyProcedure
    .input(z.object({
      paymentId: z.string().uuid(),
      companyId: z.string().uuid(),
      fileName: z.string(),
      fileData: z.string(), // base64
      contentType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { storagePut } = await import('../storage');

      const fileBuffer = Buffer.from(input.fileData, 'base64');
      const storageKey = `receipts/${input.companyId}/${input.paymentId}/${input.fileName}`;
      const { url } = await storagePut(storageKey, fileBuffer, input.contentType);

      await db.updatePayment(input.paymentId, {
        receipt_url: url,
        receipt_status: 'pending-review',
        receipt_uploaded_at: new Date().toISOString(),
      });

      return { success: true, receiptUrl: url };
    }),

  // Feedback management (admin-only — platform oversight)
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

  // AI Matching oversight (admin-only)
  getAIMatchingStats: adminProcedure.query(async () => {
    // TODO: implement getAIMatchingStats
    return { totalMatches: 0, averageScore: 0, matchesByJob: [] };
  }),

  getApplicationsWithScores: adminProcedure.query(async () => {
    // TODO: implement getApplicationsWithScores
    return [];
  }),
});
