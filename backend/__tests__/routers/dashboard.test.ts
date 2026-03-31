import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock external dependencies before imports
vi.mock("../../supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: { admin: { updateUserById: vi.fn() } },
  },
}));

vi.mock("../../db", () => ({
  getDashboardStats: vi.fn(),
  getCompanyByUserId: vi.fn(),
  getJobsByCompanyId: vi.fn(),
  getContractsByCompanyId: vi.fn(),
  getCandidateByUserId: vi.fn(),
  getApplicationsByCandidateId: vi.fn(),
  getContractsByCandidateId: vi.fn(),
}));

import { dashboardRouter } from "../../routers/dashboard";
import * as db from "../../db";
import {
  adminContext,
  agencyContext,
  candidateContext,
  companyContext,
  unauthenticatedContext,
} from "../helpers/mock-context";
import { MOCK_IDS, mockCompany, mockCandidate } from "../helpers/mock-data";

const createCaller = (ctx: any) => dashboardRouter.createCaller(ctx);

describe("dashboard router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- getStats (admin only) ----
  describe("getStats", () => {
    it("returns dashboard stats for admin", async () => {
      const stats = { totalUsers: 100, totalCompanies: 20, totalCandidates: 50 };
      vi.mocked(db.getDashboardStats).mockResolvedValue(stats as any);

      const caller = createCaller(adminContext());
      const result = await caller.getStats();
      expect(result).toEqual(stats);
      expect(db.getDashboardStats).toHaveBeenCalledOnce();
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.getStats()).rejects.toThrow(TRPCError);
    });

    it("rejects company users", async () => {
      const caller = createCaller(companyContext());
      await expect(caller.getStats()).rejects.toThrow(TRPCError);
    });

    it("rejects agency users", async () => {
      const caller = createCaller(agencyContext());
      await expect(caller.getStats()).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated users", async () => {
      const caller = createCaller(unauthenticatedContext());
      await expect(caller.getStats()).rejects.toThrow(TRPCError);
    });
  });

  // ---- getCompanyStats (company only) ----
  describe("getCompanyStats", () => {
    it("returns company stats for company user", async () => {
      const company = mockCompany();
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(company as any);
      vi.mocked(db.getJobsByCompanyId).mockResolvedValue([
        { id: "j1", status: "open" },
        { id: "j2", status: "closed" },
        { id: "j3", status: "open" },
      ] as any);
      vi.mocked(db.getContractsByCompanyId).mockResolvedValue([
        { id: "c1", status: "active" },
        { id: "c2", status: "terminated" },
      ] as any);

      const caller = createCaller(companyContext());
      const result = await caller.getCompanyStats();
      expect(result).toEqual({
        totalJobs: 3,
        openJobs: 2,
        activeContracts: 1,
        totalContracts: 2,
      });
    });

    it("returns null when company not found", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(null as any);

      const caller = createCaller(companyContext());
      const result = await caller.getCompanyStats();
      expect(result).toBeNull();
    });

    it("allows admin users", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(null as any);

      const caller = createCaller(adminContext());
      const result = await caller.getCompanyStats();
      expect(result).toBeNull();
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.getCompanyStats()).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated users", async () => {
      const caller = createCaller(unauthenticatedContext());
      await expect(caller.getCompanyStats()).rejects.toThrow(TRPCError);
    });
  });

  // ---- getCandidateStats (candidate only) ----
  describe("getCandidateStats", () => {
    it("returns candidate stats for candidate user", async () => {
      const candidate = mockCandidate();
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(candidate as any);
      vi.mocked(db.getApplicationsByCandidateId).mockResolvedValue([
        { id: "a1", status: "applied" },
        { id: "a2", status: "screening" },
        { id: "a3", status: "applied" },
      ] as any);
      vi.mocked(db.getContractsByCandidateId).mockResolvedValue([
        { id: "c1", status: "active" },
        { id: "c2", status: "completed" },
        { id: "c3", status: "active" },
      ] as any);

      const caller = createCaller(candidateContext());
      const result = await caller.getCandidateStats();
      expect(result).toEqual({
        totalApplications: 3,
        pendingApplications: 2,
        activeContracts: 2,
        totalContracts: 3,
      });
    });

    it("returns null when candidate not found", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(null as any);

      const caller = createCaller(candidateContext());
      const result = await caller.getCandidateStats();
      expect(result).toBeNull();
    });

    it("allows admin users", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(null as any);

      const caller = createCaller(adminContext());
      const result = await caller.getCandidateStats();
      expect(result).toBeNull();
    });

    it("rejects company users", async () => {
      const caller = createCaller(companyContext());
      await expect(caller.getCandidateStats()).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated users", async () => {
      const caller = createCaller(unauthenticatedContext());
      await expect(caller.getCandidateStats()).rejects.toThrow(TRPCError);
    });

    it("handles zero applications and contracts", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.getApplicationsByCandidateId).mockResolvedValue([] as any);
      vi.mocked(db.getContractsByCandidateId).mockResolvedValue([] as any);

      const caller = createCaller(candidateContext());
      const result = await caller.getCandidateStats();
      expect(result).toEqual({
        totalApplications: 0,
        pendingApplications: 0,
        activeContracts: 0,
        totalContracts: 0,
      });
    });
  });
});
