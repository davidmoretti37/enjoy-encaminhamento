import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock external dependencies
vi.mock("../../supabase", () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    supabaseAdmin: { from: vi.fn(() => mockChain) },
  };
});

vi.mock("../../db", () => ({
  getCompanyByUserId: vi.fn(),
  getApplicationById: vi.fn(),
  getJobById: vi.fn(),
  getCandidateById: vi.fn(),
  updateCandidate: vi.fn(),
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
  createPayment: vi.fn(),
  createNotification: vi.fn(),
  updateBatch: vi.fn(),
}));

vi.mock("../../db/hiring", () => ({
  countActiveEstagioContracts: vi.fn(),
  calculateEstagioFee: vi.fn(),
  calculateCLTFee: vi.fn(),
  getHiringProcessByApplication: vi.fn(),
  createHiringProcess: vi.fn(),
  getHiringProcessById: vi.fn(),
  createCLTFollowUp: vi.fn(),
}));

vi.mock("../../routers/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../_core/env", () => ({
  ENV: { appUrl: "http://localhost:5001" },
}));

vi.mock("date-fns", () => ({
  format: vi.fn().mockReturnValue("01/01/2026"),
}));

vi.mock("date-fns/locale", () => ({
  ptBR: {},
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

import { hiringRouter } from "../../routers/hiring";
import * as db from "../../db";
import * as hiringDb from "../../db/hiring";
import {
  companyContext,
  candidateContext,
  adminContext,
  agencyContext,
} from "../helpers/mock-context";
import {
  mockCompany,
  mockCandidate,
  mockJob,
  mockApplication,
  MOCK_IDS,
} from "../helpers/mock-data";

const createCaller = (ctx: any) => hiringRouter.createCaller(ctx);

describe("hiring router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getHiringPreview", () => {
    it("returns preview with estágio fee calculation", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getApplicationById).mockResolvedValue(mockApplication() as any);
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ contract_type: "estagio", company_id: MOCK_IDS.company }) as any
      );
      vi.mocked(db.getCandidateById).mockResolvedValue(mockCandidate() as any);
      vi.mocked(hiringDb.countActiveEstagioContracts).mockResolvedValue(0);
      vi.mocked(hiringDb.calculateEstagioFee).mockReturnValue(5000); // R$ 50.00

      const caller = createCaller(companyContext());
      const result = await caller.getHiringPreview({
        applicationId: MOCK_IDS.application,
      });

      expect(result.hiringType).toBe("estagio");
      expect(result.isFirstIntern).toBe(true);
      expect(result.calculatedFee).toBe(5000);
      expect(result.needsParentInfo).toBe(true); // candidate has no parent email
      expect(result.requiresMultipleSignatures).toBe(true);
    });

    it("returns preview with CLT fee (50% of salary)", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getApplicationById).mockResolvedValue(mockApplication() as any);
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ contract_type: "clt", salary: 200000, company_id: MOCK_IDS.company }) as any
      );
      vi.mocked(db.getCandidateById).mockResolvedValue(mockCandidate() as any);
      vi.mocked(hiringDb.calculateCLTFee).mockReturnValue(100000);

      const caller = createCaller(companyContext());
      const result = await caller.getHiringPreview({
        applicationId: MOCK_IDS.application,
      });

      expect(result.hiringType).toBe("clt");
      expect(result.calculatedFee).toBe(100000);
      expect(hiringDb.calculateCLTFee).toHaveBeenCalledWith(200000);
    });

    it("throws NOT_FOUND when company is missing", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(undefined as any);

      const caller = createCaller(companyContext());
      await expect(
        caller.getHiringPreview({ applicationId: MOCK_IDS.application })
      ).rejects.toThrow("Company not found");
    });

    it("throws NOT_FOUND when application doesn't exist", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getApplicationById).mockResolvedValue(undefined as any);

      const caller = createCaller(companyContext());
      await expect(
        caller.getHiringPreview({ applicationId: MOCK_IDS.application })
      ).rejects.toThrow("Application not found");
    });

    it("throws FORBIDDEN when company doesn't own the job", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getApplicationById).mockResolvedValue(mockApplication() as any);
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ company_id: "other-company" }) as any
      );

      const caller = createCaller(companyContext());
      await expect(
        caller.getHiringPreview({ applicationId: MOCK_IDS.application })
      ).rejects.toThrow("Not authorized");
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.getHiringPreview({ applicationId: MOCK_IDS.application })
      ).rejects.toThrow("Company access required");
    });
  });

  describe("initiateHiring", () => {
    const validInput = {
      applicationId: MOCK_IDS.application,
      startDate: "2026-04-01",
    };

    it("creates estágio hiring process with awaiting_configuration status", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getApplicationById).mockResolvedValue(mockApplication() as any);
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ contract_type: "estagio", company_id: MOCK_IDS.company }) as any
      );
      vi.mocked(db.getCandidateById).mockResolvedValue(mockCandidate() as any);
      vi.mocked(hiringDb.countActiveEstagioContracts).mockResolvedValue(0);
      vi.mocked(hiringDb.calculateEstagioFee).mockReturnValue(5000);
      vi.mocked(hiringDb.getHiringProcessByApplication).mockResolvedValue(null as any);
      vi.mocked(hiringDb.createHiringProcess).mockResolvedValue({
        id: "hp-1",
        status: "awaiting_configuration",
      } as any);
      vi.mocked(db.updateApplication).mockResolvedValue(undefined);

      const caller = createCaller(companyContext());
      const result = await caller.initiateHiring(validInput);

      expect(result.success).toBe(true);
      expect(result.hiringType).toBe("estagio");
      expect(result.status).toBe("awaiting_configuration");
      expect(hiringDb.createHiringProcess).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "awaiting_configuration",
          isFirstIntern: true,
        })
      );
    });

    it("creates CLT hiring process with immediate payment", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getApplicationById).mockResolvedValue(mockApplication() as any);
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ contract_type: "clt", salary: 200000, company_id: MOCK_IDS.company }) as any
      );
      vi.mocked(db.getCandidateById).mockResolvedValue(mockCandidate() as any);
      vi.mocked(hiringDb.calculateCLTFee).mockReturnValue(100000);
      vi.mocked(hiringDb.getHiringProcessByApplication).mockResolvedValue(null as any);
      vi.mocked(hiringDb.createHiringProcess).mockResolvedValue({
        id: "hp-2",
        status: "pending_signatures",
      } as any);
      vi.mocked(hiringDb.createCLTFollowUp).mockResolvedValue(undefined as any);
      vi.mocked(db.updateApplication).mockResolvedValue(undefined);
      vi.mocked(db.createPayment).mockResolvedValue(undefined as any);

      const caller = createCaller(companyContext());
      const result = await caller.initiateHiring(validInput);

      expect(result.success).toBe(true);
      expect(result.hiringType).toBe("clt");
      expect(db.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100000,
          payment_type: "setup-fee",
        })
      );
      expect(hiringDb.createCLTFollowUp).toHaveBeenCalled();
    });

    it("prevents duplicate hiring processes", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getApplicationById).mockResolvedValue(mockApplication() as any);
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ company_id: MOCK_IDS.company }) as any
      );
      vi.mocked(db.getCandidateById).mockResolvedValue(mockCandidate() as any);
      vi.mocked(hiringDb.getHiringProcessByApplication).mockResolvedValue({
        id: "existing-hp",
      } as any);

      const caller = createCaller(companyContext());
      await expect(caller.initiateHiring(validInput)).rejects.toThrow(
        "Já existe um processo"
      );
    });

    it("saves parent info to candidate when provided", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getApplicationById).mockResolvedValue(mockApplication() as any);
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ contract_type: "estagio", company_id: MOCK_IDS.company }) as any
      );
      vi.mocked(db.getCandidateById).mockResolvedValue(mockCandidate() as any);
      vi.mocked(hiringDb.countActiveEstagioContracts).mockResolvedValue(0);
      vi.mocked(hiringDb.calculateEstagioFee).mockReturnValue(5000);
      vi.mocked(hiringDb.getHiringProcessByApplication).mockResolvedValue(null as any);
      vi.mocked(hiringDb.createHiringProcess).mockResolvedValue({
        id: "hp-3",
        status: "awaiting_configuration",
      } as any);
      vi.mocked(db.updateCandidate).mockResolvedValue(undefined);
      vi.mocked(db.updateApplication).mockResolvedValue(undefined);

      const caller = createCaller(companyContext());
      await caller.initiateHiring({
        ...validInput,
        parentInfo: {
          name: "João Silva",
          email: "joao@test.com",
          cpf: "98765432100",
        },
      });

      expect(db.updateCandidate).toHaveBeenCalledWith(
        MOCK_IDS.candidate,
        expect.objectContaining({
          parent_guardian_name: "João Silva",
          parent_guardian_email: "joao@test.com",
          parent_guardian_cpf: "98765432100",
        })
      );
    });

    it("requires applicationId or candidateId+jobId", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);

      const caller = createCaller(companyContext());
      await expect(
        caller.initiateHiring({ startDate: "2026-04-01" })
      ).rejects.toThrow("Forneça applicationId ou candidateId + jobId");
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.initiateHiring(validInput)).rejects.toThrow(
        "Company access required"
      );
    });

    // FIXED: start date is now validated to not be in the past
    it("rejects past start dates", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getApplicationById).mockResolvedValue(mockApplication() as any);
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ contract_type: "clt", company_id: MOCK_IDS.company }) as any
      );
      vi.mocked(db.getCandidateById).mockResolvedValue(mockCandidate() as any);
      vi.mocked(hiringDb.getHiringProcessByApplication).mockResolvedValue(null as any);

      const caller = createCaller(companyContext());
      await expect(
        caller.initiateHiring({
          applicationId: MOCK_IDS.application,
          startDate: "2020-01-01",
        })
      ).rejects.toThrow("data de início não pode ser no passado");
    });
  });
});
