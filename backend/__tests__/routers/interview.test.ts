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
  getCompanyByUserId: vi.fn(),
  getCompanyById: vi.fn(),
  getJobById: vi.fn(),
  getApplicationByJobAndCandidate: vi.fn(),
  updateApplication: vi.fn(),
  updateBatch: vi.fn(),
  getCandidateByUserId: vi.fn(),
  getCandidateById: vi.fn(),
  createNotification: vi.fn(),
}));

vi.mock("../../db/interviews", () => ({
  createInterviewSession: vi.fn(),
  getInterviewSessionsByCompany: vi.fn(),
  getInterviewSessionById: vi.fn(),
  cancelInterviewSession: vi.fn(),
  getSessionParticipants: vi.fn(),
  getParticipantById: vi.fn(),
  updateParticipantStatus: vi.fn(),
  updateInterviewSession: vi.fn(),
  getInterviewsByCandidate: vi.fn(),
}));

vi.mock("../../routers/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

import { interviewRouter } from "../../routers/interview";
import * as db from "../../db";
import * as interviewDb from "../../db/interviews";
import {
  candidateContext,
  companyContext,
  adminContext,
  agencyContext,
  unauthenticatedContext,
} from "../helpers/mock-context";
import {
  mockCandidate,
  mockCompany,
  mockJob,
  mockApplication,
  MOCK_IDS,
} from "../helpers/mock-data";

const createCaller = (ctx: any) => interviewRouter.createCaller(ctx);

// Helper IDs
const SESSION_ID = "50000000-0000-4000-8000-000000000001";
const PARTICIPANT_ID = "60000000-0000-4000-8000-000000000001";

describe("interview router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // scheduleInterview
  // ============================================
  describe("scheduleInterview", () => {
    const validInput = {
      jobId: MOCK_IDS.job,
      candidateIds: [MOCK_IDS.candidate],
      interviewType: "online" as const,
      scheduledAt: "2026-04-15T14:00:00.000Z",
      durationMinutes: 30,
    };

    it("schedules an online interview successfully", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ company_id: MOCK_IDS.company }) as any
      );
      vi.mocked(db.getApplicationByJobAndCandidate).mockResolvedValue(
        mockApplication() as any
      );
      vi.mocked(interviewDb.createInterviewSession).mockResolvedValue({
        id: SESSION_ID,
      } as any);
      vi.mocked(db.updateApplication).mockResolvedValue(undefined);
      vi.mocked(db.getCandidateById).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.createNotification).mockResolvedValue(undefined as any);

      const caller = createCaller(companyContext());
      const result = await caller.scheduleInterview(validInput);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(SESSION_ID);
      expect(result.meetingLink).toContain("meet.jit.si");
      expect(result.participantCount).toBe(1);
      expect(interviewDb.createInterviewSession).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: MOCK_IDS.job,
          companyId: MOCK_IDS.company,
          interviewType: "online",
          meetingLink: expect.stringContaining("meet.jit.si"),
        })
      );
    });

    it("schedules an in-person interview successfully", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ company_id: MOCK_IDS.company }) as any
      );
      vi.mocked(db.getApplicationByJobAndCandidate).mockResolvedValue(
        mockApplication() as any
      );
      vi.mocked(interviewDb.createInterviewSession).mockResolvedValue({
        id: SESSION_ID,
      } as any);
      vi.mocked(db.updateApplication).mockResolvedValue(undefined);
      vi.mocked(db.getCandidateById).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.createNotification).mockResolvedValue(undefined as any);

      const caller = createCaller(companyContext());
      const result = await caller.scheduleInterview({
        ...validInput,
        interviewType: "in_person",
        locationAddress: "Rua Principal 100",
        locationCity: "Ipatinga",
        locationState: "MG",
      });

      expect(result.success).toBe(true);
      expect(result.meetingLink).toBeUndefined();
    });

    it("throws NOT_FOUND when company not found", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(undefined as any);

      const caller = createCaller(companyContext());
      await expect(caller.scheduleInterview(validInput)).rejects.toThrow(
        "Company not found"
      );
    });

    it("throws NOT_FOUND when job not found", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getJobById).mockResolvedValue(undefined as any);

      const caller = createCaller(companyContext());
      await expect(caller.scheduleInterview(validInput)).rejects.toThrow(
        "Job not found"
      );
    });

    it("throws FORBIDDEN when company does not own job", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ company_id: "other-company-id" }) as any
      );

      const caller = createCaller(companyContext());
      await expect(caller.scheduleInterview(validInput)).rejects.toThrow(
        "Not authorized"
      );
    });

    it("throws BAD_REQUEST when no valid applications found", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ company_id: MOCK_IDS.company }) as any
      );
      vi.mocked(db.getApplicationByJobAndCandidate).mockResolvedValue(
        undefined as any
      );

      const caller = createCaller(companyContext());
      await expect(caller.scheduleInterview(validInput)).rejects.toThrow(
        "No valid applications found"
      );
    });

    it("updates batch status when batchId provided", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ company_id: MOCK_IDS.company }) as any
      );
      vi.mocked(db.getApplicationByJobAndCandidate).mockResolvedValue(
        mockApplication() as any
      );
      vi.mocked(interviewDb.createInterviewSession).mockResolvedValue({
        id: SESSION_ID,
      } as any);
      vi.mocked(db.updateApplication).mockResolvedValue(undefined);
      vi.mocked(db.updateBatch).mockResolvedValue(undefined as any);
      vi.mocked(db.getCandidateById).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.createNotification).mockResolvedValue(undefined as any);

      const caller = createCaller(companyContext());
      await caller.scheduleInterview({
        ...validInput,
        batchId: MOCK_IDS.batch,
      });

      expect(db.updateBatch).toHaveBeenCalledWith(
        MOCK_IDS.batch,
        expect.objectContaining({ status: "meeting_scheduled" })
      );
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.scheduleInterview(validInput)).rejects.toThrow(
        "Company access required"
      );
    });

    it("rejects unauthenticated users", async () => {
      const caller = createCaller(unauthenticatedContext());
      await expect(caller.scheduleInterview(validInput)).rejects.toThrow();
    });

    it("validates candidateIds requires at least 1", async () => {
      const caller = createCaller(companyContext());
      await expect(
        caller.scheduleInterview({ ...validInput, candidateIds: [] })
      ).rejects.toThrow();
    });

    it("validates durationMinutes range", async () => {
      const caller = createCaller(companyContext());
      await expect(
        caller.scheduleInterview({ ...validInput, durationMinutes: 5 })
      ).rejects.toThrow();
      await expect(
        caller.scheduleInterview({ ...validInput, durationMinutes: 200 })
      ).rejects.toThrow();
    });

    it("allows admin to schedule interviews", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.getJobById).mockResolvedValue(
        mockJob({ company_id: MOCK_IDS.company }) as any
      );
      vi.mocked(db.getApplicationByJobAndCandidate).mockResolvedValue(
        mockApplication() as any
      );
      vi.mocked(interviewDb.createInterviewSession).mockResolvedValue({
        id: SESSION_ID,
      } as any);
      vi.mocked(db.updateApplication).mockResolvedValue(undefined);
      vi.mocked(db.getCandidateById).mockResolvedValue(mockCandidate() as any);
      vi.mocked(db.createNotification).mockResolvedValue(undefined as any);

      const caller = createCaller(adminContext());
      const result = await caller.scheduleInterview(validInput);
      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // getCompanyInterviews
  // ============================================
  describe("getCompanyInterviews", () => {
    it("returns interviews for company", async () => {
      const mockSessions = [{ id: SESSION_ID, status: "scheduled" }];
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(interviewDb.getInterviewSessionsByCompany).mockResolvedValue(
        mockSessions as any
      );

      const caller = createCaller(companyContext());
      const result = await caller.getCompanyInterviews();

      expect(result).toEqual(mockSessions);
      expect(interviewDb.getInterviewSessionsByCompany).toHaveBeenCalledWith(
        MOCK_IDS.company,
        undefined
      );
    });

    it("returns empty array when no company found", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(undefined as any);

      const caller = createCaller(companyContext());
      const result = await caller.getCompanyInterviews();
      expect(result).toEqual([]);
    });

    it("filters by status when provided", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(interviewDb.getInterviewSessionsByCompany).mockResolvedValue([]);

      const caller = createCaller(companyContext());
      await caller.getCompanyInterviews({ status: "completed" });

      expect(interviewDb.getInterviewSessionsByCompany).toHaveBeenCalledWith(
        MOCK_IDS.company,
        "completed"
      );
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.getCompanyInterviews()).rejects.toThrow(
        "Company access required"
      );
    });
  });

  // ============================================
  // cancelInterview
  // ============================================
  describe("cancelInterview", () => {
    it("cancels interview and notifies participants", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(interviewDb.getInterviewSessionById).mockResolvedValue({
        id: SESSION_ID,
        company_id: MOCK_IDS.company,
        job: { title: "Test Job" },
      } as any);
      vi.mocked(interviewDb.cancelInterviewSession).mockResolvedValue(undefined);
      vi.mocked(interviewDb.getSessionParticipants).mockResolvedValue([
        {
          candidate: { user_id: MOCK_IDS.user.candidate },
        },
      ] as any);
      vi.mocked(db.createNotification).mockResolvedValue(undefined as any);

      const caller = createCaller(companyContext());
      const result = await caller.cancelInterview({
        sessionId: SESSION_ID,
        reason: "Schedule conflict",
      });

      expect(result).toEqual({ success: true });
      expect(interviewDb.cancelInterviewSession).toHaveBeenCalledWith(SESSION_ID);
      expect(db.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: MOCK_IDS.user.candidate,
          type: "warning",
        })
      );
    });

    it("throws NOT_FOUND when company not found", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(undefined as any);

      const caller = createCaller(companyContext());
      await expect(
        caller.cancelInterview({ sessionId: SESSION_ID })
      ).rejects.toThrow("Company not found");
    });

    it("throws FORBIDDEN when session belongs to another company", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(interviewDb.getInterviewSessionById).mockResolvedValue({
        id: SESSION_ID,
        company_id: "other-company-id",
      } as any);

      const caller = createCaller(companyContext());
      await expect(
        caller.cancelInterview({ sessionId: SESSION_ID })
      ).rejects.toThrow("Not authorized");
    });

    it("throws FORBIDDEN when session not found", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(interviewDb.getInterviewSessionById).mockResolvedValue(null);

      const caller = createCaller(companyContext());
      await expect(
        caller.cancelInterview({ sessionId: SESSION_ID })
      ).rejects.toThrow("Not authorized");
    });
  });

  // ============================================
  // markAttendance
  // ============================================
  describe("markAttendance", () => {
    const validInput = {
      sessionId: SESSION_ID,
      attendees: [
        { participantId: PARTICIPANT_ID, attended: true },
      ],
    };

    it("marks attendance and completes session", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(interviewDb.getInterviewSessionById).mockResolvedValue({
        id: SESSION_ID,
        company_id: MOCK_IDS.company,
        status: "scheduled",
        job: { title: "Test Job" },
      } as any);
      vi.mocked(interviewDb.getParticipantById).mockResolvedValue({
        id: PARTICIPANT_ID,
        interview_session_id: SESSION_ID,
        candidate_id: MOCK_IDS.candidate,
        application_id: MOCK_IDS.application,
      } as any);
      vi.mocked(interviewDb.updateParticipantStatus).mockResolvedValue(undefined);
      vi.mocked(db.updateApplication).mockResolvedValue(undefined);
      vi.mocked(db.getCandidateById).mockResolvedValue(mockCandidate() as any);
      vi.mocked(interviewDb.updateInterviewSession).mockResolvedValue(undefined as any);
      vi.mocked(db.createNotification).mockResolvedValue(undefined as any);

      const caller = createCaller(companyContext());
      const result = await caller.markAttendance(validInput);

      expect(result.success).toBe(true);
      expect(result.attendedCount).toBe(1);
      expect(interviewDb.updateParticipantStatus).toHaveBeenCalledWith(
        PARTICIPANT_ID,
        "attended"
      );
      expect(db.updateApplication).toHaveBeenCalledWith(MOCK_IDS.application, {
        status: "interviewed",
      });
      expect(interviewDb.updateInterviewSession).toHaveBeenCalledWith(
        SESSION_ID,
        { status: "completed" }
      );
    });

    it("marks no-show correctly", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(interviewDb.getInterviewSessionById).mockResolvedValue({
        id: SESSION_ID,
        company_id: MOCK_IDS.company,
        status: "scheduled",
        job: { title: "Test Job" },
      } as any);
      vi.mocked(interviewDb.getParticipantById).mockResolvedValue({
        id: PARTICIPANT_ID,
        interview_session_id: SESSION_ID,
        candidate_id: MOCK_IDS.candidate,
        application_id: MOCK_IDS.application,
      } as any);
      vi.mocked(interviewDb.updateParticipantStatus).mockResolvedValue(undefined);
      vi.mocked(db.updateApplication).mockResolvedValue(undefined);
      vi.mocked(db.getCandidateById).mockResolvedValue(mockCandidate() as any);
      vi.mocked(interviewDb.updateInterviewSession).mockResolvedValue(undefined as any);
      vi.mocked(db.createNotification).mockResolvedValue(undefined as any);

      const caller = createCaller(companyContext());
      const result = await caller.markAttendance({
        sessionId: SESSION_ID,
        attendees: [{ participantId: PARTICIPANT_ID, attended: false }],
      });

      expect(result.attendedCount).toBe(0);
      expect(interviewDb.updateParticipantStatus).toHaveBeenCalledWith(
        PARTICIPANT_ID,
        "no_show"
      );
    });

    it("throws BAD_REQUEST for non-scheduled sessions", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(interviewDb.getInterviewSessionById).mockResolvedValue({
        id: SESSION_ID,
        company_id: MOCK_IDS.company,
        status: "completed",
      } as any);

      const caller = createCaller(companyContext());
      await expect(caller.markAttendance(validInput)).rejects.toThrow(
        "Attendance can only be marked for scheduled interviews"
      );
    });

    it("throws FORBIDDEN when company does not own session", async () => {
      vi.mocked(db.getCompanyByUserId).mockResolvedValue(mockCompany() as any);
      vi.mocked(interviewDb.getInterviewSessionById).mockResolvedValue({
        id: SESSION_ID,
        company_id: "other-company-id",
        status: "scheduled",
      } as any);

      const caller = createCaller(companyContext());
      await expect(caller.markAttendance(validInput)).rejects.toThrow(
        "Not authorized"
      );
    });
  });

  // ============================================
  // getMyInterviews (candidate)
  // ============================================
  describe("getMyInterviews", () => {
    it("returns interviews for candidate", async () => {
      const mockInterviews = [{ id: SESSION_ID, status: "scheduled" }];
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(interviewDb.getInterviewsByCandidate).mockResolvedValue(
        mockInterviews as any
      );

      const caller = createCaller(candidateContext());
      const result = await caller.getMyInterviews();

      expect(result).toEqual(mockInterviews);
    });

    it("returns empty array when no candidate profile", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(undefined as any);

      const caller = createCaller(candidateContext());
      const result = await caller.getMyInterviews();
      expect(result).toEqual([]);
    });

    it("rejects company users", async () => {
      const caller = createCaller(companyContext());
      await expect(caller.getMyInterviews()).rejects.toThrow(
        "Candidate access required"
      );
    });
  });

  // ============================================
  // confirmAttendance (candidate)
  // ============================================
  describe("confirmAttendance", () => {
    it("confirms attendance successfully", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(interviewDb.getParticipantById).mockResolvedValue({
        id: PARTICIPANT_ID,
        candidate_id: MOCK_IDS.candidate,
        status: "pending",
        session: {
          id: SESSION_ID,
          company_id: MOCK_IDS.company,
          company: { user_id: MOCK_IDS.user.company },
          job: { title: "Test Job" },
        },
      } as any);
      vi.mocked(interviewDb.updateParticipantStatus).mockResolvedValue(undefined);
      vi.mocked(db.getCompanyById).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.createNotification).mockResolvedValue(undefined as any);

      const caller = createCaller(candidateContext());
      const result = await caller.confirmAttendance({
        participantId: PARTICIPANT_ID,
      });

      expect(result).toEqual({ success: true });
      expect(interviewDb.updateParticipantStatus).toHaveBeenCalledWith(
        PARTICIPANT_ID,
        "confirmed"
      );
    });

    it("throws NOT_FOUND when candidate not found", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(undefined as any);

      const caller = createCaller(candidateContext());
      await expect(
        caller.confirmAttendance({ participantId: PARTICIPANT_ID })
      ).rejects.toThrow("Candidate not found");
    });

    it("throws FORBIDDEN when participant belongs to another candidate", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(interviewDb.getParticipantById).mockResolvedValue({
        id: PARTICIPANT_ID,
        candidate_id: "other-candidate-id",
        status: "pending",
      } as any);

      const caller = createCaller(candidateContext());
      await expect(
        caller.confirmAttendance({ participantId: PARTICIPANT_ID })
      ).rejects.toThrow("Not authorized");
    });

    it("throws BAD_REQUEST when status is not pending", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(interviewDb.getParticipantById).mockResolvedValue({
        id: PARTICIPANT_ID,
        candidate_id: MOCK_IDS.candidate,
        status: "confirmed",
      } as any);

      const caller = createCaller(candidateContext());
      await expect(
        caller.confirmAttendance({ participantId: PARTICIPANT_ID })
      ).rejects.toThrow("Cannot confirm");
    });
  });

  // ============================================
  // markAsAttended (candidate)
  // ============================================
  describe("markAsAttended", () => {
    it("marks as attended and updates application", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(interviewDb.getParticipantById).mockResolvedValue({
        id: PARTICIPANT_ID,
        candidate_id: MOCK_IDS.candidate,
        application_id: MOCK_IDS.application,
        status: "confirmed",
        session: {
          id: SESSION_ID,
          company_id: MOCK_IDS.company,
          job: { title: "Test Job" },
        },
      } as any);
      vi.mocked(interviewDb.updateParticipantStatus).mockResolvedValue(undefined);
      vi.mocked(db.updateApplication).mockResolvedValue(undefined);
      vi.mocked(db.getCompanyById).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.createNotification).mockResolvedValue(undefined as any);

      const caller = createCaller(candidateContext());
      const result = await caller.markAsAttended({
        participantId: PARTICIPANT_ID,
      });

      expect(result).toEqual({ success: true });
      expect(interviewDb.updateParticipantStatus).toHaveBeenCalledWith(
        PARTICIPANT_ID,
        "attended"
      );
      expect(db.updateApplication).toHaveBeenCalledWith(MOCK_IDS.application, {
        status: "interviewed",
      });
    });

    it("throws BAD_REQUEST when status is not confirmed", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(interviewDb.getParticipantById).mockResolvedValue({
        id: PARTICIPANT_ID,
        candidate_id: MOCK_IDS.candidate,
        status: "pending",
      } as any);

      const caller = createCaller(candidateContext());
      await expect(
        caller.markAsAttended({ participantId: PARTICIPANT_ID })
      ).rejects.toThrow("confirmadas");
    });
  });

  // ============================================
  // requestReschedule (candidate)
  // ============================================
  describe("requestReschedule", () => {
    it("requests reschedule successfully", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(interviewDb.getParticipantById).mockResolvedValue({
        id: PARTICIPANT_ID,
        candidate_id: MOCK_IDS.candidate,
        status: "pending",
        session: {
          id: SESSION_ID,
          company_id: MOCK_IDS.company,
          job: { title: "Test Job" },
        },
      } as any);
      vi.mocked(interviewDb.updateParticipantStatus).mockResolvedValue(undefined);
      vi.mocked(db.getCompanyById).mockResolvedValue(mockCompany() as any);
      vi.mocked(db.createNotification).mockResolvedValue(undefined as any);

      const caller = createCaller(candidateContext());
      const result = await caller.requestReschedule({
        participantId: PARTICIPANT_ID,
        reason: "I have a conflicting appointment that day",
      });

      expect(result).toEqual({ success: true });
      expect(interviewDb.updateParticipantStatus).toHaveBeenCalledWith(
        PARTICIPANT_ID,
        "reschedule_requested",
        "I have a conflicting appointment that day"
      );
    });

    it("throws BAD_REQUEST when status is not pending or confirmed", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(interviewDb.getParticipantById).mockResolvedValue({
        id: PARTICIPANT_ID,
        candidate_id: MOCK_IDS.candidate,
        status: "attended",
      } as any);

      const caller = createCaller(candidateContext());
      await expect(
        caller.requestReschedule({
          participantId: PARTICIPANT_ID,
          reason: "Need to reschedule this interview please",
        })
      ).rejects.toThrow("Cannot request reschedule");
    });

    it("validates reason minimum length", async () => {
      const caller = createCaller(candidateContext());
      await expect(
        caller.requestReschedule({
          participantId: PARTICIPANT_ID,
          reason: "short",
        })
      ).rejects.toThrow();
    });

    it("throws FORBIDDEN when participant belongs to another candidate", async () => {
      vi.mocked(db.getCandidateByUserId).mockResolvedValue(mockCandidate() as any);
      vi.mocked(interviewDb.getParticipantById).mockResolvedValue({
        id: PARTICIPANT_ID,
        candidate_id: "other-candidate-id",
        status: "pending",
      } as any);

      const caller = createCaller(candidateContext());
      await expect(
        caller.requestReschedule({
          participantId: PARTICIPANT_ID,
          reason: "I have a conflicting appointment that day",
        })
      ).rejects.toThrow("Not authorized");
    });
  });
});
