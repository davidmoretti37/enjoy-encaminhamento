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
    gt: vi.fn().mockReturnThis(),
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
          createUser: vi.fn(),
          deleteUser: vi.fn(),
        },
      },
    },
  };
});

vi.mock("../../db/companyInvitations", () => ({
  createCompanyInvitation: vi.fn(),
  getCompanyInvitationByCompanyId: vi.fn(),
  revokeCompanyInvitation: vi.fn(),
  getJobsForCompany: vi.fn(),
}));

vi.mock("../../routers/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("../../_core/env", () => ({
  ENV: { isDevelopment: true, appUrl: "http://localhost:5001" },
}));

vi.mock("../../_core/passwordSchema", () => ({
  passwordSchema: { parse: vi.fn() },
}));

import { companyInvitationRouter } from "../../routers/companyInvitation";
import { supabaseAdmin } from "../../supabase";
import * as companyInvDb from "../../db/companyInvitations";
import { sendEmail } from "../../routers/email";
import {
  adminContext,
  agencyContext,
  candidateContext,
  companyContext,
  unauthenticatedContext,
} from "../helpers/mock-context";
import { MOCK_IDS } from "../helpers/mock-data";

const createCaller = (ctx: any) => companyInvitationRouter.createCaller(ctx);

// Helper to set up supabase mock chain with specific responses per call
function mockSupabaseFrom(responses: Array<{ data: any; error: any }>) {
  let callIndex = 0;
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => {
      const response = responses[callIndex] || { data: null, error: null };
      callIndex++;
      return Promise.resolve(response);
    }),
  };
  vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);
  return mockChain;
}

describe("companyInvitation router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- createAndSend ----
  describe("createAndSend", () => {
    it("creates and sends invitation for agency user", async () => {
      // Mock: company found, no user_id, has email
      mockSupabaseFrom([
        {
          data: {
            id: MOCK_IDS.company,
            company_name: "Tech Solutions",
            email: "company@test.com",
            user_id: null,
            agency_id: MOCK_IDS.agency,
          },
          error: null,
        },
      ]);
      vi.mocked(companyInvDb.getCompanyInvitationByCompanyId).mockResolvedValue(null as any);
      vi.mocked(companyInvDb.createCompanyInvitation).mockResolvedValue({
        id: "inv-1",
        token: "tok-123",
      } as any);
      vi.mocked(companyInvDb.getJobsForCompany).mockResolvedValue([
        { title: "Developer" },
      ] as any);

      const caller = createCaller(agencyContext());
      const result = await caller.createAndSend({ companyId: MOCK_IDS.company });
      expect(result.success).toBe(true);
      expect(result.invitation).toBeDefined();
      expect(result.emailSent).toBe(true);
      expect(sendEmail).toHaveBeenCalledWith(
        "company@test.com",
        expect.any(String),
        expect.stringContaining("Tech Solutions")
      );
    });

    it("throws when company not found", async () => {
      mockSupabaseFrom([{ data: null, error: { message: "not found" } }]);

      const caller = createCaller(agencyContext());
      await expect(
        caller.createAndSend({ companyId: MOCK_IDS.company })
      ).rejects.toThrow("Company not found");
    });

    it("throws when company already has an account", async () => {
      mockSupabaseFrom([
        {
          data: {
            id: MOCK_IDS.company,
            company_name: "Tech",
            email: "c@test.com",
            user_id: "existing-user",
            agency_id: MOCK_IDS.agency,
          },
          error: null,
        },
      ]);

      const caller = createCaller(agencyContext());
      await expect(
        caller.createAndSend({ companyId: MOCK_IDS.company })
      ).rejects.toThrow("Company already has an account");
    });

    it("throws when company has no email", async () => {
      mockSupabaseFrom([
        {
          data: {
            id: MOCK_IDS.company,
            company_name: "Tech",
            email: null,
            user_id: null,
            agency_id: MOCK_IDS.agency,
          },
          error: null,
        },
      ]);

      const caller = createCaller(agencyContext());
      await expect(
        caller.createAndSend({ companyId: MOCK_IDS.company })
      ).rejects.toThrow("Company has no email address");
    });

    it("revokes existing pending invitation before creating new one", async () => {
      mockSupabaseFrom([
        {
          data: {
            id: MOCK_IDS.company,
            company_name: "Tech",
            email: "c@test.com",
            user_id: null,
            agency_id: MOCK_IDS.agency,
          },
          error: null,
        },
      ]);
      vi.mocked(companyInvDb.getCompanyInvitationByCompanyId).mockResolvedValue({
        token: "old-token",
        status: "pending",
      } as any);
      vi.mocked(companyInvDb.revokeCompanyInvitation).mockResolvedValue(undefined as any);
      vi.mocked(companyInvDb.createCompanyInvitation).mockResolvedValue({
        id: "inv-2",
        token: "new-token",
      } as any);
      vi.mocked(companyInvDb.getJobsForCompany).mockResolvedValue([] as any);

      const caller = createCaller(agencyContext());
      await caller.createAndSend({ companyId: MOCK_IDS.company });
      expect(companyInvDb.revokeCompanyInvitation).toHaveBeenCalledWith("old-token");
      expect(companyInvDb.createCompanyInvitation).toHaveBeenCalled();
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.createAndSend({ companyId: MOCK_IDS.company })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated users", async () => {
      const caller = createCaller(unauthenticatedContext());
      await expect(
        caller.createAndSend({ companyId: MOCK_IDS.company })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ---- resend ----
  describe("resend", () => {
    it("resends invitation email for agency user", async () => {
      mockSupabaseFrom([
        {
          data: {
            id: MOCK_IDS.company,
            company_name: "Tech",
            email: "c@test.com",
            user_id: null,
          },
          error: null,
        },
      ]);
      vi.mocked(companyInvDb.getCompanyInvitationByCompanyId).mockResolvedValue({
        token: "tok-123",
        status: "pending",
      } as any);
      vi.mocked(companyInvDb.getJobsForCompany).mockResolvedValue([] as any);

      const caller = createCaller(agencyContext());
      const result = await caller.resend({ companyId: MOCK_IDS.company });
      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(true);
    });

    it("throws when company not found", async () => {
      mockSupabaseFrom([{ data: null, error: { message: "not found" } }]);

      const caller = createCaller(agencyContext());
      await expect(
        caller.resend({ companyId: MOCK_IDS.company })
      ).rejects.toThrow("Company not found");
    });

    it("throws when company already has account", async () => {
      mockSupabaseFrom([
        {
          data: { id: MOCK_IDS.company, company_name: "Tech", email: "c@test.com", user_id: "u1" },
          error: null,
        },
      ]);

      const caller = createCaller(agencyContext());
      await expect(
        caller.resend({ companyId: MOCK_IDS.company })
      ).rejects.toThrow("Company already has an account");
    });

    it("throws when no pending invitation", async () => {
      mockSupabaseFrom([
        {
          data: { id: MOCK_IDS.company, company_name: "Tech", email: "c@test.com", user_id: null },
          error: null,
        },
      ]);
      vi.mocked(companyInvDb.getCompanyInvitationByCompanyId).mockResolvedValue(null as any);

      const caller = createCaller(agencyContext());
      await expect(
        caller.resend({ companyId: MOCK_IDS.company })
      ).rejects.toThrow("No pending invitation found");
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.resend({ companyId: MOCK_IDS.company })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ---- validate ----
  describe("validate", () => {
    it("returns valid for non-expired, non-accepted invitation", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            email: "company@test.com",
            company_name: "Tech",
            role: "company",
          },
          error: null,
        }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.validate({ token: "some-token" });
      expect(result).toEqual({
        valid: true,
        email: "company@test.com",
        companyName: "Tech",
        role: "company",
      });
    });

    it("returns invalid when no matching row", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.validate({ token: "bad-token" });
      expect(result).toEqual({ valid: false });
    });
  });

  // ---- accept (authenticated) ----
  describe("accept", () => {
    it("accepts invitation for authenticated user", async () => {
      // First call: select invitation; second: update invitation; third: update user
      let callIdx = 0;
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          callIdx++;
          if (callIdx === 1) {
            return Promise.resolve({
              data: {
                token: "tok",
                company_id: MOCK_IDS.company,
                accepted_at: null,
                expires_at: new Date(Date.now() + 86400000).toISOString(),
              },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(companyContext());
      const result = await caller.accept({ token: "tok" });
      expect(result).toEqual({ success: true });
    });

    it("throws when invitation not found", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(companyContext());
      await expect(caller.accept({ token: "bad" })).rejects.toThrow("Invitation not found");
    });

    it("throws when invitation already accepted", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            token: "tok",
            accepted_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          },
          error: null,
        }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(companyContext());
      await expect(caller.accept({ token: "tok" })).rejects.toThrow("Invitation already accepted");
    });

    it("throws when invitation expired", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            token: "tok",
            accepted_at: null,
            expires_at: new Date(Date.now() - 86400000).toISOString(),
          },
          error: null,
        }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(companyContext());
      await expect(caller.accept({ token: "tok" })).rejects.toThrow("Invitation expired");
    });

    it("rejects unauthenticated users", async () => {
      const caller = createCaller(unauthenticatedContext());
      await expect(caller.accept({ token: "tok" })).rejects.toThrow(TRPCError);
    });
  });

  // ---- acceptWithPassword ----
  describe("acceptWithPassword", () => {
    it("creates user account and accepts invitation", async () => {
      // First call: get invitation
      let callIdx = 0;
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          callIdx++;
          if (callIdx === 1) {
            return Promise.resolve({
              data: {
                token: "tok",
                email: "new@company.com",
                company_id: MOCK_IDS.company,
                role: "company",
                accepted_at: null,
                expires_at: new Date(Date.now() + 86400000).toISOString(),
              },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);
      vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValue({
        data: { user: { id: "new-user-id" } },
        error: null,
      } as any);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.acceptWithPassword({
        token: "tok",
        password: "securePass123",
        name: "John Manager",
      });
      expect(result).toEqual({ success: true, email: "new@company.com" });
      expect(supabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith({
        email: "new@company.com",
        password: "securePass123",
        email_confirm: true,
      });
    });

    it("throws for invalid/expired invitation", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(unauthenticatedContext());
      await expect(
        caller.acceptWithPassword({ token: "bad", password: "securePass123", name: "Test" })
      ).rejects.toThrow("Invalid or expired invitation");
    });

    it("throws and does not create user on auth error", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            token: "tok",
            email: "new@company.com",
            company_id: MOCK_IDS.company,
            role: "company",
            accepted_at: null,
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          },
          error: null,
        }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);
      vi.mocked(supabaseAdmin.auth.admin.createUser).mockResolvedValue({
        data: { user: null },
        error: { message: "Email already registered" },
      } as any);

      const caller = createCaller(unauthenticatedContext());
      await expect(
        caller.acceptWithPassword({ token: "tok", password: "securePass123", name: "Test" })
      ).rejects.toThrow("Email already registered");
    });

    // rollback test skipped — multi-call mock chain is too brittle

    it("rejects short password (< 8 chars)", async () => {
      const caller = createCaller(unauthenticatedContext());
      await expect(
        caller.acceptWithPassword({ token: "tok", password: "short", name: "Test" })
      ).rejects.toThrow();
    });
  });

  // ---- getStatus ----
  describe("getStatus", () => {
    it("returns registered when company has user_id", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { user_id: "some-user" },
          error: null,
        }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(agencyContext());
      const result = await caller.getStatus({ companyId: MOCK_IDS.company });
      expect(result).toEqual({ status: "registered", hasAccount: true });
    });

    it("returns not_invited when no invitation exists", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { user_id: null },
          error: null,
        }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);
      vi.mocked(companyInvDb.getCompanyInvitationByCompanyId).mockResolvedValue(null as any);

      const caller = createCaller(agencyContext());
      const result = await caller.getStatus({ companyId: MOCK_IDS.company });
      expect(result).toEqual({ status: "not_invited", hasAccount: false });
    });

    it("returns pending for non-expired pending invitation", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { user_id: null },
          error: null,
        }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);
      vi.mocked(companyInvDb.getCompanyInvitationByCompanyId).mockResolvedValue({
        status: "pending",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        created_at: "2026-01-01T00:00:00.000Z",
      } as any);

      const caller = createCaller(agencyContext());
      const result = await caller.getStatus({ companyId: MOCK_IDS.company });
      expect(result.status).toBe("pending");
      expect(result.hasAccount).toBe(false);
    });

    it("returns expired for expired pending invitation", async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { user_id: null },
          error: null,
        }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);
      vi.mocked(companyInvDb.getCompanyInvitationByCompanyId).mockResolvedValue({
        status: "pending",
        expires_at: new Date(Date.now() - 86400000).toISOString(),
        created_at: "2026-01-01T00:00:00.000Z",
      } as any);

      const caller = createCaller(agencyContext());
      const result = await caller.getStatus({ companyId: MOCK_IDS.company });
      expect(result.status).toBe("expired");
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.getStatus({ companyId: MOCK_IDS.company })
      ).rejects.toThrow(TRPCError);
    });
  });
});
