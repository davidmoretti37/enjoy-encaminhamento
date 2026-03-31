import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all external dependencies before importing routers
vi.mock("../../supabase", () => ({
  supabase: { auth: { getUser: vi.fn() }, from: vi.fn() },
  supabaseAdmin: {
    from: vi.fn(),
    auth: { admin: { updateUserById: vi.fn() } },
  },
}));

vi.mock("../../db", () => ({
  getUserById: vi.fn(),
  createUserProfile: vi.fn(),
  getCompanyByUserId: vi.fn(),
  getCandidateByUserId: vi.fn(),
  getCandidateById: vi.fn(),
  createCandidate: vi.fn(),
  updateCandidate: vi.fn(),
  getJobById: vi.fn(),
  getJobsByCompanyId: vi.fn(),
  getAllOpenJobs: vi.fn(),
  getAllJobs: vi.fn(),
  createJob: vi.fn(),
  updateJob: vi.fn(),
  getApplicationById: vi.fn(),
  getApplicationsByJobId: vi.fn(),
  getApplicationsByCandidateId: vi.fn(),
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
  getAgencyById: vi.fn(),
  getAgencyByUserId: vi.fn(),
  getAgencyForUserContext: vi.fn(),
  searchJobs: vi.fn(),
  updateJobStatus: vi.fn(),
}));

vi.mock("../../_core/cookies", () => ({
  getSessionCookieOptions: vi.fn().mockReturnValue({ path: "/", httpOnly: true }),
}));

vi.mock("../../services/ai/summarizer", () => ({
  generateJobSummary: vi.fn().mockResolvedValue(null),
  generateCandidateSummary: vi.fn().mockResolvedValue(null),
  generateCompanySummary: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../services/matching", () => ({
  generateJobEmbedding: vi.fn(),
  generateCandidateEmbedding: vi.fn(),
  findMatchingCandidates: vi.fn(),
  findMatchingJobs: vi.fn(),
}));

vi.mock("../../storage", () => ({
  storagePut: vi.fn(),
}));

vi.mock("../../services/ai/receiptVerifier", () => ({
  verifyReceiptWithAI: vi.fn(),
}));

import * as db from "../../db";
import { supabaseAdmin } from "../../supabase";
import {
  candidateContext,
  companyContext,
} from "../helpers/mock-context";
import { MOCK_IDS, mockCandidate, mockCompany } from "../helpers/mock-data";

describe("onboarding flow: candidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("step 1: createProfile → creates user profile for new candidate", async () => {
    const { authRouter } = await import("../../routers/auth");

    vi.mocked(db.getUserById).mockResolvedValue(undefined as any);
    vi.mocked(db.createUserProfile).mockResolvedValue({ error: null } as any);

    // Mock: no company invitation
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

    const caller = authRouter.createCaller(candidateContext());
    const result = await caller.createProfile({ name: "Maria Silva" });

    expect(result).toEqual({ success: true, existing: false });
    expect(db.createUserProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        id: MOCK_IDS.user.candidate,
        role: "candidate",
        name: "Maria Silva",
      })
    );
  });

  it("step 2: submitOnboarding → creates/updates candidate profile", async () => {
    const { candidateRouter } = await import("../../routers/candidate");

    vi.mocked(db.getCandidateByUserId).mockResolvedValue(undefined as any);
    vi.mocked(db.createCandidate).mockResolvedValue("new-cand-id");
    vi.mocked(db.getUserById).mockResolvedValue({
      id: MOCK_IDS.user.candidate,
      agency_id: MOCK_IDS.agency,
    } as any);

    const caller = candidateRouter.createCaller(candidateContext());
    const result = await caller.submitOnboarding({
      full_name: "Maria Silva",
      cpf: "12345678901",
      email: "maria@test.com",
      phone: "11999999999",
      city: "Ipatinga",
      state: "MG",
      education_level: "superior",
      skills: ["Excel", "Word"],
    });

    expect(result.success).toBe(true);
    // Should have called createCandidate since no existing candidate
    expect(db.createCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: MOCK_IDS.user.candidate,
        full_name: "Maria Silva",
        cpf: "12345678901",
        email: "maria@test.com",
      })
    );
  });

  it("step 3: checkOnboarding → returns completed=true after onboarding", async () => {
    const { candidateRouter } = await import("../../routers/candidate");

    const completedCandidate = mockCandidate({
      full_name: "Maria Silva",
      cpf: "12345678901",
      email: "maria@test.com",
      phone: "11999999999",
      city: "Ipatinga",
      state: "MG",
      education_level: "superior",
      skills: ["Excel", "Word"],
    });
    vi.mocked(db.getCandidateByUserId).mockResolvedValue(completedCandidate as any);

    const caller = candidateRouter.createCaller(candidateContext());
    const result = await caller.checkOnboarding();

    expect(result.completed).toBe(true);
    expect(result.candidate).toBeDefined();
  });

  it("checkOnboarding → returns completed=false when profile is incomplete", async () => {
    const { candidateRouter } = await import("../../routers/candidate");

    // Missing required fields (no phone, no city, etc.)
    vi.mocked(db.getCandidateByUserId).mockResolvedValue({
      id: "cand-1",
      full_name: "Maria",
      cpf: null,
      email: null,
      phone: null,
      city: null,
      state: null,
      education_level: null,
      skills: null,
    } as any);

    const caller = candidateRouter.createCaller(candidateContext());
    const result = await caller.checkOnboarding();

    expect(result.completed).toBe(false);
  });
});

describe("onboarding flow: company", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("step 1: createProfile → creates user profile for company via invitation", async () => {
    const { authRouter } = await import("../../routers/auth");

    vi.mocked(db.getUserById).mockResolvedValue(undefined as any);
    vi.mocked(db.createUserProfile).mockResolvedValue({ error: null } as any);

    // Mock: company invitation exists
    const companyInvChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: "inv-1",
          email: "company@test.com",
          status: "pending",
          companies: { id: "comp-1", agency_id: MOCK_IDS.agency },
        },
        error: null,
      }),
    };
    vi.mocked(supabaseAdmin.from).mockReturnValue(companyInvChain as any);

    const caller = authRouter.createCaller(
      companyContext({ email: "company@test.com" })
    );
    const result = await caller.createProfile({ name: "Empresa XYZ" });

    expect(result).toEqual({ success: true, existing: false });
    expect(db.createUserProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "company",
        agency_id: MOCK_IDS.agency,
      })
    );
  });

  it("step 2: checkOnboarding → returns completed=false for new company", async () => {
    const { companyRouter } = await import("../../routers/company");

    vi.mocked(db.getCompanyByUserId).mockResolvedValue(undefined as any);

    const caller = companyRouter.createCaller(companyContext());
    const result = await caller.checkOnboarding();

    expect(result.completed).toBe(false);
  });

  it("step 2b: checkOnboarding → returns completed=true for fully onboarded company", async () => {
    const { companyRouter } = await import("../../routers/company");

    vi.mocked(db.getCompanyByUserId).mockResolvedValue(
      mockCompany({ onboarding_completed: true }) as any
    );

    const caller = companyRouter.createCaller(companyContext());
    const result = await caller.checkOnboarding();

    expect(result.completed).toBe(true);
  });

  it("non-company users skip company onboarding check", async () => {
    const { companyRouter } = await import("../../routers/company");

    const caller = companyRouter.createCaller(candidateContext());
    const result = await caller.checkOnboarding();

    // Non-company users are considered "completed" (they don't need company onboarding)
    expect(result.completed).toBe(true);
  });
});
