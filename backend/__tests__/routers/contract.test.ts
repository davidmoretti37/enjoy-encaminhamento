import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock all external dependencies before importing router
vi.mock("../../supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}));

vi.mock("../../db", () => ({
  getCompanyByUserId: vi.fn(),
  getCompanyByEmail: vi.fn(),
  getCompanyById: vi.fn(),
  getCandidateByUserId: vi.fn(),
  getAgencyByUserId: vi.fn(),
  getContractsByCompanyId: vi.fn(),
  getContractsByCandidateId: vi.fn(),
  getAllActiveContracts: vi.fn(),
  getContractWithDetails: vi.fn(),
  updateContract: vi.fn(),
  generateContractPayments: vi.fn(),
  createContract: vi.fn(),
  getDocumentTemplates: vi.fn(),
  getSignedDocumentsByTemplateIds: vi.fn(),
  getAutentiqueDocumentsByContext: vi.fn(),
  getDocumentTemplateById: vi.fn(),
  createSignedDocument: vi.fn(),
  updateSignedDocumentUrl: vi.fn(),
  checkAllDocumentsSigned: vi.fn(),
  updateCompanyContractSigning: vi.fn(),
  getSignedDocuments: vi.fn(),
  getHiringProcessById: vi.fn(),
  getCandidateById: vi.fn(),
}));

vi.mock("../../db/hiring", () => ({
  updateHiringProcess: vi.fn(),
  checkAllSignaturesComplete: vi.fn(),
}));

// Mock dynamic imports used in the router
vi.mock("../../integrations/autentique", () => ({
  getDocumentStatus: vi.fn(),
  createDocument: vi.fn(),
  isAutentiqueConfigured: vi.fn(),
}));

vi.mock("../../lib/signPdf", () => ({
  embedSignatureInPdf: vi.fn(),
}));

vi.mock("../../storage", () => ({
  storagePut: vi.fn(),
}));

import { contractRouter } from "../../routers/contract";
import { supabaseAdmin } from "../../supabase";
import * as db from "../../db";
import * as hiringDb from "../../db/hiring";
import {
  candidateContext,
  companyContext,
  agencyContext,
  adminContext,
  unauthenticatedContext,
} from "../helpers/mock-context";
import {
  mockCandidate,
  mockCompany,
  mockAgency,
  MOCK_IDS,
} from "../helpers/mock-data";

const createCaller = (ctx: any) => contractRouter.createCaller(ctx);

describe("contract router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // create
  // ============================================
  describe("create", () => {
    const validInput = {
      candidateId: MOCK_IDS.candidate,
      jobId: MOCK_IDS.job,
      applicationId: MOCK_IDS.application,
      contractType: "estagio" as const,
      contractNumber: "CT-001",
      monthlySalary: 1500,
      monthlyFee: 200,
      startDate: "2026-04-01",
    };

    it("creates a contract successfully", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());
      vi.mocked((db as any).createContract).mockResolvedValue(MOCK_IDS.contract);

      const caller = createCaller(companyContext());
      const result = await caller.create(validInput);

      expect(result).toEqual({ contractId: MOCK_IDS.contract });
    });

    it("throws NOT_FOUND when company not found", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(null as any);

      const caller = createCaller(companyContext());
      await expect(caller.create(validInput)).rejects.toThrow(TRPCError);
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.create(validInput)).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated users", async () => {
      const caller = createCaller(unauthenticatedContext());
      await expect(caller.create(validInput)).rejects.toThrow(TRPCError);
    });

    it("validates contract type enum", async () => {
      const caller = createCaller(companyContext());
      await expect(
        caller.create({ ...validInput, contractType: "invalid" as any })
      ).rejects.toThrow();
    });
  });

  // ============================================
  // getByCompany
  // ============================================
  describe("getByCompany", () => {
    it("returns contracts for the company", async () => {
      const contracts = [{ id: MOCK_IDS.contract, status: "active" }];
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());
      vi.mocked(db.getContractsByCompanyId).mockResolvedValue(contracts);

      const caller = createCaller(companyContext());
      const result = await caller.getByCompany();

      expect(result).toEqual(contracts);
      expect(db.getContractsByCompanyId).toHaveBeenCalledWith(MOCK_IDS.company);
    });

    it("returns empty array when company not found", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(null as any);

      const caller = createCaller(companyContext());
      const result = await caller.getByCompany();

      expect(result).toEqual([]);
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.getByCompany()).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // getByCandidate
  // ============================================
  describe("getByCandidate", () => {
    it("returns contracts for the candidate", async () => {
      const contracts = [{ id: MOCK_IDS.contract, status: "active" }];
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate());
      vi.mocked(db.getContractsByCandidateId).mockResolvedValue(contracts);

      const caller = createCaller(candidateContext());
      const result = await caller.getByCandidate();

      expect(result).toEqual(contracts);
    });

    it("returns empty array when candidate not found", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(null as any);

      const caller = createCaller(candidateContext());
      const result = await caller.getByCandidate();

      expect(result).toEqual([]);
    });

    it("rejects company users", async () => {
      const caller = createCaller(companyContext());
      await expect(caller.getByCandidate()).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // getAllActive
  // ============================================
  describe("getAllActive", () => {
    it("returns all active contracts for admin", async () => {
      const contracts = [{ id: MOCK_IDS.contract }];
      vi.mocked(db.getAllActiveContracts).mockResolvedValue(contracts);

      const caller = createCaller(adminContext());
      const result = await caller.getAllActive();

      expect(result).toEqual(contracts);
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.getAllActive()).rejects.toThrow(TRPCError);
    });

    it("rejects company users", async () => {
      const caller = createCaller(companyContext());
      await expect(caller.getAllActive()).rejects.toThrow(TRPCError);
    });

    it("rejects agency users", async () => {
      const caller = createCaller(agencyContext());
      await expect(caller.getAllActive()).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // update
  // ============================================
  describe("update", () => {
    const contractId = MOCK_IDS.contract;

    it("updates contract as admin", async () => {
      vi.mocked(db.getContractWithDetails).mockResolvedValue({
        id: contractId,
        company_id: MOCK_IDS.company,
      });
      vi.mocked(db.updateContract).mockResolvedValue(undefined);

      const caller = createCaller(adminContext());
      const result = await caller.update({ id: contractId, status: "suspended" });

      expect(result).toEqual({ success: true });
      expect(db.updateContract).toHaveBeenCalledWith(contractId, { status: "suspended" });
    });

    it("generates payments when contract is activated", async () => {
      vi.mocked(db.getContractWithDetails).mockResolvedValue({
        id: contractId,
        company_id: MOCK_IDS.company,
      });
      vi.mocked(db.updateContract).mockResolvedValue(undefined);
      vi.mocked(db.generateContractPayments).mockResolvedValue(12);

      const caller = createCaller(adminContext());
      await caller.update({ id: contractId, status: "active" });

      expect(db.generateContractPayments).toHaveBeenCalledWith(contractId);
    });

    it("updates contract as company owner", async () => {
      vi.mocked(db.getContractWithDetails).mockResolvedValue({
        id: contractId,
        company_id: MOCK_IDS.company,
      });
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());
      vi.mocked(db.updateContract).mockResolvedValue(undefined);

      const caller = createCaller(companyContext());
      const result = await caller.update({ id: contractId, status: "terminated", terminationReason: "End of term" });

      expect(result).toEqual({ success: true });
    });

    it("throws FORBIDDEN for company user on another company's contract", async () => {
      vi.mocked(db.getContractWithDetails).mockResolvedValue({
        id: contractId,
        company_id: "other-company-id",
      });
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());

      const caller = createCaller(companyContext());
      await expect(
        caller.update({ id: contractId, status: "terminated" })
      ).rejects.toThrow(TRPCError);
    });

    it("throws NOT_FOUND when contract does not exist", async () => {
      vi.mocked(db.getContractWithDetails).mockResolvedValue(null);

      const caller = createCaller(adminContext());
      await expect(
        caller.update({ id: contractId, status: "active" })
      ).rejects.toThrow(TRPCError);
    });

    it("throws FORBIDDEN for candidate user", async () => {
      vi.mocked(db.getContractWithDetails).mockResolvedValue({
        id: contractId,
        company_id: MOCK_IDS.company,
      });

      const caller = createCaller(candidateContext());
      await expect(
        caller.update({ id: contractId, status: "active" })
      ).rejects.toThrow(TRPCError);
    });

    it("updates contract as agency owner", async () => {
      vi.mocked(db.getContractWithDetails).mockResolvedValue({
        id: contractId,
        company_id: MOCK_IDS.company,
        companies: { agency_id: MOCK_IDS.agency },
      });
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency());
      vi.mocked(db.updateContract).mockResolvedValue(undefined);

      const caller = createCaller(agencyContext());
      const result = await caller.update({ id: contractId, status: "suspended" });

      expect(result).toEqual({ success: true });
    });

    it("throws FORBIDDEN for agency user on another agency's contract", async () => {
      vi.mocked(db.getContractWithDetails).mockResolvedValue({
        id: contractId,
        company_id: MOCK_IDS.company,
        companies: { agency_id: "other-agency-id" },
      });
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency());

      const caller = createCaller(agencyContext());
      await expect(
        caller.update({ id: contractId, status: "suspended" })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // getDocumentsToSign
  // ============================================
  describe("getDocumentsToSign", () => {
    it("returns empty result when no agency linked", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(null as any);

      const caller = createCaller(companyContext({ agency_id: null }));
      const result = await caller.getDocumentsToSign({ category: "contrato_inicial" });

      expect(result).toEqual({
        templates: [],
        signed: [],
        total: 0,
        signedCount: 0,
        allSigned: true,
      });
    });

    it("returns templates and signed documents", async () => {
      const company = mockCompany();
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(company);
      vi.mocked(db.getDocumentTemplates).mockResolvedValue([
        { id: "tmpl-1", name: "Contract A", agency_id: MOCK_IDS.agency },
        { id: "tmpl-2", name: "Contract B", agency_id: MOCK_IDS.agency },
      ]);
      vi.mocked(db.getSignedDocumentsByTemplateIds).mockResolvedValue([
        { template_id: "tmpl-1" },
      ]);
      vi.mocked(db.getAutentiqueDocumentsByContext).mockResolvedValue([]);

      // Mock supabaseAdmin.from for scheduled_meetings query
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(companyContext());
      const result = await caller.getDocumentsToSign({ category: "contrato_inicial" });

      expect(result.total).toBe(2);
      expect(result.signedCount).toBe(1);
      expect(result.allSigned).toBe(false);
      expect(result.templates).toHaveLength(2);
      expect(result.templates[0].isSigned).toBe(true);
      expect(result.templates[1].isSigned).toBe(false);
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.getDocumentsToSign({ category: "contrato_inicial" })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated users", async () => {
      const caller = createCaller(unauthenticatedContext());
      await expect(
        caller.getDocumentsToSign({ category: "contrato_inicial" })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // signDocument
  // ============================================
  describe("signDocument", () => {
    const signInput = {
      templateId: "a0000000-0000-4000-8000-000000000099",
      signerName: "João Silva",
      signerCpf: "12345678901",
      signature: "data:image/png;base64,abc123",
    };

    it("signs document successfully", async () => {
      const company = mockCompany();
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(company);
      vi.mocked(db.getDocumentTemplateById).mockResolvedValue({
        id: signInput.templateId,
        agency_id: MOCK_IDS.agency,
        category: "contrato_inicial",
        file_url: "https://example.com/doc.pdf",
      });
      vi.mocked(db.createSignedDocument).mockResolvedValue({ id: "signed-1" });
      vi.mocked(db.checkAllDocumentsSigned).mockResolvedValue({
        allSigned: false,
        total: 3,
        signed: 1,
      });

      const caller = createCaller(companyContext());
      const result = await caller.signDocument(signInput);

      expect(result.success).toBe(true);
      expect(result.signedDocumentId).toBe("signed-1");
      expect(result.remainingUnsigned).toBe(2);
      expect(result.allSigned).toBe(false);
    });

    it("throws BAD_REQUEST when no agency linked", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(null as any);
      vi.mocked(db.getCompanyByEmail).mockResolvedValue(null as any);

      const caller = createCaller(companyContext({ agency_id: null }));
      await expect(caller.signDocument(signInput)).rejects.toThrow(TRPCError);
    });

    it("throws FORBIDDEN when template does not belong to agency", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());
      vi.mocked(db.getDocumentTemplateById).mockResolvedValue({
        id: signInput.templateId,
        agency_id: "other-agency-id",
        category: "contrato_inicial",
      });

      const caller = createCaller(companyContext());
      await expect(caller.signDocument(signInput)).rejects.toThrow(TRPCError);
    });

    it("throws FORBIDDEN when template not found", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());
      vi.mocked(db.getDocumentTemplateById).mockResolvedValue(null);

      const caller = createCaller(companyContext());
      await expect(caller.signDocument(signInput)).rejects.toThrow(TRPCError);
    });

    it("updates company contract signing when all signed for contrato_inicial", async () => {
      const company = mockCompany();
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(company);
      vi.mocked(db.getDocumentTemplateById).mockResolvedValue({
        id: signInput.templateId,
        agency_id: MOCK_IDS.agency,
        category: "contrato_inicial",
        file_url: "https://example.com/doc.pdf",
      });
      vi.mocked(db.createSignedDocument).mockResolvedValue({ id: "signed-1" });
      vi.mocked(db.checkAllDocumentsSigned).mockResolvedValue({
        allSigned: true,
        total: 1,
        signed: 1,
      });
      vi.mocked(db.updateCompanyContractSigning).mockResolvedValue(undefined);

      const caller = createCaller(companyContext());
      const result = await caller.signDocument(signInput);

      expect(result.allSigned).toBe(true);
      expect(db.updateCompanyContractSigning).toHaveBeenCalledWith(
        MOCK_IDS.company,
        expect.objectContaining({
          contract_signer_name: "João Silva",
          contract_signer_cpf: "12345678901",
        })
      );
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.signDocument(signInput)).rejects.toThrow(TRPCError);
    });

    it("validates minimum CPF length", async () => {
      const caller = createCaller(companyContext());
      await expect(
        caller.signDocument({ ...signInput, signerCpf: "123" })
      ).rejects.toThrow();
    });
  });

  // ============================================
  // getSignedDocuments
  // ============================================
  describe("getSignedDocuments", () => {
    it("returns signed documents for company user", async () => {
      const company = mockCompany();
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(company);
      vi.mocked(db.getSignedDocuments).mockResolvedValue([
        { id: "signed-1", category: "contrato_inicial" },
      ]);

      // Mock supabaseAdmin.from for scheduled_meetings
      const meetingChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      // Mock storage
      const storageChain = {
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(meetingChain as any);
      vi.mocked(supabaseAdmin.storage.from).mockReturnValue(storageChain as any);

      const caller = createCaller(companyContext());
      const result = await caller.getSignedDocuments({});

      expect(result).toHaveLength(1);
      expect(db.getSignedDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: MOCK_IDS.company })
      );
    });

    it("returns empty array when company not found", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(null as any);

      const caller = createCaller(companyContext());
      const result = await caller.getSignedDocuments({});

      expect(result).toEqual([]);
    });

    it("returns signed documents for agency user", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency());
      vi.mocked(db.getSignedDocuments).mockResolvedValue([]);

      const caller = createCaller(agencyContext());
      const result = await caller.getSignedDocuments({});

      expect(result).toEqual([]);
      expect(db.getSignedDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ agencyId: MOCK_IDS.agency })
      );
    });

    it("returns signed documents for admin user", async () => {
      vi.mocked(db.getSignedDocuments).mockResolvedValue([]);

      const caller = createCaller(adminContext());
      const result = await caller.getSignedDocuments({});

      expect(result).toEqual([]);
    });

    it("throws FORBIDDEN for candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.getSignedDocuments({})).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // checkAllSigned
  // ============================================
  describe("checkAllSigned", () => {
    it("returns allSigned true when no agency linked", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(null as any);

      const caller = createCaller(companyContext({ agency_id: null }));
      const result = await caller.checkAllSigned({ category: "contrato_inicial" });

      expect(result).toEqual({ allSigned: true, total: 0, signed: 0 });
    });

    it("returns signing status", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());
      vi.mocked(db.checkAllDocumentsSigned).mockResolvedValue({
        allSigned: false,
        total: 3,
        signed: 1,
      });

      const caller = createCaller(companyContext());
      const result = await caller.checkAllSigned({ category: "clt" });

      expect(result.allSigned).toBe(false);
      expect(result.total).toBe(3);
      expect(result.signed).toBe(1);
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.checkAllSigned({ category: "contrato_inicial" })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // getCandidateContractDocuments
  // ============================================
  describe("getCandidateContractDocuments", () => {
    const hpId = "a0000000-0000-4000-8000-000000000050";

    it("returns templates for candidate's hiring process", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate());
      vi.mocked(db.getHiringProcessById).mockResolvedValue({
        id: hpId,
        candidate_id: MOCK_IDS.candidate,
        company_id: MOCK_IDS.company,
        hiring_type: "estagio",
      });
      vi.mocked(db.getCompanyById).mockResolvedValue(mockCompany());
      vi.mocked(db.getDocumentTemplates).mockResolvedValue([
        { id: "tmpl-1", name: "Estagio Contract" },
      ]);
      vi.mocked(db.getSignedDocumentsByTemplateIds).mockResolvedValue([]);

      const caller = createCaller(candidateContext());
      const result = await caller.getCandidateContractDocuments({ hiringProcessId: hpId });

      expect(result.total).toBe(1);
      expect(result.signedCount).toBe(0);
      expect(result.allSigned).toBe(false);
    });

    it("returns empty when candidate not found", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(null as any);

      const caller = createCaller(candidateContext());
      const result = await caller.getCandidateContractDocuments({ hiringProcessId: hpId });

      expect(result).toEqual({ templates: [], total: 0, signedCount: 0, allSigned: true });
    });

    it("throws FORBIDDEN when hiring process belongs to different candidate", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate());
      vi.mocked(db.getHiringProcessById).mockResolvedValue({
        id: hpId,
        candidate_id: "other-candidate-id",
        company_id: MOCK_IDS.company,
        hiring_type: "estagio",
      });

      const caller = createCaller(candidateContext());
      await expect(
        caller.getCandidateContractDocuments({ hiringProcessId: hpId })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects company users", async () => {
      const caller = createCaller(companyContext());
      await expect(
        caller.getCandidateContractDocuments({ hiringProcessId: hpId })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // signDocumentAsCandidate
  // ============================================
  describe("signDocumentAsCandidate", () => {
    const hpId = "a0000000-0000-4000-8000-000000000050";
    const templateId = "a0000000-0000-4000-8000-000000000099";
    const signInput = {
      templateId,
      hiringProcessId: hpId,
      signerName: "Maria Silva",
      signerCpf: "12345678901",
      signature: "data:image/png;base64,abc123",
    };

    it("signs document as candidate successfully", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate());
      vi.mocked(db.getHiringProcessById).mockResolvedValue({
        id: hpId,
        candidate_id: MOCK_IDS.candidate,
        company_id: MOCK_IDS.company,
        hiring_type: "estagio",
      });
      vi.mocked(db.getCompanyById).mockResolvedValue(mockCompany());
      vi.mocked(db.getDocumentTemplateById).mockResolvedValue({
        id: templateId,
        agency_id: MOCK_IDS.agency,
        category: "estagio",
        file_url: "https://example.com/doc.pdf",
      });
      vi.mocked(db.createSignedDocument).mockResolvedValue({ id: "signed-1" });
      vi.mocked(db.checkAllDocumentsSigned).mockResolvedValue({
        allSigned: false,
        total: 2,
        signed: 1,
      });

      const caller = createCaller(candidateContext());
      const result = await caller.signDocumentAsCandidate(signInput);

      expect(result.success).toBe(true);
      expect(result.signedDocumentId).toBe("signed-1");
      expect(result.remainingUnsigned).toBe(1);
    });

    it("marks hiring process as candidate_signed when all docs signed", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate());
      vi.mocked(db.getHiringProcessById).mockResolvedValue({
        id: hpId,
        candidate_id: MOCK_IDS.candidate,
        company_id: MOCK_IDS.company,
        hiring_type: "estagio",
      });
      vi.mocked(db.getCompanyById).mockResolvedValue(mockCompany());
      vi.mocked(db.getDocumentTemplateById).mockResolvedValue({
        id: templateId,
        agency_id: MOCK_IDS.agency,
        category: "estagio",
        file_url: "https://example.com/doc.pdf",
      });
      vi.mocked(db.createSignedDocument).mockResolvedValue({ id: "signed-1" });
      vi.mocked(db.checkAllDocumentsSigned).mockResolvedValue({
        allSigned: true,
        total: 1,
        signed: 1,
      });
      vi.mocked(hiringDb.updateHiringProcess).mockResolvedValue(undefined);
      vi.mocked(hiringDb.checkAllSignaturesComplete).mockResolvedValue({ complete: false });

      const caller = createCaller(candidateContext());
      const result = await caller.signDocumentAsCandidate(signInput);

      expect(result.allSigned).toBe(true);
      expect(hiringDb.updateHiringProcess).toHaveBeenCalledWith(
        hpId,
        expect.objectContaining({ candidate_signed: true })
      );
    });

    it("activates CLT hiring process when all signatures complete", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate());
      vi.mocked(db.getHiringProcessById).mockResolvedValue({
        id: hpId,
        candidate_id: MOCK_IDS.candidate,
        company_id: MOCK_IDS.company,
        hiring_type: "clt",
      });
      vi.mocked(db.getCompanyById).mockResolvedValue(mockCompany());
      vi.mocked(db.getDocumentTemplateById).mockResolvedValue({
        id: templateId,
        agency_id: MOCK_IDS.agency,
        category: "clt",
        file_url: "https://example.com/doc.pdf",
      });
      vi.mocked(db.createSignedDocument).mockResolvedValue({ id: "signed-1" });
      vi.mocked(db.checkAllDocumentsSigned).mockResolvedValue({
        allSigned: true,
        total: 1,
        signed: 1,
      });
      vi.mocked(hiringDb.updateHiringProcess).mockResolvedValue(undefined);
      vi.mocked(hiringDb.checkAllSignaturesComplete).mockResolvedValue({ complete: true });

      const caller = createCaller(candidateContext());
      await caller.signDocumentAsCandidate(signInput);

      // Should have been called twice: once for candidate_signed, once for status: active
      expect(hiringDb.updateHiringProcess).toHaveBeenCalledTimes(2);
      expect(hiringDb.updateHiringProcess).toHaveBeenCalledWith(hpId, { status: "active" });
    });

    it("throws NOT_FOUND when candidate not found", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(null as any);

      const caller = createCaller(candidateContext());
      await expect(caller.signDocumentAsCandidate(signInput)).rejects.toThrow(TRPCError);
    });

    it("throws FORBIDDEN when hiring process belongs to different candidate", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate());
      vi.mocked(db.getHiringProcessById).mockResolvedValue({
        id: hpId,
        candidate_id: "other-candidate-id",
        company_id: MOCK_IDS.company,
        hiring_type: "estagio",
      });

      const caller = createCaller(candidateContext());
      await expect(caller.signDocumentAsCandidate(signInput)).rejects.toThrow(TRPCError);
    });

    it("throws BAD_REQUEST when no agency linked", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate());
      vi.mocked(db.getHiringProcessById).mockResolvedValue({
        id: hpId,
        candidate_id: MOCK_IDS.candidate,
        company_id: MOCK_IDS.company,
        hiring_type: "estagio",
      });
      vi.mocked(db.getCompanyById).mockResolvedValue({ ...mockCompany(), agency_id: null });

      const caller = createCaller(candidateContext());
      await expect(caller.signDocumentAsCandidate(signInput)).rejects.toThrow(TRPCError);
    });

    it("throws FORBIDDEN when template not from agency", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate());
      vi.mocked(db.getHiringProcessById).mockResolvedValue({
        id: hpId,
        candidate_id: MOCK_IDS.candidate,
        company_id: MOCK_IDS.company,
        hiring_type: "estagio",
      });
      vi.mocked(db.getCompanyById).mockResolvedValue(mockCompany());
      vi.mocked(db.getDocumentTemplateById).mockResolvedValue({
        id: templateId,
        agency_id: "other-agency-id",
        category: "estagio",
      });

      const caller = createCaller(candidateContext());
      await expect(caller.signDocumentAsCandidate(signInput)).rejects.toThrow(TRPCError);
    });

    it("rejects company users", async () => {
      const caller = createCaller(companyContext());
      await expect(caller.signDocumentAsCandidate(signInput)).rejects.toThrow(TRPCError);
    });
  });
});
