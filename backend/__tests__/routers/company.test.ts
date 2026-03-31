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
    supabaseAdmin: { from: vi.fn(() => mockChain), rpc: vi.fn() },
  };
});

vi.mock("../../db", () => ({
  getCompanyByUserId: vi.fn(),
  getUserById: vi.fn(),
  getAgencyById: vi.fn(),
  getDashboardStats: vi.fn(),
}));

vi.mock("../../services/ai/summarizer", () => ({
  generateCompanySummary: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://s3.example.com/file.pdf" }),
}));

vi.mock("../../services/ai/receiptVerifier", () => ({
  verifyReceiptWithAI: vi.fn().mockResolvedValue({ isValid: true }),
}));

import { companyRouter } from "../../routers/company";
import * as db from "../../db";
import { supabaseAdmin } from "../../supabase";
import {
  companyContext,
  candidateContext,
  adminContext,
  unauthenticatedContext,
} from "../helpers/mock-context";
import { mockCompany, mockUser, mockAgency, MOCK_IDS } from "../helpers/mock-data";

const createCaller = (ctx: any) => companyRouter.createCaller(ctx);

describe("company router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkOnboarding", () => {
    it("returns completed:true for non-company users", async () => {
      const caller = createCaller(candidateContext());
      const result = await caller.checkOnboarding();
      expect(result.completed).toBe(true);
      expect(result.pendingContractSigning).toBe(false);
    });

    it("returns completed:false when company has no profile", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(undefined as any);

      const caller = createCaller(companyContext());
      const result = await caller.checkOnboarding();
      expect(result.completed).toBe(false);
    });

    it("returns completed:true when onboarding_completed is set", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(
        mockCompany({ onboarding_completed: true }) as any
      );

      const caller = createCaller(companyContext());
      const result = await caller.checkOnboarding();
      expect(result.completed).toBe(true);
    });

    it("returns completed:true when cnpj and company_name exist", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(
        mockCompany({ onboarding_completed: false, cnpj: "123", company_name: "Test" }) as any
      );

      const caller = createCaller(companyContext());
      const result = await caller.checkOnboarding();
      expect(result.completed).toBe(true);
    });

    it("returns pendingContractSigning when set", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(
        mockCompany({ pending_contract_signing: true }) as any
      );

      const caller = createCaller(companyContext());
      const result = await caller.checkOnboarding();
      expect(result.pendingContractSigning).toBe(true);
    });
  });

  describe("getAgencyContract", () => {
    it("returns null for non-company users", async () => {
      const caller = createCaller(candidateContext());
      const result = await caller.getAgencyContract();
      expect(result).toBeNull();
    });

    it("returns null when user has no agency", async () => {
      vi.mocked(db.getUserById).mockResolvedValue(
        mockUser("company", { agency_id: null }) as any
      );

      const caller = createCaller(companyContext({ agency_id: null }));
      const result = await caller.getAgencyContract();
      expect(result).toBeNull();
    });

    it("returns agency contract data", async () => {
      vi.mocked(db.getUserById).mockResolvedValue(mockUser("company") as any);
      vi.mocked(db.getAgencyById).mockResolvedValue(
        mockAgency({
          contract_type: "standard",
          contract_pdf_url: "https://example.com/contract.pdf",
          contract_html: "<h1>Contract</h1>",
        }) as any
      );

      const caller = createCaller(companyContext());
      const result = await caller.getAgencyContract();

      expect(result).toEqual({
        agency_name: "ANEC Ipatinga",
        contract_type: "standard",
        contract_pdf_url: "https://example.com/contract.pdf",
        contract_html: "<h1>Contract</h1>",
      });
    });
  });

  describe("markContractSigningComplete", () => {
    it("marks contract as signed", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(companyContext());
      const result = await caller.markContractSigningComplete();
      expect(result).toEqual({ success: true });
    });

    it("throws NOT_FOUND when company doesn't exist", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(undefined as any);

      const caller = createCaller(companyContext());
      await expect(caller.markContractSigningComplete()).rejects.toThrow(
        "Company not found"
      );
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.markContractSigningComplete()).rejects.toThrow(
        "Company access required"
      );
    });
  });

  describe("submitOnboarding", () => {
    const validInput = {
      cnpj: "12345678000199",
      legalName: "Tech Solutions Ltda",
      jobTitle: "Estagiário",
      compensation: "R$ 800,00",
      mainActivities: "Atividades administrativas",
      requiredSkills: "Excel, Word",
      workSchedule: "08:00 - 14:00",
      contractSignature: "data:image/png;base64,iVBORw0KGgo=",
    };

    it("validates required fields", async () => {
      const caller = createCaller(companyContext());
      await expect(
        caller.submitOnboarding({ ...validInput, cnpj: "" })
      ).rejects.toThrow();
    });

    it("validates CNPJ minimum length", async () => {
      const caller = createCaller(companyContext());
      await expect(
        caller.submitOnboarding({ ...validInput, cnpj: "123" })
      ).rejects.toThrow();
    });
  });
});
