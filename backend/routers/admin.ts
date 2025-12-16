// @ts-nocheck
/**
 * Admin Router - Admin dashboard and management
 *
 * Note: For advanced AI analytics and insights, use the agents router:
 *   - trpc.agents.getSystemStatus - Agent system status
 *   - trpc.agents.getAgentMetrics - Execution metrics
 *   - trpc.agents.getExecutionHistory - Task history
 *   - trpc.agents.forecastWorkforce - Workforce planning
 *   - trpc.agents.analyzePipeline - Pipeline analysis
 *   - trpc.agents.analyzeFeedback - Feedback trends
 *
 * @see ../routers/agents.ts for full agent capabilities
 */
import { z } from "zod";
import { router } from "../_core/trpc";
import { adminProcedure } from "./procedures";
import * as db from "../db";

export const adminRouter = router({
  // Get dashboard statistics
  getStats: adminProcedure.query(async () => {
    return await db.getAdminDashboardStats();
  }),

  // Application management
  getAllApplications: adminProcedure.query(async () => {
    return await db.getAllApplications();
  }),

  updateApplicationStatus: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['applied', 'screening', 'interview-scheduled', 'interviewed', 'selected', 'rejected', 'withdrawn']),
    }))
    .mutation(async ({ input }) => {
      await db.updateApplicationStatus(input.id, input.status);
      return { success: true };
    }),

  // Contract management
  getAllContracts: adminProcedure.query(async () => {
    return await db.getAllContracts();
  }),

  updateContractStatus: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['pending-signature', 'active', 'suspended', 'terminated', 'completed']),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.updateContractStatus(input.id, input.status, ctx.user.id);
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

  // Feedback management
  getAllFeedback: adminProcedure.query(async () => {
    return await db.getAllFeedback();
  }),

  updateFeedbackStatus: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['pending', 'submitted', 'reviewed']),
    }))
    .mutation(async ({ input }) => {
      await db.updateFeedbackStatus(input.id, input.status);
      return { success: true };
    }),

  // AI Matching oversight
  getAIMatchingStats: adminProcedure.query(async () => {
    return await db.getAIMatchingStats();
  }),

  getApplicationsWithScores: adminProcedure.query(async () => {
    return await db.getApplicationsWithScores();
  }),
});
