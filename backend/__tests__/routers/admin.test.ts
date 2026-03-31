import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock external dependencies before imports
vi.mock("../../supabase", () => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    supabaseAdmin: {
      from: vi.fn(() => mockChain),
      auth: { admin: { updateUserById: vi.fn() } },
    },
  };
});

vi.mock("../../db", () => ({
  getAdminDashboardStats: vi.fn(),
  getAllPayments: vi.fn(),
  updatePaymentStatus: vi.fn(),
  getPaymentAlertCounts: vi.fn(),
  getPaymentAlertCountsByAgency: vi.fn(),
  getPaymentsPendingReview: vi.fn(),
  getPaymentsPendingReviewByAgency: vi.fn(),
  updatePayment: vi.fn(),
  createPayment: vi.fn(),
  deletePayment: vi.fn(),
  getAgencyForUserContext: vi.fn(),
  getContractWithDetails: vi.fn(),
  getCompanyById: vi.fn(),
  checkAllDocumentsSigned: vi.fn(),
  generateContractPayments: vi.fn(),
}));

import { adminRouter } from "../../routers/admin";
import * as db from "../../db";
import { supabaseAdmin } from "../../supabase";
import {
  adminContext,
  agencyContext,
  candidateContext,
  companyContext,
  unauthenticatedContext,
} from "../helpers/mock-context";
import { MOCK_IDS } from "../helpers/mock-data";

const createCaller = (ctx: any) => adminRouter.createCaller(ctx);

describe("admin router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- getStats ----
  describe("getStats", () => {
    it("returns dashboard stats for admin", async () => {
      const stats = { users: 10, companies: 5, candidates: 20 };
      vi.mocked(db.getAdminDashboardStats).mockResolvedValue(stats as any);

      const caller = createCaller(adminContext());
      const result = await caller.getStats();
      expect(result).toEqual(stats);
      expect(db.getAdminDashboardStats).toHaveBeenCalledOnce();
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.getStats()).rejects.toThrow(TRPCError);
    });

    it("rejects company users", async () => {
      const caller = createCaller(companyContext());
      await expect(caller.getStats()).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated users", async () => {
      const caller = createCaller(unauthenticatedContext());
      await expect(caller.getStats()).rejects.toThrow(TRPCError);
    });
  });

  // ---- getAllApplications ----
  describe("getAllApplications", () => {
    it("returns empty array (TODO)", async () => {
      const caller = createCaller(adminContext());
      const result = await caller.getAllApplications();
      expect(result).toEqual([]);
    });

    it("rejects non-admin users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.getAllApplications()).rejects.toThrow(TRPCError);
    });
  });

  // ---- updateApplicationStatus ----
  describe("updateApplicationStatus", () => {
    it("returns success for admin", async () => {
      const caller = createCaller(adminContext());
      const result = await caller.updateApplicationStatus({
        id: MOCK_IDS.application,
        status: "screening",
      });
      expect(result).toEqual({ success: true });
    });

    it("rejects non-admin users", async () => {
      const caller = createCaller(companyContext());
      await expect(
        caller.updateApplicationStatus({
          id: MOCK_IDS.application,
          status: "screening",
        })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects invalid status", async () => {
      const caller = createCaller(adminContext());
      await expect(
        caller.updateApplicationStatus({
          id: MOCK_IDS.application,
          status: "invalid-status" as any,
        })
      ).rejects.toThrow();
    });
  });

  // ---- getAllContracts ----
  describe("getAllContracts", () => {
    it("returns empty array for admin (TODO)", async () => {
      const caller = createCaller(adminContext());
      const result = await caller.getAllContracts();
      expect(result).toEqual([]);
    });

    it("rejects agency users", async () => {
      const caller = createCaller(agencyContext());
      await expect(caller.getAllContracts()).rejects.toThrow(TRPCError);
    });
  });

  // ---- updateContractStatus ----
  describe("updateContractStatus", () => {
    it("updates contract status for admin without agency scoping", async () => {
      vi.mocked(db.getContractWithDetails).mockResolvedValue(null as any);

      const caller = createCaller(adminContext());
      const result = await caller.updateContractStatus({
        id: MOCK_IDS.contract,
        status: "suspended",
      });
      expect(result).toEqual({ success: true });
    });

    it("agency user can update contract in their agency", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue({ id: "agency-1" } as any);
      // verifyContractBelongsToAgency mocks
      vi.mocked(db.getContractWithDetails).mockResolvedValue({ company_id: "comp-1" } as any);
      vi.mocked(db.getCompanyById).mockResolvedValue({ id: "comp-1", agency_id: "agency-1" } as any);

      const caller = createCaller(agencyContext());
      const result = await caller.updateContractStatus({
        id: MOCK_IDS.contract,
        status: "suspended",
      });
      expect(result).toEqual({ success: true });
    });

    it("agency user is rejected for contract outside their agency", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue({ id: "agency-1" } as any);
      vi.mocked(db.getContractWithDetails).mockResolvedValue({ company_id: "comp-1" } as any);
      vi.mocked(db.getCompanyById).mockResolvedValue({ id: "comp-1", agency_id: "other-agency" } as any);

      const caller = createCaller(agencyContext());
      await expect(
        caller.updateContractStatus({ id: MOCK_IDS.contract, status: "suspended" })
      ).rejects.toThrow("Contract does not belong to your agency");
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.updateContractStatus({ id: MOCK_IDS.contract, status: "active" })
      ).rejects.toThrow(TRPCError);
    });

    it("checks documents when activating a contract", async () => {
      vi.mocked(db.getContractWithDetails).mockResolvedValue({
        id: MOCK_IDS.contract,
        company_id: "comp-1",
        contract_type: "estagio",
      } as any);
      vi.mocked(db.getCompanyById).mockResolvedValue({
        id: "comp-1",
        agency_id: "agency-1",
      } as any);
      vi.mocked(db.checkAllDocumentsSigned).mockResolvedValue({
        allSigned: false,
        signed: 1,
        total: 3,
      } as any);

      const caller = createCaller(adminContext());
      await expect(
        caller.updateContractStatus({ id: MOCK_IDS.contract, status: "active" })
      ).rejects.toThrow("Documentos pendentes");
    });

    it("generates payments when activating a contract with all docs signed", async () => {
      vi.mocked(db.getContractWithDetails).mockResolvedValue({
        id: MOCK_IDS.contract,
        company_id: "comp-1",
        contract_type: "clt",
      } as any);
      vi.mocked(db.getCompanyById).mockResolvedValue({
        id: "comp-1",
        agency_id: "agency-1",
      } as any);
      vi.mocked(db.checkAllDocumentsSigned).mockResolvedValue({
        allSigned: true,
        signed: 3,
        total: 3,
      } as any);
      vi.mocked(db.generateContractPayments).mockResolvedValue(12 as any);

      const caller = createCaller(adminContext());
      const result = await caller.updateContractStatus({
        id: MOCK_IDS.contract,
        status: "active",
      });
      expect(result).toEqual({ success: true });
      expect(db.generateContractPayments).toHaveBeenCalledWith(MOCK_IDS.contract);
    });
  });

  // ---- getAllPayments ----
  describe("getAllPayments", () => {
    it("returns all payments for admin", async () => {
      const payments = [{ id: "p1", amount: 100 }];
      vi.mocked(db.getAllPayments).mockResolvedValue(payments as any);

      const caller = createCaller(adminContext());
      const result = await caller.getAllPayments();
      expect(result).toEqual(payments);
    });

    it("rejects non-admin users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.getAllPayments()).rejects.toThrow(TRPCError);
    });
  });

  // ---- updatePaymentStatus ----
  describe("updatePaymentStatus", () => {
    it("updates payment status for admin", async () => {
      vi.mocked(db.updatePaymentStatus).mockResolvedValue(undefined as any);

      const caller = createCaller(adminContext());
      const result = await caller.updatePaymentStatus({
        id: MOCK_IDS.application,
        status: "paid",
      });
      expect(result).toEqual({ success: true });
      expect(db.updatePaymentStatus).toHaveBeenCalledWith(MOCK_IDS.application, "paid");
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.updatePaymentStatus({ id: MOCK_IDS.application, status: "paid" })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ---- getPaymentAlertCounts ----
  describe("getPaymentAlertCounts", () => {
    it("returns all alert counts for admin", async () => {
      const counts = { overdue: 3, pending: 5 };
      vi.mocked(db.getPaymentAlertCounts).mockResolvedValue(counts as any);

      const caller = createCaller(adminContext());
      const result = await caller.getPaymentAlertCounts();
      expect(result).toEqual(counts);
    });

    it("returns agency-scoped counts for agency user", async () => {
      const counts = { overdue: 1, pending: 2 };
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue({ id: "agency-1" } as any);
      vi.mocked(db.getPaymentAlertCountsByAgency).mockResolvedValue(counts as any);

      const caller = createCaller(agencyContext());
      const result = await caller.getPaymentAlertCounts();
      expect(result).toEqual(counts);
      expect(db.getPaymentAlertCountsByAgency).toHaveBeenCalledWith("agency-1");
    });
  });

  // ---- getPaymentsPendingReview ----
  describe("getPaymentsPendingReview", () => {
    it("returns all pending reviews for admin", async () => {
      const payments = [{ id: "p1" }];
      vi.mocked(db.getPaymentsPendingReview).mockResolvedValue(payments as any);

      const caller = createCaller(adminContext());
      const result = await caller.getPaymentsPendingReview();
      expect(result).toEqual(payments);
    });

    it("returns agency-scoped pending reviews for agency user", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue({ id: "agency-1" } as any);
      vi.mocked(db.getPaymentsPendingReviewByAgency).mockResolvedValue([] as any);

      const caller = createCaller(agencyContext());
      await caller.getPaymentsPendingReview();
      expect(db.getPaymentsPendingReviewByAgency).toHaveBeenCalledWith("agency-1");
    });
  });

  // ---- updatePaymentDetails ----
  describe("updatePaymentDetails", () => {
    it("updates payment details for admin", async () => {
      vi.mocked(db.updatePayment).mockResolvedValue(undefined as any);

      const caller = createCaller(adminContext());
      const result = await caller.updatePaymentDetails({
        paymentId: MOCK_IDS.application,
        amount: 5000,
        notes: "Updated",
      });
      expect(result).toEqual({ success: true });
      expect(db.updatePayment).toHaveBeenCalledWith(
        MOCK_IDS.application,
        expect.objectContaining({ amount: 5000, notes: "Updated" })
      );
    });

    it("sets paid_at when status is paid", async () => {
      vi.mocked(db.updatePayment).mockResolvedValue(undefined as any);

      const caller = createCaller(adminContext());
      await caller.updatePaymentDetails({
        paymentId: MOCK_IDS.application,
        status: "paid",
      });
      expect(db.updatePayment).toHaveBeenCalledWith(
        MOCK_IDS.application,
        expect.objectContaining({ status: "paid", paid_at: expect.any(String) })
      );
    });

    it("rejects non-agency/admin users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.updatePaymentDetails({ paymentId: MOCK_IDS.application })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ---- createManualPayment ----
  describe("createManualPayment", () => {
    it("creates a manual payment for admin", async () => {
      vi.mocked(db.createPayment).mockResolvedValue("new-payment-id" as any);

      const caller = createCaller(adminContext());
      const result = await caller.createManualPayment({
        company_id: MOCK_IDS.company,
        amount: 10000,
        due_date: "2026-04-01",
        payment_type: "monthly-fee",
      });
      expect(result).toEqual({ success: true, id: "new-payment-id" });
      expect(db.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: MOCK_IDS.company,
          amount: 10000,
          payment_type: "monthly-fee",
        })
      );
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.createManualPayment({
          company_id: MOCK_IDS.company,
          amount: 10000,
          due_date: "2026-04-01",
          payment_type: "monthly-fee",
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ---- deletePayment ----
  describe("deletePayment", () => {
    it("deletes payment for admin", async () => {
      vi.mocked(db.deletePayment).mockResolvedValue(undefined as any);

      const caller = createCaller(adminContext());
      const result = await caller.deletePayment({ paymentId: MOCK_IDS.application });
      expect(result).toEqual({ success: true });
      expect(db.deletePayment).toHaveBeenCalledWith(MOCK_IDS.application);
    });

    it("rejects company users", async () => {
      const caller = createCaller(companyContext());
      await expect(
        caller.deletePayment({ paymentId: MOCK_IDS.application })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ---- reviewPaymentReceipt ----
  describe("reviewPaymentReceipt", () => {
    it("approves a receipt for admin", async () => {
      vi.mocked(db.updatePayment).mockResolvedValue(undefined as any);

      const caller = createCaller(adminContext());
      const result = await caller.reviewPaymentReceipt({
        paymentId: MOCK_IDS.application,
        action: "approve",
      });
      expect(result).toEqual({ success: true });
      expect(db.updatePayment).toHaveBeenCalledWith(
        MOCK_IDS.application,
        expect.objectContaining({
          receipt_status: "verified",
          status: "paid",
          paid_at: expect.any(String),
          receipt_verified_by: "aa000000-0000-4000-8000-000000000001",
        })
      );
    });

    it("rejects a receipt with notes", async () => {
      vi.mocked(db.updatePayment).mockResolvedValue(undefined as any);

      const caller = createCaller(adminContext());
      const result = await caller.reviewPaymentReceipt({
        paymentId: MOCK_IDS.application,
        action: "reject",
        notes: "Blurry photo",
      });
      expect(result).toEqual({ success: true });
      expect(db.updatePayment).toHaveBeenCalledWith(
        MOCK_IDS.application,
        expect.objectContaining({
          receipt_status: "rejected",
          notes: "Blurry photo",
        })
      );
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.reviewPaymentReceipt({
          paymentId: MOCK_IDS.application,
          action: "approve",
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ---- getAllFeedback ----
  describe("getAllFeedback", () => {
    it("returns empty array for admin (TODO)", async () => {
      const caller = createCaller(adminContext());
      const result = await caller.getAllFeedback();
      expect(result).toEqual([]);
    });

    it("rejects non-admin", async () => {
      const caller = createCaller(agencyContext());
      await expect(caller.getAllFeedback()).rejects.toThrow(TRPCError);
    });
  });

  // ---- updateFeedbackStatus ----
  describe("updateFeedbackStatus", () => {
    it("returns success for admin (TODO)", async () => {
      const caller = createCaller(adminContext());
      const result = await caller.updateFeedbackStatus({
        id: MOCK_IDS.application,
        status: "reviewed",
      });
      expect(result).toEqual({ success: true });
    });

    it("rejects non-admin", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.updateFeedbackStatus({ id: MOCK_IDS.application, status: "reviewed" })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ---- getAIMatchingStats ----
  describe("getAIMatchingStats", () => {
    it("returns default stats for admin (TODO)", async () => {
      const caller = createCaller(adminContext());
      const result = await caller.getAIMatchingStats();
      expect(result).toEqual({ totalMatches: 0, averageScore: 0, matchesByJob: [] });
    });

    it("rejects non-admin", async () => {
      const caller = createCaller(companyContext());
      await expect(caller.getAIMatchingStats()).rejects.toThrow(TRPCError);
    });
  });

  // ---- getApplicationsWithScores ----
  describe("getApplicationsWithScores", () => {
    it("returns empty array for admin (TODO)", async () => {
      const caller = createCaller(adminContext());
      const result = await caller.getApplicationsWithScores();
      expect(result).toEqual([]);
    });

    it("rejects non-admin", async () => {
      const caller = createCaller(agencyContext());
      await expect(caller.getApplicationsWithScores()).rejects.toThrow(TRPCError);
    });
  });
});
