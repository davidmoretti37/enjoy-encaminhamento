import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock all external dependencies before importing routers
vi.mock("../../supabase", () => ({
  supabase: { auth: { getUser: vi.fn() }, from: vi.fn() },
  supabaseAdmin: {
    from: vi.fn(),
    auth: { admin: { updateUserById: vi.fn() } },
  },
  withRetry: vi.fn((fn: any) => fn()),
}));

vi.mock("../../db", () => ({
  getUserById: vi.fn(),
  createUserProfile: vi.fn(),
  getCompanyByUserId: vi.fn(),
  getJobById: vi.fn(),
  getJobsByCompanyId: vi.fn(),
  getAllOpenJobs: vi.fn(),
  getAllJobs: vi.fn(),
  createJob: vi.fn(),
  updateJob: vi.fn(),
  updateJobStatus: vi.fn(),
  searchJobs: vi.fn(),
  getCandidateByUserId: vi.fn(),
  getCandidateById: vi.fn(),
  createCandidate: vi.fn(),
  updateCandidate: vi.fn(),
  getApplicationById: vi.fn(),
  getApplicationsByJobId: vi.fn(),
  getApplicationsByCandidateId: vi.fn(),
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
  getAgencyByUserId: vi.fn(),
  getAgencyById: vi.fn(),
  getAgencyForUserContext: vi.fn(),
}));

vi.mock("../../db/hiring", () => ({
  countActiveEstagioContracts: vi.fn(),
  calculateEstagioFee: vi.fn(),
  calculateCLTFee: vi.fn(),
  createHiringProcess: vi.fn(),
  getHiringProcessByApplication: vi.fn(),
}));

vi.mock("../../services/ai/summarizer", () => ({
  generateJobSummary: vi.fn().mockResolvedValue(null),
  generateCompanySummary: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../services/matching", () => ({
  generateJobEmbedding: vi.fn(),
  findMatchingCandidates: vi.fn(),
}));

vi.mock("../../services/matching/progress", () => ({
  getProgress: vi.fn(),
  failProgress: vi.fn(),
}));

vi.mock("../../_core/cookies", () => ({
  getSessionCookieOptions: vi.fn().mockReturnValue({ path: "/", httpOnly: true }),
}));

vi.mock("../../integrations/autentique", () => ({
  createDocument: vi.fn(),
  isAutentiqueConfigured: vi.fn().mockReturnValue(false),
}));

vi.mock("../../lib/fillDocxTemplate", () => ({
  fillDocxTemplate: vi.fn(),
  buildHiringTemplateData: vi.fn(),
  scanPlaceholders: vi.fn(),
  PLACEHOLDER_LABELS: {},
}));

vi.mock("../../routers/email", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("../../_core/env", () => ({
  ENV: { APP_URL: "http://localhost:3000" },
}));

vi.mock("../../storage", () => ({
  storagePut: vi.fn(),
}));

vi.mock("../../services/ai/receiptVerifier", () => ({
  verifyReceiptWithAI: vi.fn(),
}));

vi.mock("../../db/batches", () => ({
  getBatchesByCandidateId: vi.fn().mockResolvedValue([]),
}));

import * as db from "../../db";
import * as hiringDb from "../../db/hiring";
import { supabaseAdmin } from "../../supabase";
import {
  companyContext,
  candidateContext,
} from "../helpers/mock-context";
import { MOCK_IDS, mockJob, mockCandidate, mockApplication, mockCompany } from "../helpers/mock-data";

describe("hiring flow: company creates job → candidate applies → company initiates hiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("step 1: company creates a job via jobRouter.create", async () => {
    const { jobRouter } = await import("../../routers/job");

    vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
    vi.mocked(db.createJob).mockResolvedValue("new-job-id");

    const caller = jobRouter.createCaller(companyContext());
    const result = await caller.create({
      title: "Estagiário Dev",
      description: "Vaga de estágio em desenvolvimento",
      contractType: "estagio",
      workType: "presencial",
      location: "Ipatinga, MG",
      openings: 1,
    });

    expect(result).toEqual({ jobId: "new-job-id" });
    expect(db.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: MOCK_IDS.company,
        title: "Estagiário Dev",
      })
    );
  });

  it("step 2: candidate applies to a job via applicationRouter.create", async () => {
    const { applicationRouter } = await import("../../routers/application");

    vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
    vi.mocked(db.getJobById).mockResolvedValue(mockJob() as any);
    vi.mocked(db.getApplicationsByCandidateId).mockResolvedValue([]);
    vi.mocked(db.createApplication).mockResolvedValue("app-1");

    const caller = applicationRouter.createCaller(candidateContext());
    const result = await caller.create({
      job_id: MOCK_IDS.job,
    });

    expect(result).toEqual({ applicationId: "app-1" });
    expect(db.createApplication).toHaveBeenCalledWith({
      job_id: MOCK_IDS.job,
      candidate_id: MOCK_IDS.candidate,
    });
  });

  it("step 2b: candidate cannot apply twice to the same job", async () => {
    const { applicationRouter } = await import("../../routers/application");

    vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
    vi.mocked(db.getJobById).mockResolvedValue(mockJob() as any);
    vi.mocked(db.getApplicationsByCandidateId).mockResolvedValue([
      mockApplication({ job_id: MOCK_IDS.job }) as any,
    ]);

    const caller = applicationRouter.createCaller(candidateContext());
    await expect(caller.create({ job_id: MOCK_IDS.job })).rejects.toThrow(TRPCError);
  });

  it("step 3: company gets hiring preview via hiringRouter.getHiringPreview", async () => {
    const { hiringRouter } = await import("../../routers/hiring");

    const company = mockCompany();
    const job = mockJob({ contract_type: "estagio" });
    const candidate = mockCandidate();
    const application = mockApplication();

    vi.mocked(db.getCompanyByUserId).mockResolvedValue(company as any);
    vi.mocked(db.getApplicationById).mockResolvedValue(application as any);
    vi.mocked(db.getJobById).mockResolvedValue(job as any);
    vi.mocked(db.getCandidateById).mockResolvedValue(candidate as any);
    vi.mocked(hiringDb.countActiveEstagioContracts).mockResolvedValue(0);
    vi.mocked(hiringDb.calculateEstagioFee).mockReturnValue(15000); // R$ 150.00

    const caller = hiringRouter.createCaller(companyContext());
    const result = await caller.getHiringPreview({
      applicationId: MOCK_IDS.application,
    });

    expect(result.hiringType).toBe("estagio");
    expect(result.isFirstIntern).toBe(true);
    expect(result.calculatedFee).toBe(15000);
    expect(result.candidate.fullName).toBe("Maria Silva");
    expect(result.job.title).toBe("Estagiário Administrativo");
  });

  it("full flow: state transitions are consistent across steps", async () => {
    const { jobRouter } = await import("../../routers/job");
    const { applicationRouter } = await import("../../routers/application");

    // Step 1: company creates job
    vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
    const flowJobId = "e1111111-0000-4000-8000-000000000001";
    vi.mocked(db.createJob).mockResolvedValue(flowJobId);

    const jobCaller = jobRouter.createCaller(companyContext());
    const jobResult = await jobCaller.create({
      title: "Full Flow Job",
      description: "Testing full flow",
      contractType: "clt",
      workType: "remoto",
      openings: 1,
    });
    expect(jobResult.jobId).toBe(flowJobId);

    // Step 2: candidate applies
    vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
    vi.mocked(db.getJobById).mockResolvedValue(
      mockJob({ id: flowJobId, status: "open" }) as any
    );
    vi.mocked(db.getApplicationsByCandidateId).mockResolvedValue([]);
    vi.mocked(db.createApplication).mockResolvedValue("f1111111-0000-4000-8000-000000000001");

    const appCaller = applicationRouter.createCaller(candidateContext());
    const appResult = await appCaller.create({ job_id: flowJobId });
    expect(appResult.applicationId).toBe("f1111111-0000-4000-8000-000000000001");

    // Verify the application was created with the correct job and candidate
    expect(db.createApplication).toHaveBeenCalledWith({
      job_id: flowJobId,
      candidate_id: MOCK_IDS.candidate,
    });
  });
});
