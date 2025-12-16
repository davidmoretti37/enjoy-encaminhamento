/**
 * Agents Router - tRPC endpoints for the multi-agent system
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, matchingProcedure } from "../_core/trpc";
import { adminProcedure, companyProcedure, schoolProcedure } from "./procedures";

// Import agents
import {
  EnhancedOrchestrator,
  EnhancedMatchingAgent,
  EnhancedCompanyHealthAgent,
  EnhancedCandidateInsightsAgent,
  WorkforcePlanningAgent,
  PipelineAgent,
  SchoolPerformanceAgent,
  ContractRenewalAgent,
  FeedbackAnalysisAgent,
  createAgentContext,
  IntelligentChatHandler,
  DatabaseAdapter,
} from "../agents";

// Import database for fetching data
import * as db from "../db";

// Create and configure the orchestrator singleton
const orchestrator = new EnhancedOrchestrator();

// Register all agents
orchestrator.registerAgent("matching", new EnhancedMatchingAgent());
orchestrator.registerAgent("companyHealth", new EnhancedCompanyHealthAgent());
orchestrator.registerAgent("candidateInsights", new EnhancedCandidateInsightsAgent());
orchestrator.registerAgent("workforcePlanning", new WorkforcePlanningAgent());
orchestrator.registerAgent("pipeline", new PipelineAgent());
orchestrator.registerAgent("schoolPerformance", new SchoolPerformanceAgent());
orchestrator.registerAgent("contractRenewal", new ContractRenewalAgent());
orchestrator.registerAgent("feedbackAnalysis", new FeedbackAnalysisAgent());

// Create database adapter and intelligent chat handler
const databaseAdapter = new DatabaseAdapter();
const chatHandler = new IntelligentChatHandler({
  orchestrator,
  database: databaseAdapter,
});

export const agentsRouter = router({
  // ============================================================
  // Matching Agent
  // ============================================================

  /**
   * Match candidates for a job with advanced multi-factor analysis
   */
  matchCandidates: matchingProcedure
    .input(
      z.object({
        jobId: z.string(),
        maxCandidates: z.number().optional().default(50),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { jobId, maxCandidates } = input;

      // Fetch job details
      const job = await db.getJobById(jobId);
      if (!job) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      }

      // Fetch all active candidates
      const candidates = await db.getAllCandidates();
      const activeCandidates = candidates.filter((c) => c.status === "active");

      // Create agent context
      const agentContext = createAgentContext(
        ctx.user.id,
        ctx.user.affiliate_id || "",
        { jobId }
      );

      // Execute matching
      const result = await orchestrator.executeTask(
        "matching",
        "matchCandidatesAdvanced",
        { job, candidates: activeCandidates },
        agentContext
      );

      return result;
    }),

  // ============================================================
  // Company Health Agent
  // ============================================================

  /**
   * Analyze company health with predictive insights
   */
  analyzeCompanyHealth: companyProcedure
    .input(
      z.object({
        companyId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { companyId } = input;

      // Verify access
      if (ctx.user.role === "company") {
        const userCompany = await db.getCompanyByUserId(ctx.user.id);
        if (!userCompany || userCompany.id !== companyId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
      }

      const agentContext = createAgentContext(
        ctx.user.id,
        ctx.user.affiliate_id || "",
        { companyId }
      );

      const result = await orchestrator.executeTask(
        "companyHealth",
        "analyzeCompanyHealthAdvanced",
        { companyId },
        agentContext
      );

      return result;
    }),

  // ============================================================
  // Candidate Insights Agent
  // ============================================================

  /**
   * Get comprehensive candidate insights
   */
  getCandidateInsights: adminProcedure
    .input(
      z.object({
        candidateId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { candidateId } = input;

      const agentContext = createAgentContext(
        ctx.user.id,
        ctx.user.affiliate_id || "",
        { candidateId }
      );

      const result = await orchestrator.executeTask(
        "candidateInsights",
        "getCandidateInsightsAdvanced",
        { candidateId },
        agentContext
      );

      return result;
    }),

  // ============================================================
  // Workforce Planning Agent
  // ============================================================

  /**
   * Forecast workforce needs
   */
  forecastWorkforce: adminProcedure
    .input(
      z.object({
        affiliateId: z.string().optional(),
        months: z.number().optional().default(12),
      })
    )
    .query(async ({ input, ctx }) => {
      const affiliateId = input.affiliateId || ctx.user.affiliate_id || "";

      const agentContext = createAgentContext(
        ctx.user.id,
        affiliateId,
        { months: input.months }
      );

      const result = await orchestrator.executeTask(
        "workforcePlanning",
        "forecastWorkforceNeeds",
        { affiliateId, months: input.months },
        agentContext
      );

      return result;
    }),

  // ============================================================
  // Pipeline Agent
  // ============================================================

  /**
   * Analyze sales pipeline
   */
  analyzePipeline: adminProcedure
    .input(
      z.object({
        affiliateId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const affiliateId = input.affiliateId || ctx.user.affiliate_id || "";

      const agentContext = createAgentContext(ctx.user.id, affiliateId, {});

      const result = await orchestrator.executeTask(
        "pipeline",
        "analyzePipeline",
        { affiliateId },
        agentContext
      );

      return result;
    }),

  // ============================================================
  // School Performance Agent
  // ============================================================

  /**
   * Analyze school performance
   */
  analyzeSchoolPerformance: schoolProcedure
    .input(
      z.object({
        schoolId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { schoolId } = input;

      // Verify access for school users
      if (ctx.user.role === "school") {
        const userSchool = await db.getSchoolByUserId(ctx.user.id);
        if (!userSchool || userSchool.id !== schoolId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
      }

      const agentContext = createAgentContext(
        ctx.user.id,
        ctx.user.affiliate_id || "",
        { schoolId }
      );

      const result = await orchestrator.executeTask(
        "schoolPerformance",
        "analyzeSchoolPerformance",
        { schoolId },
        agentContext
      );

      return result;
    }),

  // ============================================================
  // Contract Renewal Agent
  // ============================================================

  /**
   * Predict contract renewal probability
   */
  predictContractRenewal: companyProcedure
    .input(
      z.object({
        contractId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { contractId } = input;

      const agentContext = createAgentContext(
        ctx.user.id,
        ctx.user.affiliate_id || "",
        { contractId }
      );

      const result = await orchestrator.executeTask(
        "contractRenewal",
        "predictContractRenewal",
        { contractId },
        agentContext
      );

      return result;
    }),

  // ============================================================
  // Feedback Analysis Agent
  // ============================================================

  /**
   * Analyze feedback trends
   */
  analyzeFeedback: adminProcedure
    .input(
      z.object({
        affiliateId: z.string().optional(),
        months: z.number().optional().default(6),
      })
    )
    .query(async ({ input, ctx }) => {
      const affiliateId = input.affiliateId || ctx.user.affiliate_id || "";

      const agentContext = createAgentContext(
        ctx.user.id,
        affiliateId,
        { months: input.months }
      );

      const result = await orchestrator.executeTask(
        "feedbackAnalysis",
        "analyzeFeedbackTrends",
        { affiliateId, months: input.months },
        agentContext
      );

      return result;
    }),

  // ============================================================
  // System Status & Metrics
  // ============================================================

  /**
   * Get system status and agent metrics
   */
  getSystemStatus: adminProcedure.query(async () => {
    return orchestrator.getSystemStatus();
  }),

  /**
   * Get agent metrics
   */
  getAgentMetrics: adminProcedure.query(async () => {
    return orchestrator.getMetrics();
  }),

  /**
   * Get execution history
   */
  getExecutionHistory: adminProcedure
    .input(
      z.object({
        agentName: z.string().optional(),
        status: z.enum(["completed", "failed"]).optional(),
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ input }) => {
      return orchestrator.getExecutionHistory(input);
    }),

  /**
   * List available agents
   */
  listAgents: protectedProcedure.query(async () => {
    const agentNames = orchestrator.getAgents();
    return agentNames.map((name) => orchestrator.getAgentInfo(name));
  }),

  // ============================================================
  // Chat Interface
  // ============================================================

  /**
   * Chat with the AI agents using natural language
   */
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { message } = input;

      const agentContext = createAgentContext(
        ctx.user.id,
        ctx.user.affiliate_id || "",
        {}
      );

      const response = await chatHandler.processMessage(
        message,
        ctx.user.id,
        agentContext
      );

      return response;
    }),

  /**
   * Get chat history for current user
   */
  getChatHistory: protectedProcedure.query(async ({ ctx }) => {
    return chatHandler.getHistory(ctx.user.id);
  }),

  /**
   * Clear chat history for current user
   */
  clearChatHistory: protectedProcedure.mutation(async ({ ctx }) => {
    chatHandler.clearHistory(ctx.user.id);
    return { success: true };
  }),
});
