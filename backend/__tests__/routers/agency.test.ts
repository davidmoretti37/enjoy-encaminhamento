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
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({ data: { user: { id: "new-id" } }, error: null }),
        },
      },
    },
  };
});

vi.mock("../../db", () => ({
  getActiveAgenciesPublic: vi.fn(),
  getAllAgencies: vi.fn(),
  getAgencyById: vi.fn(),
  updateAgencyStatus: vi.fn(),
  getAffiliateByUserId: vi.fn(),
  createAgencyInvitation: vi.fn(),
  getAgencyInvitationByToken: vi.fn(),
}));

vi.mock("../../routers/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../_core/env", () => ({
  ENV: { appUrl: "http://localhost:5001" },
}));

vi.mock("../../services/ai/summarizer", () => ({
  generateCompanySummary: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../services/ai/columnMapper", () => ({
  parseExcelWithAI: vi.fn(),
  suggestColumnMappings: vi.fn(),
  identifyBasicColumns: vi.fn(),
  suggestCompanyColumnMappings: vi.fn(),
  getCompanyFieldsList: vi.fn(),
}));

import { agencyRouter } from "../../routers/agency";
import * as db from "../../db";
import {
  adminContext,
  agencyContext,
  candidateContext,
  companyContext,
  unauthenticatedContext,
} from "../helpers/mock-context";
import { mockAgency, MOCK_IDS } from "../helpers/mock-data";

const createCaller = (ctx: any) => agencyRouter.createCaller(ctx);

describe("agency router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllPublic", () => {
    it("returns active agencies without auth", async () => {
      vi.mocked(db.getActiveAgenciesPublic).mockResolvedValue([mockAgency()] as any);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.getAllPublic();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("ANEC Ipatinga");
    });
  });

  describe("getAll (admin)", () => {
    it("returns all agencies for admin", async () => {
      vi.mocked(db.getAllAgencies).mockResolvedValue([mockAgency()] as any);

      const caller = createCaller(adminContext());
      const result = await caller.getAll();
      expect(result).toHaveLength(1);
    });

    it("rejects non-admin users", async () => {
      const caller = createCaller(agencyContext());
      await expect(caller.getAll()).rejects.toThrow("Admin access required");
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.getAll()).rejects.toThrow("Admin access required");
    });
  });

  describe("getById (admin)", () => {
    it("returns agency by ID", async () => {
      vi.mocked(db.getAgencyById).mockResolvedValue(mockAgency() as any);

      const caller = createCaller(adminContext());
      const result = await caller.getById({ id: MOCK_IDS.agency });
      expect(result?.name).toBe("ANEC Ipatinga");
    });

    it("rejects non-admin users", async () => {
      const caller = createCaller(companyContext());
      await expect(caller.getById({ id: MOCK_IDS.agency })).rejects.toThrow(
        "Admin access required"
      );
    });
  });

  describe("updateStatus", () => {
    it("updates agency status", async () => {
      vi.mocked(db.updateAgencyStatus).mockResolvedValue(undefined);

      const caller = createCaller(adminContext());
      const result = await caller.updateStatus({
        id: MOCK_IDS.agency,
        status: "active",
      });
      expect(result).toEqual({ success: true });
      expect(db.updateAgencyStatus).toHaveBeenCalledWith(MOCK_IDS.agency, "active");
    });

    it("validates status enum", async () => {
      const caller = createCaller(adminContext());
      await expect(
        caller.updateStatus({ id: MOCK_IDS.agency, status: "invalid" as any })
      ).rejects.toThrow();
    });
  });

  describe("createInvitation", () => {
    it("creates invitation and sends email", async () => {
      vi.mocked(db.getAffiliateByUserId).mockResolvedValue({
        id: "affiliate-1",
      } as any);
      vi.mocked(db.createAgencyInvitation).mockResolvedValue({
        id: "inv-1",
        token: "test-token",
      } as any);

      const caller = createCaller(adminContext());
      const result = await caller.createInvitation({
        email: "new@agency.com",
        sendEmail: true,
      });

      expect(result.emailSent).toBe(true);
      expect(db.createAgencyInvitation).toHaveBeenCalledWith(
        "new@agency.com",
        "affiliate-1",
        "aa000000-0000-4000-8000-000000000001",
        undefined
      );
    });

    it("throws when affiliate profile not found", async () => {
      vi.mocked(db.getAffiliateByUserId).mockResolvedValue(undefined as any);

      const caller = createCaller(adminContext());
      await expect(
        caller.createInvitation({ email: "test@test.com" })
      ).rejects.toThrow("Affiliate profile not found");
    });
  });

  describe("validateInvitation", () => {
    const validToken = "a0000000-0000-4000-8000-000000000099";

    it("validates a valid pending invitation", async () => {
      vi.mocked(db.getAgencyInvitationByToken).mockResolvedValue({
        status: "pending",
        expires_at: new Date(Date.now() + 86400000).toISOString(), // tomorrow
        email: "test@test.com",
      } as any);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.validateInvitation({ token: validToken });
      expect(result.isValid).toBe(true);
    });

    it("rejects expired invitation", async () => {
      vi.mocked(db.getAgencyInvitationByToken).mockResolvedValue({
        status: "pending",
        expires_at: new Date(Date.now() - 86400000).toISOString(), // yesterday
        email: "test@test.com",
      } as any);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.validateInvitation({ token: validToken });
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("expirado");
    });

    it("rejects already used invitation", async () => {
      vi.mocked(db.getAgencyInvitationByToken).mockResolvedValue({
        status: "accepted",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      } as any);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.validateInvitation({ token: validToken });
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain("utilizado");
    });

    it("rejects non-existent invitation", async () => {
      vi.mocked(db.getAgencyInvitationByToken).mockResolvedValue(undefined as any);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.validateInvitation({ token: validToken });
      expect(result.isValid).toBe(false);
    });
  });
});
