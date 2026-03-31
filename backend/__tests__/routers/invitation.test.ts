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
  createAgencyInvitation: vi.fn(),
  getAgencyInvitationByToken: vi.fn(),
  acceptAgencyInvitation: vi.fn(),
  getAllAffiliates: vi.fn(),
}));

import { invitationRouter } from "../../routers/invitation";
import { supabaseAdmin } from "../../supabase";
import * as db from "../../db";
import {
  adminContext,
  agencyContext,
  candidateContext,
  companyContext,
  unauthenticatedContext,
} from "../helpers/mock-context";
import { MOCK_IDS } from "../helpers/mock-data";

const createCaller = (ctx: any) => invitationRouter.createCaller(ctx);

const validToken = "a0000000-0000-4000-8000-000000000099";
const validAffiliateId = MOCK_IDS.agency;

describe("invitation router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- create ----
  describe("create", () => {
    it("creates an invitation for admin", async () => {
      const created = { id: "inv-1", token: validToken, email: "new@test.com" };
      vi.mocked(db.createAgencyInvitation).mockResolvedValue(created as any);

      const caller = createCaller(adminContext());
      const result = await caller.create({
        email: "new@test.com",
        affiliateId: validAffiliateId,
      });
      expect(result).toEqual(created);
      expect(db.createAgencyInvitation).toHaveBeenCalledWith(
        "new@test.com",
        validAffiliateId,
        "aa000000-0000-4000-8000-000000000001",
        undefined
      );
    });

    it("passes notes when provided", async () => {
      vi.mocked(db.createAgencyInvitation).mockResolvedValue({} as any);

      const caller = createCaller(adminContext());
      await caller.create({
        email: "new@test.com",
        affiliateId: validAffiliateId,
        notes: "Priority agency",
      });
      expect(db.createAgencyInvitation).toHaveBeenCalledWith(
        "new@test.com",
        validAffiliateId,
        "aa000000-0000-4000-8000-000000000001",
        "Priority agency"
      );
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.create({ email: "new@test.com", affiliateId: validAffiliateId })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects company users", async () => {
      const caller = createCaller(companyContext());
      await expect(
        caller.create({ email: "new@test.com", affiliateId: validAffiliateId })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated users", async () => {
      const caller = createCaller(unauthenticatedContext());
      await expect(
        caller.create({ email: "new@test.com", affiliateId: validAffiliateId })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects invalid email", async () => {
      const caller = createCaller(adminContext());
      await expect(
        caller.create({ email: "not-an-email", affiliateId: validAffiliateId })
      ).rejects.toThrow();
    });
  });

  // ---- validate ----
  describe("validate", () => {
    it("returns valid for a pending, non-expired invitation", async () => {
      vi.mocked(db.getAgencyInvitationByToken).mockResolvedValue({
        id: "inv-1",
        status: "pending",
        email: "agency@test.com",
        expires_at: new Date(Date.now() + 86400000).toISOString(), // +1 day
        affiliates: { name: "ANEC" },
      } as any);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.validate({ token: validToken });
      expect(result).toEqual({
        valid: true,
        email: "agency@test.com",
        affiliateName: "ANEC",
      });
    });

    it("returns invalid when invitation not found", async () => {
      vi.mocked(db.getAgencyInvitationByToken).mockResolvedValue(null as any);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.validate({ token: validToken });
      expect(result).toEqual({ valid: false });
    });

    it("returns invalid when invitation already accepted", async () => {
      vi.mocked(db.getAgencyInvitationByToken).mockResolvedValue({
        id: "inv-1",
        status: "accepted",
        email: "agency@test.com",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      } as any);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.validate({ token: validToken });
      expect(result).toEqual({ valid: false });
    });

    it("returns invalid when invitation expired", async () => {
      vi.mocked(db.getAgencyInvitationByToken).mockResolvedValue({
        id: "inv-1",
        status: "pending",
        email: "agency@test.com",
        expires_at: new Date(Date.now() - 86400000).toISOString(), // -1 day
      } as any);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.validate({ token: validToken });
      expect(result).toEqual({ valid: false });
    });

    it("returns affiliateName as null when affiliate has no name", async () => {
      vi.mocked(db.getAgencyInvitationByToken).mockResolvedValue({
        id: "inv-1",
        status: "pending",
        email: "agency@test.com",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        affiliates: null,
      } as any);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.validate({ token: validToken });
      expect(result.valid).toBe(true);
      expect((result as any).affiliateName).toBeNull();
    });
  });

  // ---- acceptWithPassword ----
  describe("acceptWithPassword", () => {
    it("accepts invitation and creates account", async () => {
      vi.mocked(db.acceptAgencyInvitation).mockResolvedValue({
        user: { email: "agency@test.com" },
      } as any);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.acceptWithPassword({
        token: validToken,
        password: "securePass123",
        agencyData: {
          agency_name: "Nova Agencia",
          cnpj: "12345678000199",
          email: "nova@agencia.com",
        },
      });
      expect(result).toEqual({ success: true, email: "agency@test.com" });
      expect(db.acceptAgencyInvitation).toHaveBeenCalledWith(
        validToken,
        "securePass123",
        expect.objectContaining({
          agency_name: "Nova Agencia",
          cnpj: "12345678000199",
          email: "nova@agencia.com",
        })
      );
    });

    it("rejects short password", async () => {
      const caller = createCaller(unauthenticatedContext());
      await expect(
        caller.acceptWithPassword({
          token: validToken,
          password: "short",
          agencyData: {
            agency_name: "Nova Agencia",
            cnpj: "12345678000199",
            email: "nova@agencia.com",
          },
        })
      ).rejects.toThrow();
    });

    it("rejects missing agency_name", async () => {
      const caller = createCaller(unauthenticatedContext());
      await expect(
        caller.acceptWithPassword({
          token: validToken,
          password: "securePass123",
          agencyData: {
            agency_name: "",
            cnpj: "12345678000199",
            email: "nova@agencia.com",
          },
        })
      ).rejects.toThrow();
    });
  });

  // ---- accept (authenticated legacy) ----
  describe("accept", () => {
    it("accepts invitation for authenticated user", async () => {
      vi.mocked(db.getAgencyInvitationByToken).mockResolvedValue({
        id: "inv-1",
        status: "pending",
        affiliate_id: "aff-1",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      } as any);

      // Mock supabaseAdmin.from chain for insert/update
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "new-agency-id" },
          error: null,
        }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(candidateContext());
      const result = await caller.accept({
        token: validToken,
        agencyData: {
          agency_name: "Nova Agencia",
          cnpj: "12345678000199",
          email: "nova@agencia.com",
        },
      });
      expect(result).toEqual({ success: true });
    });

    it("throws when invitation not found", async () => {
      vi.mocked(db.getAgencyInvitationByToken).mockResolvedValue(null as any);

      const caller = createCaller(candidateContext());
      await expect(
        caller.accept({
          token: validToken,
          agencyData: {
            agency_name: "Test",
            cnpj: "12345678000199",
            email: "test@test.com",
          },
        })
      ).rejects.toThrow("Invitation not found");
    });

    it("throws when invitation already used", async () => {
      vi.mocked(db.getAgencyInvitationByToken).mockResolvedValue({
        id: "inv-1",
        status: "accepted",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      } as any);

      const caller = createCaller(candidateContext());
      await expect(
        caller.accept({
          token: validToken,
          agencyData: {
            agency_name: "Test",
            cnpj: "12345678000199",
            email: "test@test.com",
          },
        })
      ).rejects.toThrow("Invitation already used");
    });

    it("throws when invitation expired", async () => {
      vi.mocked(db.getAgencyInvitationByToken).mockResolvedValue({
        id: "inv-1",
        status: "pending",
        expires_at: new Date(Date.now() - 86400000).toISOString(),
      } as any);

      const caller = createCaller(candidateContext());
      await expect(
        caller.accept({
          token: validToken,
          agencyData: {
            agency_name: "Test",
            cnpj: "12345678000199",
            email: "test@test.com",
          },
        })
      ).rejects.toThrow("Invitation expired");
    });

    it("throws on agency insert error", async () => {
      vi.mocked(db.getAgencyInvitationByToken).mockResolvedValue({
        id: "inv-1",
        status: "pending",
        affiliate_id: "aff-1",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      } as any);

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Duplicate CNPJ" },
        }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(candidateContext());
      await expect(
        caller.accept({
          token: validToken,
          agencyData: {
            agency_name: "Test",
            cnpj: "12345678000199",
            email: "test@test.com",
          },
        })
      ).rejects.toThrow("Duplicate CNPJ");
    });

    it("rejects unauthenticated users", async () => {
      const caller = createCaller(unauthenticatedContext());
      await expect(
        caller.accept({
          token: validToken,
          agencyData: {
            agency_name: "Test",
            cnpj: "12345678000199",
            email: "test@test.com",
          },
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ---- list ----
  describe("list", () => {
    it("returns empty array for admin (TODO)", async () => {
      const caller = createCaller(adminContext());
      const result = await caller.list();
      expect(result).toEqual([]);
    });

    it("rejects non-admin users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.list()).rejects.toThrow(TRPCError);
    });
  });

  // ---- revoke ----
  describe("revoke", () => {
    it("returns success for admin (TODO)", async () => {
      const caller = createCaller(adminContext());
      const result = await caller.revoke({ token: validToken });
      expect(result).toEqual({ success: true });
    });

    it("rejects non-admin users", async () => {
      const caller = createCaller(agencyContext());
      await expect(caller.revoke({ token: validToken })).rejects.toThrow(TRPCError);
    });
  });

  // ---- getAffiliates ----
  describe("getAffiliates", () => {
    it("returns affiliates for admin", async () => {
      const affiliates = [{ id: "aff-1", name: "ANEC" }];
      vi.mocked(db.getAllAffiliates).mockResolvedValue(affiliates as any);

      const caller = createCaller(adminContext());
      const result = await caller.getAffiliates();
      expect(result).toEqual(affiliates);
    });

    it("rejects non-admin users", async () => {
      const caller = createCaller(companyContext());
      await expect(caller.getAffiliates()).rejects.toThrow(TRPCError);
    });
  });
});
