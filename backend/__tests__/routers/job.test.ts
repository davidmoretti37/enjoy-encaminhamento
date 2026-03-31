import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock external dependencies
vi.mock("../../supabase", () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };
  return {
    supabaseAdmin: { from: vi.fn(() => mockChain) },
    withRetry: vi.fn((fn: any) => fn()),
  };
});

vi.mock("../../db", () => ({
  getCompanyByUserId: vi.fn(),
  getJobById: vi.fn(),
  createJob: vi.fn(),
  updateJob: vi.fn(),
  getAgencyForUserContext: vi.fn(),
}));

vi.mock("../../services/ai/summarizer", () => ({
  generateJobSummary: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../services/matching", () => ({
  generateJobEmbedding: vi.fn().mockResolvedValue(null),
  findMatchingCandidates: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../services/matching/index", () => ({
  runMatchingPipeline: vi.fn().mockResolvedValue({ results: [], weightProfile: "balanced" }),
  saveMatchResults: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../services/matching/progress", () => ({
  getProgress: vi.fn().mockReturnValue(null),
  failProgress: vi.fn(),
}));

import { jobRouter } from "../../routers/job";
import * as db from "../../db";
import { supabaseAdmin } from "../../supabase";
import {
  companyContext,
  adminContext,
  agencyContext,
  candidateContext,
} from "../helpers/mock-context";
import { mockCompany, mockJob, mockAgency, MOCK_IDS } from "../helpers/mock-data";

const createCaller = (ctx: any) => jobRouter.createCaller(ctx);

describe("job router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    const validInput = {
      title: "Estagiário Admin",
      description: "Vaga para estágio",
      contractType: "estagio" as const,
      workType: "presencial" as const,
    };

    it("creates job successfully for company user", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.createJob).mockResolvedValue(MOCK_IDS.job);

      const caller = createCaller(companyContext());
      const result = await caller.create(validInput);

      expect(result.jobId).toBe(MOCK_IDS.job);
      expect(db.createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: MOCK_IDS.company,
          title: "Estagiário Admin",
        })
      );
    });

    it("throws NOT_FOUND when company profile missing", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(undefined as any);

      const caller = createCaller(companyContext());
      await expect(caller.create(validInput)).rejects.toThrow("Company not found");
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.create(validInput)).rejects.toThrow("Company access required");
    });

    it("validates contract type enum", async () => {
      const caller = createCaller(companyContext());
      await expect(
        caller.create({ ...validInput, contractType: "invalid" as any })
      ).rejects.toThrow();
    });

    it("validates work type enum", async () => {
      const caller = createCaller(companyContext());
      await expect(
        caller.create({ ...validInput, workType: "invalid" as any })
      ).rejects.toThrow();
    });
  });

  describe("createForCompany", () => {
    const validInput = {
      companyId: MOCK_IDS.company,
      title: "Dev Jr",
      description: "Vaga para dev",
      contractType: "clt" as const,
    };

    it("allows admin to create job for any company", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: MOCK_IDS.job, agency_id: MOCK_IDS.agency },
          error: null,
        }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(adminContext());
      const result = await caller.createForCompany(validInput);
      expect(result.jobId).toBe(MOCK_IDS.job);
    });

    it("allows agency to create job", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency() as any);

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: MOCK_IDS.job },
          error: null,
        }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(agencyContext());
      const result = await caller.createForCompany(validInput);
      expect(result.jobId).toBe(MOCK_IDS.job);
    });

    it("rejects company users", async () => {
      const caller = createCaller(companyContext());
      await expect(caller.createForCompany(validInput)).rejects.toThrow("Acesso negado");
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.createForCompany(validInput)).rejects.toThrow("Acesso negado");
    });

    it("throws on DB insert error", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "duplicate key" },
        }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(adminContext());
      await expect(caller.createForCompany(validInput)).rejects.toThrow("duplicate key");
    });
  });

  describe("triggerMatching", () => {
    it("triggers matching for company-owned job with valid status", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ status: "pending_review", company_id: MOCK_IDS.company }) as any
      );

      const caller = createCaller(companyContext());
      const result = await caller.triggerMatching({ jobId: MOCK_IDS.job });
      expect(result.success).toBe(true);
    });

    it("rejects when job status is not pending_review or paused", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ status: "open", company_id: MOCK_IDS.company }) as any
      );

      const caller = createCaller(companyContext());
      await expect(caller.triggerMatching({ jobId: MOCK_IDS.job })).rejects.toThrow(
        "vagas em análise ou pausadas"
      );
    });

    it("rejects when company doesn't own the job", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ company_id: "other-company" }) as any
      );

      const caller = createCaller(companyContext());
      await expect(caller.triggerMatching({ jobId: MOCK_IDS.job })).rejects.toThrow(
        "Acesso negado"
      );
    });

    it("throws NOT_FOUND when job doesn't exist", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getJobById).mockResolvedValue(undefined as any);

      const caller = createCaller(companyContext());
      await expect(caller.triggerMatching({ jobId: MOCK_IDS.job })).rejects.toThrow(
        "Vaga não encontrada"
      );
    });
  });

  describe("triggerMatchingForAgency", () => {
    it("allows admin to trigger matching", async () => {
      const caller = createCaller(adminContext());
      const result = await caller.triggerMatchingForAgency({ jobId: MOCK_IDS.job });
      expect(result.success).toBe(true);
    });

    it("allows agency to trigger matching", async () => {
      const caller = createCaller(agencyContext());
      const result = await caller.triggerMatchingForAgency({ jobId: MOCK_IDS.job });
      expect(result.success).toBe(true);
    });

    it("rejects company users", async () => {
      const caller = createCaller(companyContext());
      await expect(
        caller.triggerMatchingForAgency({ jobId: MOCK_IDS.job })
      ).rejects.toThrow("Acesso negado");
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.triggerMatchingForAgency({ jobId: MOCK_IDS.job })
      ).rejects.toThrow("Acesso negado");
    });
  });

  describe("deleteForCompany", () => {
    it("deletes job and related records for admin", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: MOCK_IDS.job, company_id: MOCK_IDS.company, agency_id: MOCK_IDS.agency },
          error: null,
        }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(adminContext());
      const result = await caller.deleteForCompany({ jobId: MOCK_IDS.job });
      expect(result).toEqual({ success: true });

      // Verify cascading deletes: job_matches, applications, then jobs
      expect(supabaseAdmin.from).toHaveBeenCalledWith("job_matches");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("applications");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("jobs");
    });

    it("throws NOT_FOUND when job doesn't exist", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(adminContext());
      await expect(caller.deleteForCompany({ jobId: MOCK_IDS.job })).rejects.toThrow(
        "Vaga não encontrada"
      );
    });

    it("rejects agency user for job from different agency", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: MOCK_IDS.job, company_id: "c1", agency_id: "other-agency" },
          error: null,
        }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency() as any);

      const caller = createCaller(agencyContext());
      await expect(caller.deleteForCompany({ jobId: MOCK_IDS.job })).rejects.toThrow(
        "não pertence"
      );
    });
  });
});
