import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock all external dependencies before importing router
vi.mock("../../supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock("../../db", () => ({
  getCandidateByUserId: vi.fn(),
  getCandidateById: vi.fn(),
  getCandidatesByIds: vi.fn(),
  getJobById: vi.fn(),
  getAgencyForUserContext: vi.fn(),
  getAgencyById: vi.fn(),
  getCompanyByUserId: vi.fn(),
  getAffiliateByUserId: vi.fn(),
  getAgenciesByAffiliateId: vi.fn(),
  createNotification: vi.fn(),
  getInterviewSessionsByBatch: vi.fn(),
}));

vi.mock("../../db/batches", () => ({
  getTopMatchesForJob: vi.fn(),
  createBatch: vi.fn(),
  getBatchById: vi.fn(),
  getBatchesByJobId: vi.fn(),
  getBatchesByAgencyId: vi.fn(),
  getBatchesByAgencyIds: vi.fn(),
  getBatchesForCompany: vi.fn(),
  getAgencyBatchStats: vi.fn(),
  getCompanyBatchStats: vi.fn(),
  sendBatchToCompany: vi.fn(),
  scheduleBatchMeeting: vi.fn(),
  updateBatch: vi.fn(),
  cancelBatch: vi.fn(),
  setCandidateStatus: vi.fn(),
  getAgencyContractsByTypes: vi.fn(),
  selectCandidatesForInterview: vi.fn(),
}));

vi.mock("../../lib/candidateCardPdf", () => ({
  generateCandidateCardPdf: vi.fn(),
}));

vi.mock("../../db/interviews", () => ({
  getInterviewSessionsByBatch: vi.fn(),
  getCompanyInterviewSessionsByBatch: vi.fn(),
  markSessionAttendance: vi.fn(),
  createPreSelectionSession: vi.fn(),
}));

import { batchRouter } from "../../routers/batch";
import { supabaseAdmin } from "../../supabase";
import * as db from "../../db";
import * as batchDb from "../../db/batches";
import { generateCandidateCardPdf } from "../../lib/candidateCardPdf";
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
  mockJob,
  mockAgency,
  MOCK_IDS,
} from "../helpers/mock-data";

const createCaller = (ctx: any) => batchRouter.createCaller(ctx);

describe("batch router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // getCandidateMeetingInfo
  // ============================================
  describe("getCandidateMeetingInfo", () => {
    it("returns null when candidate not found", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(null as any);

      const caller = createCaller(candidateContext());
      const result = await caller.getCandidateMeetingInfo({ jobId: MOCK_IDS.job });
      expect(result).toBeNull();
    });

    it("returns null when no batches found for candidate", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate());

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(candidateContext());
      const result = await caller.getCandidateMeetingInfo({ jobId: MOCK_IDS.job });
      expect(result).toBeNull();
    });

    it("returns meeting info when batch exists", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate());

      const mockBatch = {
        id: MOCK_IDS.batch,
        meeting_scheduled_at: "2026-04-01T10:00:00Z",
        meeting_link: "https://meet.google.com/abc",
        meeting_notes: "Bring resume",
        status: "meeting_scheduled",
      };
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [mockBatch] }),
      };
      vi.mocked(supabaseAdmin.from).mockReturnValue(mockChain as any);

      const caller = createCaller(candidateContext());
      const result = await caller.getCandidateMeetingInfo({ jobId: MOCK_IDS.job });

      expect(result).toEqual({
        meeting_scheduled_at: "2026-04-01T10:00:00Z",
        meeting_link: "https://meet.google.com/abc",
        meeting_notes: "Bring resume",
      });
    });

    it("rejects company users", async () => {
      const caller = createCaller(companyContext());
      await expect(
        caller.getCandidateMeetingInfo({ jobId: MOCK_IDS.job })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects unauthenticated users", async () => {
      const caller = createCaller(unauthenticatedContext());
      await expect(
        caller.getCandidateMeetingInfo({ jobId: MOCK_IDS.job })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // getCandidateCard
  // ============================================
  describe("getCandidateCard", () => {
    it("throws NOT_FOUND when candidate does not exist", async () => {
      vi.mocked(db.getCandidateById).mockResolvedValue(null as any);

      const caller = createCaller(companyContext());
      await expect(
        caller.getCandidateCard({ candidateId: MOCK_IDS.candidate, batchId: MOCK_IDS.batch })
      ).rejects.toThrow(TRPCError);
    });

    it("returns candidate card with age and interview data", async () => {
      const candidate = mockCandidate({ date_of_birth: "2000-06-15" });
      vi.mocked(db.getCandidateById).mockResolvedValue(candidate);

      // Mock interview participation query
      const participationChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };

      // Mock batch query for job_id
      const batchChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { job_id: MOCK_IDS.job } }),
      };

      // Mock job_matches query
      const matchChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { final_score: 85 } }),
      };

      let callCount = 0;
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        if (table === "interview_participants") return participationChain as any;
        if (table === "candidate_batches") return batchChain as any;
        if (table === "job_matches") return matchChain as any;
        return participationChain as any;
      });

      const caller = createCaller(companyContext());
      const result = await caller.getCandidateCard({
        candidateId: MOCK_IDS.candidate,
        batchId: MOCK_IDS.batch,
      });

      expect(result.profile.name).toBe("Maria Silva");
      expect(result.profile.age).toBeTypeOf("number");
      expect(result.matchScore).toBe(85);
      expect(result.interview).toBeNull();
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.getCandidateCard({ candidateId: MOCK_IDS.candidate, batchId: MOCK_IDS.batch })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // getTopCandidatesForJob
  // ============================================
  describe("getTopCandidatesForJob", () => {
    it("returns top matches for a job", async () => {
      vi.mocked(db.getJobById).mockResolvedValue(mockJob());
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());
      const mockMatches = [
        { candidate_id: MOCK_IDS.candidate, score: 90 },
      ];
      vi.mocked(batchDb.getTopMatchesForJob).mockResolvedValue(mockMatches);

      const caller = createCaller(agencyContext());
      const result = await caller.getTopCandidatesForJob({ jobId: MOCK_IDS.job });

      expect(result.jobId).toBe(MOCK_IDS.job);
      expect(result.matches).toEqual(mockMatches);
      expect(result.count).toBe(1);
    });

    it("throws NOT_FOUND when job does not exist", async () => {
      vi.mocked(db.getJobById).mockResolvedValue(null as any);

      const caller = createCaller(agencyContext());
      await expect(
        caller.getTopCandidatesForJob({ jobId: MOCK_IDS.job })
      ).rejects.toThrow(TRPCError);
    });

    it("throws NOT_FOUND when agency not found", async () => {
      vi.mocked(db.getJobById).mockResolvedValue(mockJob());
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(null as any);

      const caller = createCaller(agencyContext());
      await expect(
        caller.getTopCandidatesForJob({ jobId: MOCK_IDS.job })
      ).rejects.toThrow(TRPCError);
    });

    it("throws FORBIDDEN when agency does not own job", async () => {
      vi.mocked(db.getJobById).mockResolvedValue(mockJob({ agency_id: "other-agency-id" }));
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());

      const caller = createCaller(agencyContext());
      await expect(
        caller.getTopCandidatesForJob({ jobId: MOCK_IDS.job })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.getTopCandidatesForJob({ jobId: MOCK_IDS.job })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects company users", async () => {
      const caller = createCaller(companyContext());
      await expect(
        caller.getTopCandidatesForJob({ jobId: MOCK_IDS.job })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // createDraftBatch
  // ============================================
  describe("createDraftBatch", () => {
    it("creates a draft batch successfully", async () => {
      vi.mocked(db.getJobById).mockResolvedValue(mockJob());
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());
      vi.mocked(batchDb.createBatch).mockResolvedValue(MOCK_IDS.batch);

      const caller = createCaller(agencyContext());
      const result = await caller.createDraftBatch({
        jobId: MOCK_IDS.job,
        candidateIds: [MOCK_IDS.candidate],
      });

      expect(result).toEqual({ batchId: MOCK_IDS.batch, success: true });
      expect(batchDb.createBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: MOCK_IDS.job,
          agencyId: MOCK_IDS.agency,
          candidateIds: [MOCK_IDS.candidate],
          status: "draft",
        })
      );
    });

    it("throws NOT_FOUND when job does not exist", async () => {
      vi.mocked(db.getJobById).mockResolvedValue(null as any);

      const caller = createCaller(agencyContext());
      await expect(
        caller.createDraftBatch({ jobId: MOCK_IDS.job, candidateIds: [MOCK_IDS.candidate] })
      ).rejects.toThrow(TRPCError);
    });

    it("throws FORBIDDEN when agency does not own job", async () => {
      vi.mocked(db.getJobById).mockResolvedValue(mockJob({ agency_id: "other-agency" }));
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());

      const caller = createCaller(agencyContext());
      await expect(
        caller.createDraftBatch({ jobId: MOCK_IDS.job, candidateIds: [MOCK_IDS.candidate] })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.createDraftBatch({ jobId: MOCK_IDS.job, candidateIds: [MOCK_IDS.candidate] })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects invalid UUID input", async () => {
      const caller = createCaller(agencyContext());
      await expect(
        caller.createDraftBatch({ jobId: "not-a-uuid", candidateIds: [MOCK_IDS.candidate] })
      ).rejects.toThrow();
    });
  });

  // ============================================
  // sendBatchToCompany
  // ============================================
  describe("sendBatchToCompany", () => {
    const mockBatch = {
      id: MOCK_IDS.batch,
      agency_id: MOCK_IDS.agency,
      company_id: MOCK_IDS.company,
      status: "draft",
      batch_size: 3,
      company: { user_id: MOCK_IDS.user.company },
      job: { title: "Estagiário" },
    };

    it("sends batch to company successfully", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());
      vi.mocked(batchDb.getBatchById).mockResolvedValue(mockBatch);
      vi.mocked(batchDb.sendBatchToCompany).mockResolvedValue(undefined);
      vi.mocked(db.createNotification).mockResolvedValue(undefined as any);

      const caller = createCaller(agencyContext());
      const result = await caller.sendBatchToCompany({ batchId: MOCK_IDS.batch });

      expect(result).toEqual({ success: true, batchId: MOCK_IDS.batch });
      expect(batchDb.sendBatchToCompany).toHaveBeenCalledWith(MOCK_IDS.batch);
      expect(db.createNotification).toHaveBeenCalled();
    });

    it("throws BAD_REQUEST when batch is already sent", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());
      vi.mocked(batchDb.getBatchById).mockResolvedValue({ ...mockBatch, status: "sent" });

      const caller = createCaller(agencyContext());
      await expect(
        caller.sendBatchToCompany({ batchId: MOCK_IDS.batch })
      ).rejects.toThrow(TRPCError);
    });

    it("throws NOT_FOUND when batch does not exist", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());
      vi.mocked(batchDb.getBatchById).mockResolvedValue(null);

      const caller = createCaller(agencyContext());
      await expect(
        caller.sendBatchToCompany({ batchId: MOCK_IDS.batch })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // scheduleBatchMeeting
  // ============================================
  describe("scheduleBatchMeeting", () => {
    const mockBatch = {
      id: MOCK_IDS.batch,
      agency_id: MOCK_IDS.agency,
      unlocked: true,
      company: { user_id: MOCK_IDS.user.company },
      job: { title: "Estagiário" },
    };

    it("schedules meeting successfully", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());
      vi.mocked(batchDb.getBatchById).mockResolvedValue(mockBatch);
      vi.mocked(batchDb.scheduleBatchMeeting).mockResolvedValue(undefined);
      vi.mocked(db.createNotification).mockResolvedValue(undefined as any);

      const caller = createCaller(agencyContext());
      const result = await caller.scheduleBatchMeeting({
        batchId: MOCK_IDS.batch,
        scheduledAt: "2026-04-01T10:00:00Z",
        meetingLink: "https://meet.google.com/abc",
      });

      expect(result).toEqual({ success: true });
      expect(batchDb.scheduleBatchMeeting).toHaveBeenCalledWith(
        MOCK_IDS.batch,
        "2026-04-01T10:00:00Z",
        "https://meet.google.com/abc",
        undefined
      );
    });

    it("throws BAD_REQUEST when batch is locked", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());
      vi.mocked(batchDb.getBatchById).mockResolvedValue({ ...mockBatch, unlocked: false });

      const caller = createCaller(agencyContext());
      await expect(
        caller.scheduleBatchMeeting({
          batchId: MOCK_IDS.batch,
          scheduledAt: "2026-04-01T10:00:00Z",
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // completeBatch
  // ============================================
  describe("completeBatch", () => {
    it("completes a batch with meeting_scheduled status", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        agency_id: MOCK_IDS.agency,
        status: "meeting_scheduled",
        company: { user_id: MOCK_IDS.user.company },
        job: { title: "Estagiário" },
      });
      vi.mocked(batchDb.updateBatch).mockResolvedValue(undefined);
      vi.mocked(db.createNotification).mockResolvedValue(undefined as any);

      const caller = createCaller(agencyContext());
      const result = await caller.completeBatch({ batchId: MOCK_IDS.batch });

      expect(result).toEqual({ success: true });
      expect(batchDb.updateBatch).toHaveBeenCalledWith(
        MOCK_IDS.batch,
        expect.objectContaining({ status: "completed" })
      );
    });

    it("throws BAD_REQUEST when batch is not meeting_scheduled", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        agency_id: MOCK_IDS.agency,
        status: "draft",
        company: { user_id: MOCK_IDS.user.company },
        job: { title: "Estagiário" },
      });

      const caller = createCaller(agencyContext());
      await expect(
        caller.completeBatch({ batchId: MOCK_IDS.batch })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // getAgencyBatches
  // ============================================
  describe("getAgencyBatches", () => {
    it("returns batches for the agency", async () => {
      const mockBatches = [{ id: MOCK_IDS.batch, status: "sent" }];
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());
      vi.mocked(batchDb.getBatchesByAgencyId).mockResolvedValue(mockBatches);

      const caller = createCaller(agencyContext());
      const result = await caller.getAgencyBatches();

      expect(result).toEqual(mockBatches);
    });

    it("filters by status when provided", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());
      vi.mocked(batchDb.getBatchesByAgencyId).mockResolvedValue([]);

      const caller = createCaller(agencyContext());
      await caller.getAgencyBatches({ status: "draft" });

      expect(batchDb.getBatchesByAgencyId).toHaveBeenCalledWith(MOCK_IDS.agency, "draft");
    });

    it("throws NOT_FOUND when agency not found", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(null as any);

      const caller = createCaller(agencyContext());
      await expect(caller.getAgencyBatches()).rejects.toThrow(TRPCError);
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.getAgencyBatches()).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // cancelBatch
  // ============================================
  describe("cancelBatch", () => {
    it("cancels batch successfully", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        agency_id: MOCK_IDS.agency,
      });
      vi.mocked(batchDb.cancelBatch).mockResolvedValue(undefined);

      const caller = createCaller(agencyContext());
      const result = await caller.cancelBatch({ batchId: MOCK_IDS.batch, reason: "No longer needed" });

      expect(result).toEqual({ success: true });
      expect(batchDb.cancelBatch).toHaveBeenCalledWith(MOCK_IDS.batch, "No longer needed");
    });

    it("throws FORBIDDEN when batch belongs to different agency", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        agency_id: "other-agency-id",
      });

      const caller = createCaller(agencyContext());
      await expect(
        caller.cancelBatch({ batchId: MOCK_IDS.batch })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // updateCandidateStatus
  // ============================================
  describe("updateCandidateStatus", () => {
    it("updates candidate status in batch", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        agency_id: MOCK_IDS.agency,
        candidate_ids: [MOCK_IDS.candidate],
      });
      vi.mocked(batchDb.setCandidateStatus).mockResolvedValue(undefined);

      const caller = createCaller(agencyContext());
      const result = await caller.updateCandidateStatus({
        batchId: MOCK_IDS.batch,
        candidateId: MOCK_IDS.candidate,
        status: "approved",
      });

      expect(result).toEqual({ success: true });
    });

    it("throws BAD_REQUEST when candidate not in batch", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        agency_id: MOCK_IDS.agency,
        candidate_ids: ["other-candidate-id"],
      });

      const caller = createCaller(agencyContext());
      await expect(
        caller.updateCandidateStatus({
          batchId: MOCK_IDS.batch,
          candidateId: MOCK_IDS.candidate,
          status: "approved",
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // getBatchesByJobId
  // ============================================
  describe("getBatchesByJobId", () => {
    it("returns batches filtered by agency", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());
      vi.mocked(batchDb.getBatchesByJobId).mockResolvedValue([
        { id: "b1", agency_id: MOCK_IDS.agency },
        { id: "b2", agency_id: "other-agency" },
      ]);

      const caller = createCaller(agencyContext());
      const result = await caller.getBatchesByJobId({ jobId: MOCK_IDS.job });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("b1");
    });

    it("returns all batches for admin", async () => {
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());
      vi.mocked(batchDb.getBatchesByJobId).mockResolvedValue([
        { id: "b1", agency_id: MOCK_IDS.agency },
        { id: "b2", agency_id: "other-agency" },
      ]);

      const caller = createCaller(adminContext());
      const result = await caller.getBatchesByJobId({ jobId: MOCK_IDS.job });

      expect(result).toHaveLength(2);
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.getBatchesByJobId({ jobId: MOCK_IDS.job })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // getCompanyBatches
  // ============================================
  describe("getCompanyBatches", () => {
    it("returns batches for the company", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());
      vi.mocked(batchDb.getBatchesForCompany).mockResolvedValue([{ id: MOCK_IDS.batch }]);

      const caller = createCaller(companyContext());
      const result = await caller.getCompanyBatches();

      expect(result).toEqual([{ id: MOCK_IDS.batch }]);
      expect(batchDb.getBatchesForCompany).toHaveBeenCalledWith(MOCK_IDS.company);
    });

    it("throws NOT_FOUND when company not found", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(null as any);

      const caller = createCaller(companyContext());
      await expect(caller.getCompanyBatches()).rejects.toThrow(TRPCError);
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.getCompanyBatches()).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // getLockedBatches (backward compat)
  // ============================================
  describe("getLockedBatches", () => {
    it("returns empty array (deprecated)", async () => {
      const caller = createCaller(companyContext());
      const result = await caller.getLockedBatches();
      expect(result).toEqual([]);
    });
  });

  // ============================================
  // getBatchDetails
  // ============================================
  describe("getBatchDetails", () => {
    it("returns hidden details for locked batch", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        company_id: MOCK_IDS.company,
        unlocked: false,
        batch_size: 5,
        candidate_ids: [MOCK_IDS.candidate],
      });

      const caller = createCaller(companyContext());
      const result = await caller.getBatchDetails({ batchId: MOCK_IDS.batch });

      expect(result.candidate_ids).toEqual([]);
      expect(result.candidates).toEqual([]);
      expect(result.candidate_count).toBe(5);
    });

    it("returns full details for unlocked batch", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        company_id: MOCK_IDS.company,
        unlocked: true,
        candidate_ids: [MOCK_IDS.candidate],
      });
      vi.mocked(db.getCandidatesByIds).mockResolvedValue([mockCandidate()]);

      const caller = createCaller(companyContext());
      const result = await caller.getBatchDetails({ batchId: MOCK_IDS.batch });

      expect(result.candidates).toHaveLength(1);
    });

    it("throws FORBIDDEN when batch belongs to another company", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        company_id: "other-company-id",
        unlocked: false,
      });

      const caller = createCaller(companyContext());
      await expect(
        caller.getBatchDetails({ batchId: MOCK_IDS.batch })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // payForBatch
  // ============================================
  describe("payForBatch", () => {
    it("returns payment info for valid batch", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        company_id: MOCK_IDS.company,
        unlocked: false,
        payment_id: "pay-123",
        unlock_fee: 5000,
      });

      const caller = createCaller(companyContext());
      const result = await caller.payForBatch({
        batchId: MOCK_IDS.batch,
        paymentMethod: "pix",
      });

      expect(result.success).toBe(true);
      expect(result.paymentId).toBe("pay-123");
      expect(result.amount).toBe(5000);
    });

    it("throws BAD_REQUEST when batch already unlocked", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        company_id: MOCK_IDS.company,
        unlocked: true,
      });

      const caller = createCaller(companyContext());
      await expect(
        caller.payForBatch({ batchId: MOCK_IDS.batch, paymentMethod: "pix" })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // selectCandidatesForInterview
  // ============================================
  describe("selectCandidatesForInterview", () => {
    it("selects candidates successfully", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        company_id: MOCK_IDS.company,
        agency_id: MOCK_IDS.agency,
        unlocked: true,
        candidate_ids: [MOCK_IDS.candidate],
        job: { title: "Estagiário" },
      });
      vi.mocked(batchDb.selectCandidatesForInterview).mockResolvedValue(undefined);
      vi.mocked(db.getAgencyById).mockResolvedValue({ ...mockAgency(), user_id: MOCK_IDS.user.agency });
      vi.mocked(db.createNotification).mockResolvedValue(undefined as any);

      const caller = createCaller(companyContext());
      const result = await caller.selectCandidatesForInterview({
        batchId: MOCK_IDS.batch,
        candidateIds: [MOCK_IDS.candidate],
      });

      expect(result).toEqual({ success: true, selectedCount: 1 });
    });

    it("throws BAD_REQUEST when candidates not in batch", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        company_id: MOCK_IDS.company,
        unlocked: true,
        candidate_ids: [],
        job: { title: "Estagiário" },
      });

      const caller = createCaller(companyContext());
      await expect(
        caller.selectCandidatesForInterview({
          batchId: MOCK_IDS.batch,
          candidateIds: [MOCK_IDS.candidate],
        })
      ).rejects.toThrow(TRPCError);
    });

    it("throws FORBIDDEN when batch is locked", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        company_id: MOCK_IDS.company,
        unlocked: false,
        candidate_ids: [MOCK_IDS.candidate],
      });

      const caller = createCaller(companyContext());
      await expect(
        caller.selectCandidatesForInterview({
          batchId: MOCK_IDS.batch,
          candidateIds: [MOCK_IDS.candidate],
        })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // generateCandidateCardPdf
  // ============================================
  describe("generateCandidateCardPdf", () => {
    it("generates PDF successfully", async () => {
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        company_id: MOCK_IDS.company,
        candidate_ids: [MOCK_IDS.candidate],
        job: { title: "Estagiário" },
      });
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());
      vi.mocked(db.getCandidateById).mockResolvedValue(mockCandidate());
      vi.mocked(db.getInterviewSessionsByBatch).mockResolvedValue([]);
      vi.mocked(generateCandidateCardPdf).mockResolvedValue(new Uint8Array([1, 2, 3]));

      const caller = createCaller(companyContext());
      const result = await caller.generateCandidateCardPdf({
        candidateId: MOCK_IDS.candidate,
        batchId: MOCK_IDS.batch,
      });

      expect(result.filename).toContain("Maria_Silva");
      expect(result.base64).toBeTruthy();
    });

    it("throws FORBIDDEN when company does not own batch", async () => {
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        company_id: "other-company",
        candidate_ids: [MOCK_IDS.candidate],
      });
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());

      const caller = createCaller(companyContext());
      await expect(
        caller.generateCandidateCardPdf({ candidateId: MOCK_IDS.candidate, batchId: MOCK_IDS.batch })
      ).rejects.toThrow(TRPCError);
    });

    it("throws NOT_FOUND when candidate not in batch", async () => {
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        company_id: MOCK_IDS.company,
        candidate_ids: ["other-candidate"],
      });
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());

      const caller = createCaller(companyContext());
      await expect(
        caller.generateCandidateCardPdf({ candidateId: MOCK_IDS.candidate, batchId: MOCK_IDS.batch })
      ).rejects.toThrow(TRPCError);
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.generateCandidateCardPdf({ candidateId: MOCK_IDS.candidate, batchId: MOCK_IDS.batch })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // addCandidatesToBatch
  // ============================================
  describe("addCandidatesToBatch", () => {
    it("adds candidates to existing batch", async () => {
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        candidate_ids: ["existing-id"],
      });
      vi.mocked(batchDb.updateBatch).mockResolvedValue(undefined);

      const caller = createCaller(agencyContext());
      const result = await caller.addCandidatesToBatch({
        batchId: MOCK_IDS.batch,
        candidateIds: [MOCK_IDS.candidate],
      });

      expect(result).toEqual({ success: true });
      expect(batchDb.updateBatch).toHaveBeenCalledWith(
        MOCK_IDS.batch,
        expect.objectContaining({
          batch_size: 2,
        })
      );
    });

    it("throws NOT_FOUND when batch does not exist", async () => {
      vi.mocked(batchDb.getBatchById).mockResolvedValue(null);

      const caller = createCaller(agencyContext());
      await expect(
        caller.addCandidatesToBatch({ batchId: MOCK_IDS.batch, candidateIds: [MOCK_IDS.candidate] })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // removeCandidateFromBatch
  // ============================================
  describe("removeCandidateFromBatch", () => {
    it("removes candidate from batch", async () => {
      vi.mocked(batchDb.getBatchById).mockResolvedValue({
        id: MOCK_IDS.batch,
        candidate_ids: [MOCK_IDS.candidate, "other-id"],
      });
      vi.mocked(batchDb.updateBatch).mockResolvedValue(undefined);

      const caller = createCaller(agencyContext());
      const result = await caller.removeCandidateFromBatch({
        batchId: MOCK_IDS.batch,
        candidateId: MOCK_IDS.candidate,
      });

      expect(result).toEqual({ success: true });
      expect(batchDb.updateBatch).toHaveBeenCalledWith(
        MOCK_IDS.batch,
        expect.objectContaining({
          candidate_ids: ["other-id"],
          batch_size: 1,
        })
      );
    });
  });

  // ============================================
  // updateMeetingLink
  // ============================================
  describe("updateMeetingLink", () => {
    it("updates meeting link successfully", async () => {
      vi.mocked(batchDb.getBatchById).mockResolvedValue({ id: MOCK_IDS.batch });
      vi.mocked(batchDb.updateBatch).mockResolvedValue(undefined);

      const caller = createCaller(agencyContext());
      const result = await caller.updateMeetingLink({
        batchId: MOCK_IDS.batch,
        meetingLink: "https://meet.google.com/new",
      });

      expect(result).toEqual({ success: true });
    });

    it("throws NOT_FOUND when batch does not exist", async () => {
      vi.mocked(batchDb.getBatchById).mockResolvedValue(null);

      const caller = createCaller(agencyContext());
      await expect(
        caller.updateMeetingLink({ batchId: MOCK_IDS.batch, meetingLink: "https://meet.google.com/new" })
      ).rejects.toThrow(TRPCError);
    });
  });

  // ============================================
  // getAgencyBatchStats
  // ============================================
  describe("getAgencyBatchStats", () => {
    it("returns stats for agency", async () => {
      const stats = { total: 10, draft: 2, sent: 3, completed: 5 };
      vi.mocked(db.getAgencyForUserContext).mockResolvedValue(mockAgency());
      vi.mocked(batchDb.getAgencyBatchStats).mockResolvedValue(stats);

      const caller = createCaller(agencyContext());
      const result = await caller.getAgencyBatchStats();

      expect(result).toEqual(stats);
    });
  });

  // ============================================
  // getCompanyBatchStats
  // ============================================
  describe("getCompanyBatchStats", () => {
    it("returns stats for company", async () => {
      const stats = { total: 5, unlocked: 3 };
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany());
      vi.mocked(batchDb.getCompanyBatchStats).mockResolvedValue(stats);

      const caller = createCaller(companyContext());
      const result = await caller.getCompanyBatchStats();

      expect(result).toEqual(stats);
    });

    it("throws NOT_FOUND when company not found", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(null as any);

      const caller = createCaller(companyContext());
      await expect(caller.getCompanyBatchStats()).rejects.toThrow(TRPCError);
    });
  });
});
