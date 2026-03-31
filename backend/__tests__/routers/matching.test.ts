import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock external dependencies
vi.mock("../../supabase", () => ({
  supabase: { auth: { getUser: vi.fn() } },
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

vi.mock("../../db", () => ({
  getAgencyForUserContext: vi.fn(),
  getAgencyByUserId: vi.fn(),
}));

vi.mock("../../services/matching/index", () => ({
  runMatchingPipeline: vi.fn(),
  saveMatchResults: vi.fn(),
  getMatchResults: vi.fn(),
}));

vi.mock("../../services/matching/weights", () => ({
  getAllWeightProfiles: vi.fn(),
  suggestWeightProfile: vi.fn(),
}));

import { matchingRouter } from "../../routers/matching";
import * as db from "../../db";
import { supabaseAdmin } from "../../supabase";
import {
  runMatchingPipeline,
  saveMatchResults,
  getMatchResults,
} from "../../services/matching/index";
import {
  getAllWeightProfiles,
  suggestWeightProfile,
} from "../../services/matching/weights";
import {
  agencyContext,
  adminContext,
  candidateContext,
  companyContext,
  unauthenticatedContext,
} from "../helpers/mock-context";
import { mockAgency, MOCK_IDS } from "../helpers/mock-data";

const createCaller = (ctx: any) => matchingRouter.createCaller(ctx);

// Helper to create a chainable supabase mock
function mockSupabaseChain(resolvedValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(resolvedValue),
    single: vi.fn().mockResolvedValue(resolvedValue),
    maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
    upsert: vi.fn().mockResolvedValue(resolvedValue),
  };
  return chain;
}

describe("matching router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: reset supabaseAdmin.from
    vi.mocked(supabaseAdmin.from).mockReturnValue(
      mockSupabaseChain({ data: null, error: null }) as any
    );
  });

  // ============================================
  // runPipeline
  // ============================================
  describe("runPipeline", () => {
    const validInput = {
      jobId: MOCK_IDS.job,
    };

    const mockPipelineResult = {
      jobId: MOCK_IDS.job,
      totalCandidatesRetrieved: 100,
      totalCandidatesScored: 50,
      totalCandidatesReranked: 15,
      weightProfile: "balanced",
      executionTimeMs: 2500,
      algorithmVersion: "v3.0",
      results: [
        { candidateId: MOCK_IDS.candidate, compositeScore: 85 },
      ],
    };

    it("runs matching pipeline successfully", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency() as any);
      vi.mocked(runMatchingPipeline).mockResolvedValue(mockPipelineResult as any);
      vi.mocked(saveMatchResults).mockResolvedValue(undefined);

      const caller = createCaller(agencyContext());
      const result = await caller.runPipeline(validInput);

      expect(result.jobId).toBe(MOCK_IDS.job);
      expect(result.totalCandidatesRetrieved).toBe(100);
      expect(result.resultCount).toBe(1);
      expect(runMatchingPipeline).toHaveBeenCalledWith(MOCK_IDS.job, {});
      expect(saveMatchResults).toHaveBeenCalledWith(
        MOCK_IDS.job,
        mockPipelineResult.results,
        "balanced"
      );
    });

    it("passes custom options to pipeline", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency() as any);
      vi.mocked(runMatchingPipeline).mockResolvedValue(mockPipelineResult as any);
      vi.mocked(saveMatchResults).mockResolvedValue(undefined);

      const caller = createCaller(agencyContext());
      await caller.runPipeline({
        jobId: MOCK_IDS.job,
        options: {
          vectorRecallLimit: 200,
          weightProfile: "technical",
          enableLLMReranking: false,
        },
      });

      expect(runMatchingPipeline).toHaveBeenCalledWith(
        MOCK_IDS.job,
        expect.objectContaining({
          vectorRecallLimit: 200,
          weightProfile: "technical",
          enableLLMReranking: false,
        })
      );
    });

    it("throws NOT_FOUND when agency not found", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(null as any);

      const caller = createCaller(agencyContext());
      await expect(caller.runPipeline(validInput)).rejects.toThrow(
        "Agency not found"
      );
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.runPipeline(validInput)).rejects.toThrow(
        "Agency access required"
      );
    });

    it("rejects company users", async () => {
      const caller = createCaller(companyContext());
      await expect(caller.runPipeline(validInput)).rejects.toThrow(
        "Agency access required"
      );
    });

    it("rejects unauthenticated users", async () => {
      const caller = createCaller(unauthenticatedContext());
      await expect(caller.runPipeline(validInput)).rejects.toThrow();
    });

    it("allows admin to run pipeline", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency() as any);
      vi.mocked(runMatchingPipeline).mockResolvedValue(mockPipelineResult as any);
      vi.mocked(saveMatchResults).mockResolvedValue(undefined);

      const caller = createCaller(adminContext());
      const result = await caller.runPipeline(validInput);
      expect(result.success).toBeUndefined();
      expect(result.jobId).toBe(MOCK_IDS.job);
    });

    it("validates jobId is a UUID", async () => {
      const caller = createCaller(agencyContext());
      await expect(
        caller.runPipeline({ jobId: "not-a-uuid" })
      ).rejects.toThrow();
    });
  });

  // ============================================
  // getResults
  // ============================================
  describe("getResults", () => {
    it("returns match results for a job", async () => {
      const mockResults = [
        { candidateId: MOCK_IDS.candidate, compositeScore: 85 },
      ];
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency() as any);
      vi.mocked(getMatchResults).mockResolvedValue(mockResults as any);

      const caller = createCaller(agencyContext());
      const result = await caller.getResults({ jobId: MOCK_IDS.job });

      expect(result).toEqual(mockResults);
      expect(getMatchResults).toHaveBeenCalledWith(MOCK_IDS.job, {
        limit: 50,
        minScore: 0,
        sortBy: "composite_score",
        includeExplanations: true,
      });
    });

    it("passes custom options", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency() as any);
      vi.mocked(getMatchResults).mockResolvedValue([]);

      const caller = createCaller(agencyContext());
      await caller.getResults({
        jobId: MOCK_IDS.job,
        limit: 10,
        minScore: 50,
        sortBy: "llm_refined_score",
        includeExplanations: false,
      });

      expect(getMatchResults).toHaveBeenCalledWith(MOCK_IDS.job, {
        limit: 10,
        minScore: 50,
        sortBy: "llm_refined_score",
        includeExplanations: false,
      });
    });

    it("throws NOT_FOUND when agency not found", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(null as any);

      const caller = createCaller(agencyContext());
      await expect(
        caller.getResults({ jobId: MOCK_IDS.job })
      ).rejects.toThrow("Agency not found");
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.getResults({ jobId: MOCK_IDS.job })
      ).rejects.toThrow("Agency access required");
    });
  });

  // ============================================
  // getExplanation
  // ============================================
  describe("getExplanation", () => {
    const mockMatchData = {
      composite_score: 85,
      semantic_score: 0.8,
      skills_score: 90,
      location_score: 100,
      education_score: 70,
      experience_score: 60,
      contract_score: 80,
      personality_score: 75,
      history_score: 65,
      bidirectional_score: 88,
      llm_refined_score: 82,
      llm_confidence: 0.9,
      llm_reasoning: "Strong match",
      llm_recommendation: "recommended",
      explanation_summary: "Good candidate",
      strengths: ["Skills match well"],
      opportunities: ["Location is perfect"],
      concerns: [],
      data_completeness: 0.85,
      weight_profile: "balanced",
      algorithm_version: "v3.0",
    };

    it("returns detailed match explanation", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency() as any);
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        mockSupabaseChain({ data: mockMatchData, error: null }) as any
      );

      const caller = createCaller(agencyContext());
      const result = await caller.getExplanation({
        jobId: MOCK_IDS.job,
        candidateId: MOCK_IDS.candidate,
      });

      expect(result.compositeScore).toBe(85);
      expect(result.factors.semantic).toBe(0.8);
      expect(result.factors.skills).toBe(90);
      expect(result.llm).toBeTruthy();
      expect(result.llm?.refinedScore).toBe(82);
      expect(result.explanation.summary).toBe("Good candidate");
      expect(result.explanation.strengths).toEqual(["Skills match well"]);
    });

    it("throws NOT_FOUND when match not found", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency() as any);
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        mockSupabaseChain({ data: null, error: { message: "not found" } }) as any
      );

      const caller = createCaller(agencyContext());
      await expect(
        caller.getExplanation({
          jobId: MOCK_IDS.job,
          candidateId: MOCK_IDS.candidate,
        })
      ).rejects.toThrow("Match not found");
    });

    it("returns null llm when no llm_refined_score", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency() as any);
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        mockSupabaseChain({
          data: { ...mockMatchData, llm_refined_score: null },
          error: null,
        }) as any
      );

      const caller = createCaller(agencyContext());
      const result = await caller.getExplanation({
        jobId: MOCK_IDS.job,
        candidateId: MOCK_IDS.candidate,
      });

      expect(result.llm).toBeNull();
    });
  });

  // ============================================
  // getWeightProfiles
  // ============================================
  describe("getWeightProfiles", () => {
    it("returns all weight profiles", async () => {
      const mockProfiles = [
        { name: "balanced", description: "Balanced", weights: { skills: 0.3 } },
        { name: "technical", description: "Technical", weights: { skills: 0.5 } },
      ];
      vi.mocked(getAllWeightProfiles).mockReturnValue(mockProfiles as any);

      const caller = createCaller(agencyContext());
      const result = await caller.getWeightProfiles();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("balanced");
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.getWeightProfiles()).rejects.toThrow(
        "Agency access required"
      );
    });
  });

  // ============================================
  // getSuggestedProfile
  // ============================================
  describe("getSuggestedProfile", () => {
    it("returns suggested weight profile for a job", async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        mockSupabaseChain({
          data: {
            title: "Software Engineer",
            description: "Build software",
            contract_type: "clt",
            required_skills: ["React", "Node.js"],
          },
          error: null,
        }) as any
      );
      vi.mocked(suggestWeightProfile).mockReturnValue("technical" as any);

      const caller = createCaller(agencyContext());
      const result = await caller.getSuggestedProfile({ jobId: MOCK_IDS.job });

      expect(result.suggestedProfile).toBe("technical");
      expect(suggestWeightProfile).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Software Engineer" })
      );
    });

    it("throws NOT_FOUND when job not found", async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        mockSupabaseChain({ data: null, error: { message: "not found" } }) as any
      );

      const caller = createCaller(agencyContext());
      await expect(
        caller.getSuggestedProfile({ jobId: MOCK_IDS.job })
      ).rejects.toThrow("Job not found");
    });
  });

  // ============================================
  // configureJob
  // ============================================
  describe("configureJob", () => {
    it("saves matching configuration", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency() as any);
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        mockSupabaseChain({ data: null, error: null }) as any
      );

      const caller = createCaller(agencyContext());
      const result = await caller.configureJob({
        jobId: MOCK_IDS.job,
        weightProfile: "technical",
        enableLLMReranking: true,
      });

      expect(result).toEqual({ success: true });
    });

    it("throws NOT_FOUND when agency not found", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(null as any);

      const caller = createCaller(agencyContext());
      await expect(
        caller.configureJob({ jobId: MOCK_IDS.job, weightProfile: "balanced" })
      ).rejects.toThrow("Agency not found");
    });

    it("throws INTERNAL_SERVER_ERROR on save failure", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency() as any);
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        mockSupabaseChain({ data: null, error: { message: "db error" } }) as any
      );

      const caller = createCaller(agencyContext());
      await expect(
        caller.configureJob({ jobId: MOCK_IDS.job, weightProfile: "balanced" })
      ).rejects.toThrow("Failed to save configuration");
    });
  });

  // ============================================
  // getJobConfig
  // ============================================
  describe("getJobConfig", () => {
    it("returns saved config", async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        mockSupabaseChain({
          data: {
            weight_profile: "technical",
            custom_weights: null,
            enable_llm_reranking: true,
            llm_rerank_threshold: 70,
            llm_rerank_limit: 30,
            vector_recall_limit: 300,
            vector_threshold: 0.3,
          },
          error: null,
        }) as any
      );

      const caller = createCaller(agencyContext());
      const result = await caller.getJobConfig({ jobId: MOCK_IDS.job });

      expect(result.weightProfile).toBe("technical");
      expect(result.enableLLMReranking).toBe(true);
    });

    it("returns defaults when no config exists", async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue(
        mockSupabaseChain({ data: null, error: { message: "not found" } }) as any
      );

      const caller = createCaller(agencyContext());
      const result = await caller.getJobConfig({ jobId: MOCK_IDS.job });

      expect(result.weightProfile).toBe("balanced");
      expect(result.enableLLMReranking).toBe(true);
      expect(result.vectorRecallLimit).toBe(500);
    });
  });

  // ============================================
  // getAnalytics (admin only)
  // ============================================
  describe("getAnalytics", () => {
    it("returns analytics with data", async () => {
      const mockData = [
        {
          composite_score: 80,
          llm_refined_score: 75,
          llm_recommendation: "recommended",
          algorithm_version: "v3.0",
          created_at: "2026-03-01T00:00:00Z",
        },
        {
          composite_score: 60,
          llm_refined_score: 55,
          llm_recommendation: "not_recommended",
          algorithm_version: "v3.0",
          created_at: "2026-03-02T00:00:00Z",
        },
      ];

      const chain = mockSupabaseChain({ data: mockData, error: null });
      // limit needs to resolve with the data
      chain.limit = vi.fn().mockResolvedValue({ data: mockData, error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue(chain as any);

      const caller = createCaller(adminContext());
      const result = await caller.getAnalytics({});

      expect(result.totalMatches).toBe(2);
      expect(result.averageCompositeScore).toBe(70);
      expect(result.recommendationDistribution).toEqual({
        recommended: 1,
        not_recommended: 1,
      });
    });

    it("returns empty stats when no data", async () => {
      const chain = mockSupabaseChain({ data: null, error: { message: "empty" } });
      chain.limit = vi.fn().mockResolvedValue({ data: null, error: { message: "empty" } });
      vi.mocked(supabaseAdmin.from).mockReturnValue(chain as any);

      const caller = createCaller(adminContext());
      const result = await caller.getAnalytics({});

      expect(result.totalMatches).toBe(0);
      expect(result.averageCompositeScore).toBe(0);
    });

    it("rejects agency users (admin only)", async () => {
      const caller = createCaller(agencyContext());
      await expect(caller.getAnalytics({})).rejects.toThrow(
        "Admin access required"
      );
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.getAnalytics({})).rejects.toThrow(
        "Admin access required"
      );
    });

    it("filters by jobId when provided", async () => {
      const chain = mockSupabaseChain({ data: [], error: null });
      chain.limit = vi.fn().mockResolvedValue({ data: [], error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue(chain as any);

      const caller = createCaller(adminContext());
      await caller.getAnalytics({ jobId: MOCK_IDS.job });

      expect(chain.eq).toHaveBeenCalledWith("job_id", MOCK_IDS.job);
    });
  });
});
