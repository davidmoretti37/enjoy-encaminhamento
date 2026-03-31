import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock all external dependencies before importing router
vi.mock("../../supabase", () => ({
  supabase: { auth: { getUser: vi.fn() } },
  supabaseAdmin: {
    from: vi.fn(),
    auth: { admin: { updateUserById: vi.fn() } },
  },
}));

vi.mock("../../db", () => ({
  getUserById: vi.fn(),
  createUserProfile: vi.fn(),
}));

vi.mock("../../_core/cookies", () => ({
  getSessionCookieOptions: vi.fn().mockReturnValue({ path: "/", httpOnly: true }),
}));

import { authRouter } from "../../routers/auth";
import { supabaseAdmin } from "../../supabase";
import * as db from "../../db";
import {
  candidateContext,
  companyContext,
  adminContext,
  unauthenticatedContext,
} from "../helpers/mock-context";
import { mockUser } from "../helpers/mock-data";

// Create a caller for testing
const createCaller = (ctx: any) => {
  // Use the router's createCaller method for direct procedure invocation
  return authRouter.createCaller(ctx);
};

describe("auth router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("me", () => {
    it("returns null for unauthenticated user", async () => {
      const caller = createCaller(unauthenticatedContext());
      const result = await caller.me();
      expect(result).toBeNull();
    });

    it("returns user for authenticated user", async () => {
      const ctx = candidateContext();
      const caller = createCaller(ctx);
      const result = await caller.me();
      expect(result).toEqual(ctx.user);
      expect(result!.role).toBe("candidate");
    });

    it("returns admin user data", async () => {
      const ctx = adminContext();
      const caller = createCaller(ctx);
      const result = await caller.me();
      expect(result!.role).toBe("admin");
    });
  });

  describe("logout", () => {
    it("returns success and clears cookies", async () => {
      const ctx = candidateContext();
      const clearCookieSpy = vi.fn();
      ctx.res.clearCookie = clearCookieSpy;

      const caller = createCaller(ctx);
      const result = await caller.logout();

      expect(result).toEqual({ success: true });
      expect(clearCookieSpy).toHaveBeenCalledTimes(3); // session, access, refresh
    });

    it("returns success even for unauthenticated users", async () => {
      const ctx = unauthenticatedContext();
      ctx.res.clearCookie = vi.fn();

      const caller = createCaller(ctx);
      const result = await caller.logout();
      expect(result).toEqual({ success: true });
    });
  });

  describe("createProfile", () => {
    it("returns existing profile if already exists", async () => {
      vi.mocked(db.getUserById).mockResolvedValue(mockUser("candidate") as any);

      const caller = createCaller(candidateContext());
      const result = await caller.createProfile({ name: "Test" });

      expect(result).toEqual({ success: true, existing: true });
      expect(db.createUserProfile).not.toHaveBeenCalled();
    });

    it("creates candidate profile when no invitation exists", async () => {
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

      const caller = createCaller(candidateContext());
      const result = await caller.createProfile({ name: "Maria" });

      expect(result).toEqual({ success: true, existing: false });
      expect(db.createUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "cc000000-0000-4000-8000-000000000002",
          role: "candidate",
          name: "Maria",
        })
      );
    });

    it("creates company profile when company invitation exists", async () => {
      vi.mocked(db.getUserById).mockResolvedValue(undefined as any);
      vi.mocked(db.createUserProfile).mockResolvedValue({ error: null } as any);

      // First call: company_invitations - returns an invitation
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
            companies: { id: "comp-1", agency_id: "agency-1" },
          },
          error: null,
        }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(companyInvChain as any);

      const caller = createCaller(companyContext({ email: "company@test.com" }));
      const result = await caller.createProfile({ name: "Company User" });

      expect(result).toEqual({ success: true, existing: false });
      expect(db.createUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "company",
          agency_id: "agency-1",
        })
      );
    });

    it("throws on profile creation failure", async () => {
      vi.mocked(db.getUserById).mockResolvedValue(undefined as any);
      vi.mocked(db.createUserProfile).mockResolvedValue({
        error: { message: "DB error" },
      } as any);

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(candidateContext());
      await expect(caller.createProfile({ name: "Test" })).rejects.toThrow(TRPCError);
    });
  });

  describe("changePassword", () => {
    it("changes password successfully", async () => {
      vi.mocked(supabaseAdmin.auth.admin.updateUserById).mockResolvedValue({
        data: {},
        error: null,
      } as any);

      const caller = createCaller(candidateContext());
      const result = await caller.changePassword({ newPassword: "newpass123" });

      expect(result).toEqual({ success: true });
      expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
        "cc000000-0000-4000-8000-000000000002",
        { password: "newpass123" }
      );
    });

    it("throws on password update failure", async () => {
      vi.mocked(supabaseAdmin.auth.admin.updateUserById).mockResolvedValue({
        data: null,
        error: { message: "weak password" },
      } as any);

      const caller = createCaller(candidateContext());
      await expect(
        caller.changePassword({ newPassword: "newpass123" })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects short passwords via Zod validation", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.changePassword({ newPassword: "short" })
      ).rejects.toThrow();
    });
  });
});
