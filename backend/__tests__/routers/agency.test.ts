import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock external dependencies
vi.mock("../../supabase", () => {
  const mockChain = {
    upsert: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
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
  getAgencyForUserContext: vi.fn(),
  getAllCompanies: vi.fn(),
  getCompaniesByAgencyId: vi.fn(),
}));

vi.mock("../../routers/email", () => ({
  // Routers call this to pick the unit-specific sender address. Omitting it
  // made every send throw "No senderUnitForAgencyId export is defined".
  senderUnitForAgencyId: vi.fn().mockResolvedValue({
    email: "contato@anecrh.com.br",
    name: "ANEC",
  }),
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
      // The router passes rejectionReason as a third argument; it is undefined
      // when the caller does not supply one, and arity is matched exactly.
      expect(db.updateAgencyStatus).toHaveBeenCalledWith(MOCK_IDS.agency, "active", undefined);
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

  // ---- getCompanies ----
  describe("getCompanies", () => {
    // Every payment list joins through companies.agency_id, so a payment moved
    // onto a company with no agency disappears from the admin page, the agency
    // page and the totals at once, recoverable only by direct SQL. The payments
    // page builds its reassignment dropdown from this procedure, so an
    // agency-less company here is a way for the operator to lose a receivable.
    // Production has one such row.
    it("hides agency-less companies from an admin in all-agencies mode", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(null as any);
      vi.mocked(db.getAllCompanies).mockResolvedValue([
        { id: "c1", company_name: "Empresa Boa", agency_id: "ag-1" },
        { id: "c2", company_name: "Moretti Educação Profissional Eireli", agency_id: null },
        { id: "c3", company_name: "Outra Empresa", agency_id: "ag-2" },
      ] as any);

      const caller = createCaller(adminContext());
      const result = await caller.getCompanies();

      expect(result.map((c: any) => c.id)).toEqual(["c1", "c3"]);
      expect(result.every((c: any) => c.agency_id)).toBe(true);
    });

    it("still returns every agency's companies to an admin, not just one", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(null as any);
      vi.mocked(db.getAllCompanies).mockResolvedValue([
        { id: "c1", company_name: "A", agency_id: "ag-1" },
        { id: "c3", company_name: "B", agency_id: "ag-2" },
      ] as any);

      const caller = createCaller(adminContext());
      expect((await caller.getCompanies()).length).toBe(2);
    });

    it("refuses a non-admin with no agency rather than falling back to all", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(null as any);

      const caller = createCaller(agencyContext());
      await expect(caller.getCompanies()).rejects.toThrow(TRPCError);
      expect(db.getAllCompanies).not.toHaveBeenCalled();
    });

    it("scopes a normal agency user to its own companies", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue({ id: "ag-1" } as any);
      vi.mocked(db.getCompaniesByAgencyId).mockResolvedValue([{ id: "c1", agency_id: "ag-1" }] as any);

      const caller = createCaller(agencyContext());
      expect(await caller.getCompanies()).toHaveLength(1);
      expect(db.getCompaniesByAgencyId).toHaveBeenCalledWith("ag-1");
      expect(db.getAllCompanies).not.toHaveBeenCalled();
    });
  });
});
