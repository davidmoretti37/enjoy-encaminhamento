/**
 * Matching Router - Advanced AI-powered candidate-job matching
 */
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { agencyProcedure, companyProcedure, adminProcedure } from "./procedures";
import * as db from "../db";
import { supabaseAdmin } from "../supabase";
import {
  runMatchingPipeline,
  saveMatchResults,
  getMatchResults,
} from "../services/matching/index";
import type { MatchingConfig } from "../services/matching/index";
import { getAllWeightProfiles, suggestWeightProfile } from "../services/matching/weights";

export const matchingRouter = router({
  /**
   * Run the full advanced matching pipeline for a job
   * Stages: Vector Retrieval → Soft Scoring → Bidirectional → LLM Re-Ranking
   */
  runPipeline: agencyProcedure
    .input(z.object({
      jobId: z.string().uuid(),
      options: z.object({
        vectorRecallLimit: z.number().min(50).max(1000).default(500),
        vectorThreshold: z.number().min(0).max(1).default(0.2),
        weightProfile: z.enum(['balanced', 'technical', 'customer_facing', 'entry_level', 'leadership', 'auto']).default('auto'),
        enableLLMReranking: z.boolean().default(true),
        llmRerankThreshold: z.number().min(0).max(100).default(65),
        llmRerankLimit: z.number().min(5).max(50).default(15),
        useHybridSearch: z.boolean().default(true),
        includeExplanations: z.boolean().default(true),
        limit: z.number().min(1).max(100).default(50),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify agency has access to this job
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role ?? '');
      if (!agency) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
      }

      // Run the matching pipeline
      const config: MatchingConfig = input.options || {};
      const result = await runMatchingPipeline(input.jobId, config);

      // Save results to database
      await saveMatchResults(input.jobId, result.results, result.weightProfile);

      return {
        jobId: result.jobId,
        totalCandidatesRetrieved: result.totalCandidatesRetrieved,
        totalCandidatesScored: result.totalCandidatesScored,
        totalCandidatesReranked: result.totalCandidatesReranked,
        weightProfile: result.weightProfile,
        executionTimeMs: result.executionTimeMs,
        algorithmVersion: result.algorithmVersion,
        resultCount: result.results.length,
      };
    }),

  /**
   * Get matching results for a job (from database, after pipeline has run)
   */
  getResults: agencyProcedure
    .input(z.object({
      jobId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(50),
      minScore: z.number().min(0).max(100).default(0),
      sortBy: z.enum(['composite_score', 'llm_refined_score', 'semantic_score']).default('composite_score'),
      includeExplanations: z.boolean().default(true),
    }))
    .query(async ({ ctx, input }) => {
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role ?? '');
      if (!agency) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
      }

      const results = await getMatchResults(input.jobId, {
        limit: input.limit,
        minScore: input.minScore,
        sortBy: input.sortBy,
        includeExplanations: input.includeExplanations,
      });

      return results;
    }),

  /**
   * Get detailed explanation for a specific candidate-job match
   */
  getExplanation: agencyProcedure
    .input(z.object({
      jobId: z.string().uuid(),
      candidateId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role ?? '');
      if (!agency) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
      }

      // Get the match record
      const { data, error } = await (supabaseAdmin as any)
        .from('job_matches')
        .select('*')
        .eq('job_id', input.jobId)
        .eq('candidate_id', input.candidateId)
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Match not found. Run the matching pipeline first.'
        });
      }

      return {
        compositeScore: data.composite_score,
        factors: {
          semantic: data.semantic_score,
          skills: data.skills_score,
          location: data.location_score,
          education: data.education_score,
          experience: data.experience_score,
          contract: data.contract_score,
          personality: data.personality_score,
          history: data.history_score,
          bidirectional: data.bidirectional_score,
        },
        llm: data.llm_refined_score ? {
          refinedScore: data.llm_refined_score,
          confidence: data.llm_confidence,
          reasoning: data.llm_reasoning,
          recommendation: data.llm_recommendation,
        } : null,
        explanation: {
          summary: data.explanation_summary,
          strengths: data.strengths || [],
          opportunities: data.opportunities || [],
          concerns: data.concerns || [],
        },
        dataCompleteness: data.data_completeness,
        weightProfile: data.weight_profile,
        algorithmVersion: data.algorithm_version,
      };
    }),

  /**
   * Get available weight profiles for matching configuration
   */
  getWeightProfiles: agencyProcedure.query(async () => {
    const profiles = getAllWeightProfiles();
    return profiles.map(p => ({
      name: p.name,
      description: p.description,
      weights: p.weights,
    }));
  }),

  /**
   * Get suggested weight profile for a job based on its characteristics
   */
  getSuggestedProfile: agencyProcedure
    .input(z.object({
      jobId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const { data: job, error } = await (supabaseAdmin as any)
        .from('jobs')
        .select('title, description, contract_type, required_skills')
        .eq('id', input.jobId)
        .single();

      if (error || !job) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
      }

      const suggested = suggestWeightProfile({
        title: job.title,
        description: job.description,
        contract_type: job.contract_type,
        required_skills: job.required_skills,
      });

      return { suggestedProfile: suggested };
    }),

  /**
   * Configure matching settings for a job
   */
  configureJob: agencyProcedure
    .input(z.object({
      jobId: z.string().uuid(),
      weightProfile: z.enum(['balanced', 'technical', 'customer_facing', 'entry_level', 'leadership']).optional(),
      customWeights: z.record(z.number()).optional(),
      enableLLMReranking: z.boolean().optional(),
      llmRerankThreshold: z.number().min(0).max(100).optional(),
      llmRerankLimit: z.number().min(10).max(100).optional(),
      vectorRecallLimit: z.number().min(50).max(1000).optional(),
      vectorThreshold: z.number().min(0).max(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role ?? '');
      if (!agency) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
      }

      const { jobId, ...config } = input;

      // Upsert configuration
      const { error } = await (supabaseAdmin as any)
        .from('job_matching_config')
        .upsert({
          job_id: jobId,
          weight_profile: config.weightProfile,
          custom_weights: config.customWeights,
          enable_llm_reranking: config.enableLLMReranking,
          llm_rerank_threshold: config.llmRerankThreshold,
          llm_rerank_limit: config.llmRerankLimit,
          vector_recall_limit: config.vectorRecallLimit,
          vector_threshold: config.vectorThreshold,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'job_id',
        });

      if (error) {
        console.error('Error saving matching config:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to save configuration' });
      }

      return { success: true };
    }),

  /**
   * Get matching configuration for a job
   */
  getJobConfig: agencyProcedure
    .input(z.object({
      jobId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const { data, error } = await (supabaseAdmin as any)
        .from('job_matching_config')
        .select('*')
        .eq('job_id', input.jobId)
        .single();

      if (error || !data) {
        // Return defaults if no config exists
        return {
          weightProfile: 'balanced',
          customWeights: null,
          enableLLMReranking: true,
          llmRerankThreshold: 60,
          llmRerankLimit: 50,
          vectorRecallLimit: 500,
          vectorThreshold: 0.2,
        };
      }

      return {
        weightProfile: data.weight_profile,
        customWeights: data.custom_weights,
        enableLLMReranking: data.enable_llm_reranking,
        llmRerankThreshold: data.llm_rerank_threshold,
        llmRerankLimit: data.llm_rerank_limit,
        vectorRecallLimit: data.vector_recall_limit,
        vectorThreshold: data.vector_threshold,
      };
    }),

  /**
   * Get matching analytics/statistics
   */
  getAnalytics: adminProcedure
    .input(z.object({
      jobId: z.string().uuid().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }))
    .query(async ({ input }) => {
      let query = (supabaseAdmin as any)
        .from('job_matches')
        .select('composite_score, llm_refined_score, llm_recommendation, algorithm_version, created_at');

      if (input.jobId) {
        query = query.eq('job_id', input.jobId);
      }
      if (input.startDate) {
        query = query.gte('created_at', input.startDate);
      }
      if (input.endDate) {
        query = query.lte('created_at', input.endDate);
      }

      const { data, error } = await query.limit(1000);

      if (error || !data) {
        return {
          totalMatches: 0,
          averageCompositeScore: 0,
          averageLLMScore: 0,
          recommendationDistribution: {},
          algorithmVersions: {},
        };
      }

      // Calculate statistics
      const totalMatches = data.length;
      const compositeScores = data.map((d: any) => d.composite_score).filter((s: any): s is number => s != null);
      const llmScores = data.map((d: any) => d.llm_refined_score).filter((s: any): s is number => s != null);

      const averageCompositeScore = compositeScores.length > 0
        ? compositeScores.reduce((a: number, b: number) => a + b, 0) / compositeScores.length
        : 0;

      const averageLLMScore = llmScores.length > 0
        ? llmScores.reduce((a: number, b: number) => a + b, 0) / llmScores.length
        : 0;

      const recommendationDistribution: Record<string, number> = {};
      for (const d of data) {
        if (d.llm_recommendation) {
          recommendationDistribution[d.llm_recommendation] = (recommendationDistribution[d.llm_recommendation] || 0) + 1;
        }
      }

      const algorithmVersions: Record<string, number> = {};
      for (const d of data) {
        if (d.algorithm_version) {
          algorithmVersions[d.algorithm_version] = (algorithmVersions[d.algorithm_version] || 0) + 1;
        }
      }

      return {
        totalMatches,
        averageCompositeScore: Math.round(averageCompositeScore * 10) / 10,
        averageLLMScore: Math.round(averageLLMScore * 10) / 10,
        recommendationDistribution,
        algorithmVersions,
      };
    }),
});
