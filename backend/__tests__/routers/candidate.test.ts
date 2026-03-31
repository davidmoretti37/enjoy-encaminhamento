import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock external dependencies
vi.mock("../../supabase", () => ({
  supabase: { auth: { getUser: vi.fn() } },
  supabaseAdmin: { from: vi.fn() },
}));

vi.mock("../../db", () => ({
  getUserById: vi.fn(),
  getCandidateByUserId: vi.fn(),
  getCandidateById: vi.fn(),
  createCandidate: vi.fn(),
  updateCandidate: vi.fn(),
  searchCandidates: vi.fn(),
  getAllCandidates: vi.fn(),
  getCandidateApplications: vi.fn(),
  getAgencyById: vi.fn(),
}));

vi.mock("../../services/ai/summarizer", () => ({
  generateCandidateSummary: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../services/matching", () => ({
  generateCandidateEmbedding: vi.fn().mockResolvedValue(null),
  findMatchingJobs: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://s3.example.com/photo.jpg" }),
}));

import { candidateRouter } from "../../routers/candidate";
import * as db from "../../db";
import {
  candidateContext,
  companyContext,
  adminContext,
  agencyContext,
  unauthenticatedContext,
} from "../helpers/mock-context";
import { mockCandidate, mockUser, mockAgency, MOCK_IDS } from "../helpers/mock-data";

const createCaller = (ctx: any) => candidateRouter.createCaller(ctx);

describe("candidate router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkOnboarding", () => {
    it("returns completed:true for non-candidate users", async () => {
      const caller = createCaller(companyContext());
      const result = await caller.checkOnboarding();
      expect(result.completed).toBe(true);
    });

    it("returns completed:false when candidate profile is missing", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(undefined);
      const caller = createCaller(candidateContext());
      const result = await caller.checkOnboarding();
      expect(result.completed).toBe(false);
    });

    it("returns completed:false when required fields are missing", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(
        mockCandidate({ skills: [] }) as any
      );
      const caller = createCaller(candidateContext());
      const result = await caller.checkOnboarding();
      expect(result.completed).toBe(false);
    });

    it("returns completed:true when all required fields are present", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      const caller = createCaller(candidateContext());
      const result = await caller.checkOnboarding();
      expect(result.completed).toBe(true);
    });
  });

  describe("getMyAgency", () => {
    it("returns null when user has no agency", async () => {
      vi.mocked(db.getUserById).mockResolvedValue(mockUser("candidate", { agency_id: null }) as any);
      const caller = createCaller(candidateContext());
      const result = await caller.getMyAgency();
      expect(result).toBeNull();
    });

    it("returns agency when user has one", async () => {
      vi.mocked(db.getUserById).mockResolvedValue(mockUser("candidate") as any);
      vi.mocked(db.getAgencyById).mockResolvedValue(mockAgency() as any);
      const caller = createCaller(candidateContext());
      const result = await caller.getMyAgency();
      expect(result).toEqual(mockAgency());
    });
  });

  describe("submitOnboarding", () => {
    const validInput = {
      full_name: "Maria Silva",
      cpf: "12345678901",
      email: "maria@test.com",
      phone: "11999999999",
      city: "Ipatinga",
      state: "MG",
      education_level: "superior_completo",
      skills: ["Excel", "Word"],
    };

    it("rejects non-candidate users", async () => {
      const caller = createCaller(companyContext());
      await expect(caller.submitOnboarding(validInput)).rejects.toThrow("Only candidates");
    });

    it("creates new candidate when none exists", async () => {
      vi.mocked(db.getUserById).mockResolvedValue(mockUser("candidate") as any);
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(undefined);
      vi.mocked(db.createCandidate).mockResolvedValue(MOCK_IDS.candidate);
      vi.mocked(db.getCandidateById).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.updateCandidate).mockResolvedValue(undefined);

      const caller = createCaller(candidateContext());
      const result = await caller.submitOnboarding(validInput);

      expect(result).toEqual({ success: true });
      expect(db.createCandidate).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "cc000000-0000-4000-8000-000000000002",
          full_name: "Maria Silva",
          agency_id: MOCK_IDS.agency,
        })
      );
    });

    it("updates existing candidate", async () => {
      vi.mocked(db.getUserById).mockResolvedValue(mockUser("candidate") as any);
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.updateCandidate).mockResolvedValue(undefined);

      const caller = createCaller(candidateContext());
      const result = await caller.submitOnboarding(validInput);

      expect(result).toEqual({ success: true });
      expect(db.createCandidate).not.toHaveBeenCalled();
      expect(db.updateCandidate).toHaveBeenCalledWith(
        MOCK_IDS.candidate,
        expect.objectContaining({ education_level: "superior" })
      );
    });

    it("maps education levels correctly", async () => {
      vi.mocked(db.getUserById).mockResolvedValue(mockUser("candidate") as any);
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.updateCandidate).mockResolvedValue(undefined);

      const caller = createCaller(candidateContext());
      await caller.submitOnboarding({ ...validInput, education_level: "medio_completo" });

      expect(db.updateCandidate).toHaveBeenCalledWith(
        MOCK_IDS.candidate,
        expect.objectContaining({ education_level: "medio" })
      );
    });

    it("sanitizes empty date_of_birth", async () => {
      vi.mocked(db.getUserById).mockResolvedValue(mockUser("candidate") as any);
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.updateCandidate).mockResolvedValue(undefined);

      const caller = createCaller(candidateContext());
      await caller.submitOnboarding({ ...validInput, date_of_birth: "" });

      expect(db.updateCandidate).toHaveBeenCalledWith(
        MOCK_IDS.candidate,
        expect.objectContaining({ date_of_birth: undefined })
      );
    });

    it("converts courses array to comma-separated string", async () => {
      vi.mocked(db.getUserById).mockResolvedValue(mockUser("candidate") as any);
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.updateCandidate).mockResolvedValue(undefined);

      const caller = createCaller(candidateContext());
      await caller.submitOnboarding({
        ...validInput,
        courses: ["Administração", "Contabilidade"],
      });

      expect(db.updateCandidate).toHaveBeenCalledWith(
        MOCK_IDS.candidate,
        expect.objectContaining({ course: "Administração, Contabilidade" })
      );
    });
  });

  describe("getProfile", () => {
    it("returns candidate profile", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      const caller = createCaller(candidateContext());
      const result = await caller.getProfile();
      expect(result.full_name).toBe("Maria Silva");
    });

    it("throws NOT_FOUND when no profile", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(undefined);
      const caller = createCaller(candidateContext());
      await expect(caller.getProfile()).rejects.toThrow(TRPCError);
    });

    it("rejects company users", async () => {
      const caller = createCaller(companyContext());
      await expect(caller.getProfile()).rejects.toThrow("Candidate access required");
    });
  });

  describe("updateProfile", () => {
    it("updates candidate successfully", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.updateCandidate).mockResolvedValue(undefined);

      const caller = createCaller(candidateContext());
      const result = await caller.updateProfile({ full_name: "Maria Santos" });
      expect(result).toEqual({ success: true });
      expect(db.updateCandidate).toHaveBeenCalledWith(
        MOCK_IDS.candidate,
        expect.objectContaining({ full_name: "Maria Santos" })
      );
    });

    it("removes empty date_of_birth", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.updateCandidate).mockResolvedValue(undefined);

      const caller = createCaller(candidateContext());
      await caller.updateProfile({ date_of_birth: "" });

      // The router deletes empty date_of_birth before passing to db
      const updateCall = vi.mocked(db.updateCandidate).mock.calls[0][1];
      expect(updateCall).not.toHaveProperty("date_of_birth");
    });

    it("throws NOT_FOUND for missing candidate", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(undefined);
      const caller = createCaller(candidateContext());
      await expect(caller.updateProfile({ full_name: "Test" })).rejects.toThrow(
        "Candidate not found"
      );
    });
  });

  describe("getById", () => {
    // FIXED: getById now uses z.string().uuid() instead of z.number()
    it("accepts UUID string input", async () => {
      vi.mocked(db.getCandidateById).mockResolvedValue(mockCandidate() as any);
      const caller = createCaller(candidateContext());
      const result = await caller.getById({ id: MOCK_IDS.candidate });
      expect(db.getCandidateById).toHaveBeenCalledWith(MOCK_IDS.candidate);
    });

    it("rejects non-UUID input", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.getById({ id: "not-a-uuid" })).rejects.toThrow();
    });
  });

  describe("search", () => {
    it("allows company users to search", async () => {
      vi.mocked(db.searchCandidates).mockResolvedValue([]);
      const caller = createCaller(companyContext());
      const result = await caller.search({ city: "Ipatinga" });
      expect(result).toEqual([]);
    });

    it("allows admin users to search", async () => {
      vi.mocked(db.searchCandidates).mockResolvedValue([]);
      const caller = createCaller(adminContext());
      const result = await caller.search({});
      expect(result).toEqual([]);
    });

    it("rejects candidate users from searching", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.search({})).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("uploadPhoto", () => {
    it("rejects invalid mime types", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      const caller = createCaller(candidateContext());
      await expect(
        caller.uploadPhoto({ base64: "dGVzdA==", mimeType: "image/gif" })
      ).rejects.toThrow("Tipo de arquivo não permitido");
    });

    it("rejects files over 5MB", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      // Create a base64 string that decodes to >5MB
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
      const caller = createCaller(candidateContext());
      await expect(
        caller.uploadPhoto({
          base64: largeBuffer.toString("base64"),
          mimeType: "image/jpeg",
        })
      ).rejects.toThrow("Arquivo muito grande");
    });
  });

  describe("getAll (admin)", () => {
    it("returns all candidates for admin", async () => {
      vi.mocked(db.getAllCandidates).mockResolvedValue([mockCandidate() as any]);
      const caller = createCaller(adminContext());
      const result = await caller.getAll();
      expect(result).toHaveLength(1);
    });

    it("rejects non-admin users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.getAll()).rejects.toThrow();
    });
  });
});
