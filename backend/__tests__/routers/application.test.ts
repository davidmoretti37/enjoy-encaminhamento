import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock external dependencies
vi.mock("../../supabase", () => ({
  supabase: { auth: { getUser: vi.fn() } },
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

vi.mock("../../db", () => ({
  getCandidateByUserId: vi.fn(),
  getApplicationsByCandidateId: vi.fn(),
  createApplication: vi.fn(),
  updateApplication: vi.fn(),
  getApplicationById: vi.fn(),
  getApplicationsByJobId: vi.fn(),
  getJobById: vi.fn(),
  getCompanyByUserId: vi.fn(),
  getAgencyByUserId: vi.fn(),
  getAgencyById: vi.fn(),
}));

vi.mock("../../db/hiring", () => ({
  getHiringProcessByApplication: vi.fn(),
}));

vi.mock("../../db/batches", () => ({
  getBatchesByCandidateId: vi.fn().mockResolvedValue([]),
}));

import { applicationRouter } from "../../routers/application";
import * as db from "../../db";
import * as hiringDb from "../../db/hiring";
import { supabaseAdmin } from "../../supabase";
import {
  candidateContext,
  companyContext,
  adminContext,
  agencyContext,
  unauthenticatedContext,
} from "../helpers/mock-context";
import {
  mockCandidate,
  mockApplication,
  mockJob,
  mockCompany,
  mockAgency,
  MOCK_IDS,
} from "../helpers/mock-data";

const createCaller = (ctx: any) => applicationRouter.createCaller(ctx);

describe("application router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset supabaseAdmin.from mock for getByCandidate's interview query
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: (resolve: any) => resolve({ data: [], error: null }),
    } as any);
  });

  describe("create", () => {
    it("creates application successfully", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.getJobById).mockResolvedValue(mockJob({ status: "open" }) as any);
      vi.mocked(db.getApplicationsByCandidateId).mockResolvedValue([]);
      vi.mocked(db.createApplication).mockResolvedValue(MOCK_IDS.application);

      const caller = createCaller(candidateContext());
      const result = await caller.create({ job_id: MOCK_IDS.job });

      expect(result.applicationId).toBe(MOCK_IDS.application);
      expect(db.createApplication).toHaveBeenCalledWith({
        job_id: MOCK_IDS.job,
        candidate_id: MOCK_IDS.candidate,
      });
    });

    it("rejects duplicate applications", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.getJobById).mockResolvedValue(mockJob({ status: "open" }) as any);
      vi.mocked(db.getApplicationsByCandidateId).mockResolvedValue([
        mockApplication() as any,
      ]);

      const caller = createCaller(candidateContext());
      await expect(caller.create({ job_id: MOCK_IDS.job })).rejects.toThrow(
        "already applied"
      );
    });

    it("throws when candidate profile not found", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(undefined);

      const caller = createCaller(candidateContext());
      await expect(caller.create({ job_id: MOCK_IDS.job })).rejects.toThrow(
        "Candidate profile not found"
      );
    });

    it("rejects non-candidate users", async () => {
      const caller = createCaller(companyContext());
      await expect(caller.create({ job_id: MOCK_IDS.job })).rejects.toThrow(
        "Candidate access required"
      );
    });

    it("validates job_id is a UUID", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.create({ job_id: "not-a-uuid" })).rejects.toThrow();
    });

    // FIXED: Now checks that the job exists and is open
    it("rejects application to non-existent job", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.getJobById).mockResolvedValue(undefined as any);

      const caller = createCaller(candidateContext());
      await expect(
        caller.create({ job_id: "00000000-0000-4000-8000-000000000099" })
      ).rejects.toThrow("Job not found");
    });

    it("rejects application to closed job", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.getJobById).mockResolvedValue(mockJob({ status: "closed" }) as any);

      const caller = createCaller(candidateContext());
      await expect(
        caller.create({ job_id: MOCK_IDS.job })
      ).rejects.toThrow("no longer accepting applications");
    });

    it("rejects application to filled job", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.getJobById).mockResolvedValue(mockJob({ status: "filled" }) as any);

      const caller = createCaller(candidateContext());
      await expect(
        caller.create({ job_id: MOCK_IDS.job })
      ).rejects.toThrow("no longer accepting applications");
    });
  });

  describe("getByCandidate", () => {
    it("returns empty array when no candidate profile", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(undefined);

      const caller = createCaller(candidateContext());
      const result = await caller.getByCandidate();
      expect(result).toEqual([]);
    });

    it("returns applications with job data and strips company info", async () => {
      const appWithJob = {
        ...mockApplication(),
        jobs: {
          ...mockJob(),
          companies: { company_name: "Secret Company" },
        },
      };
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.getApplicationsByCandidateId).mockResolvedValue([appWithJob as any]);
      vi.mocked(hiringDb.getHiringProcessByApplication).mockResolvedValue(null as any);

      const caller = createCaller(candidateContext());
      const result = await caller.getByCandidate();

      expect(result).toHaveLength(1);
      expect(result[0].job).toBeTruthy();
      // Company info should be stripped (ANEC is middleman)
      expect(result[0].job.companies).toBeUndefined();
      expect(result[0].job.company_id).toBeUndefined();
      expect(result[0].source).toBe("application");
    });

    it("auto-fixes status from interviewed to selected when hiring process exists", async () => {
      const app = mockApplication({ status: "interviewed" });
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.getApplicationsByCandidateId).mockResolvedValue([
        { ...app, jobs: mockJob() } as any,
      ]);
      vi.mocked(hiringDb.getHiringProcessByApplication).mockResolvedValue({
        id: "hp-1",
      } as any);
      vi.mocked(db.updateApplication).mockResolvedValue(undefined);

      const caller = createCaller(candidateContext());
      const result = await caller.getByCandidate();

      expect(db.updateApplication).toHaveBeenCalledWith(MOCK_IDS.application, {
        status: "selected",
      });
      expect(result[0].status).toBe("selected");
    });
  });

  describe("getByJob", () => {
    it("allows admin full access", async () => {
      vi.mocked(db.getJobById).mockResolvedValue(mockJob() as any);
      vi.mocked(db.getApplicationsByJobId).mockResolvedValue([]);

      const caller = createCaller(adminContext());
      const result = await caller.getByJob({ jobId: MOCK_IDS.job });
      expect(result).toEqual([]);
    });

    it("allows company that owns the job", async () => {
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ company_id: MOCK_IDS.company }) as any
      );
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getApplicationsByJobId).mockResolvedValue([]);

      const caller = createCaller(companyContext());
      const result = await caller.getByJob({ jobId: MOCK_IDS.job });
      expect(result).toEqual([]);
    });

    it("rejects company that doesn't own the job", async () => {
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ company_id: "other-company-id" }) as any
      );
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);

      const caller = createCaller(companyContext());
      await expect(caller.getByJob({ jobId: MOCK_IDS.job })).rejects.toThrow(
        "FORBIDDEN"
      );
    });

    it("allows agency that owns the job", async () => {
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ agency_id: MOCK_IDS.agency }) as any
      );
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.getApplicationsByJobId).mockResolvedValue([]);

      const caller = createCaller(agencyContext());
      const result = await caller.getByJob({ jobId: MOCK_IDS.job });
      expect(result).toEqual([]);
    });

    it("rejects agency that doesn't own the job", async () => {
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ agency_id: "other-agency-id" }) as any
      );
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);

      const caller = createCaller(agencyContext());
      await expect(caller.getByJob({ jobId: MOCK_IDS.job })).rejects.toThrow(
        "FORBIDDEN"
      );
    });

    it("throws NOT_FOUND for non-existent job", async () => {
      vi.mocked(db.getJobById).mockResolvedValue(undefined as any);

      const caller = createCaller(adminContext());
      await expect(caller.getByJob({ jobId: MOCK_IDS.job })).rejects.toThrow(
        "NOT_FOUND"
      );
    });

    it("rejects candidate users", async () => {
      vi.mocked(db.getJobById).mockResolvedValue(mockJob() as any);

      const caller = createCaller(candidateContext());
      await expect(caller.getByJob({ jobId: MOCK_IDS.job })).rejects.toThrow(
        "FORBIDDEN"
      );
    });
  });

  describe("updateStatus", () => {
    it("admin can update any application", async () => {
      vi.mocked(db.updateApplication).mockResolvedValue(undefined);

      const caller = createCaller(adminContext());
      const result = await caller.updateStatus({
        id: MOCK_IDS.application,
        status: "screening",
      });
      expect(result).toEqual({ success: true });
      expect(db.updateApplication).toHaveBeenCalledWith(MOCK_IDS.application, {
        status: "screening",
      });
    });

    it("company can update application for their job", async () => {
      vi.mocked(db.getApplicationById).mockResolvedValue(mockApplication() as any);
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ company_id: MOCK_IDS.company }) as any
      );
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.updateApplication).mockResolvedValue(undefined);

      const caller = createCaller(companyContext());
      const result = await caller.updateStatus({
        id: MOCK_IDS.application,
        status: "interview-scheduled",
      });
      expect(result).toEqual({ success: true });
    });

    it("rejects invalid status values", async () => {
      const caller = createCaller(adminContext());
      await expect(
        caller.updateStatus({
          id: MOCK_IDS.application,
          status: "invalid-status" as any,
        })
      ).rejects.toThrow();
    });

    it("rejects candidate users", async () => {
      vi.mocked(db.getApplicationById).mockResolvedValue(mockApplication() as any);
      vi.mocked(db.getJobById).mockResolvedValue(mockJob() as any);

      const caller = createCaller(candidateContext());
      await expect(
        caller.updateStatus({ id: MOCK_IDS.application, status: "selected" })
      ).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("joinMeeting", () => {
    it("records meeting join timestamp", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.getApplicationsByCandidateId).mockResolvedValue([
        mockApplication() as any,
      ]);
      vi.mocked(db.updateApplication).mockResolvedValue(undefined);

      const caller = createCaller(candidateContext());
      const result = await caller.joinMeeting({
        applicationId: MOCK_IDS.application,
      });
      expect(result).toEqual({ success: true });
      expect(db.updateApplication).toHaveBeenCalledWith(MOCK_IDS.application, {
        interview_date: expect.any(String),
      });
    });

    it("does not overwrite existing meeting timestamp", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.getApplicationsByCandidateId).mockResolvedValue([
        mockApplication({ interview_date: "2026-03-01T10:00:00Z" }) as any,
      ]);

      const caller = createCaller(candidateContext());
      const result = await caller.joinMeeting({
        applicationId: MOCK_IDS.application,
      });
      expect(result).toEqual({ success: true });
      expect(db.updateApplication).not.toHaveBeenCalled();
    });

    it("rejects when application doesn't belong to candidate", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.getApplicationsByCandidateId).mockResolvedValue([]);

      const caller = createCaller(candidateContext());
      await expect(
        caller.joinMeeting({ applicationId: MOCK_IDS.application })
      ).rejects.toThrow("FORBIDDEN");
    });
  });
});
