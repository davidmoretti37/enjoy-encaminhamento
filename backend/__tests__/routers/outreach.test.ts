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
  getAgencyByUserId: vi.fn(),
  getAdminAgencyContext: vi.fn(),
  createEmailOutreach: vi.fn(),
  getEmailOutreachHistory: vi.fn(),
  getAdminAvailability: vi.fn(),
  createAdminAvailability: vi.fn(),
  deleteAdminAvailability: vi.fn(),
  getAdminSettings: vi.fn(),
  saveAdminSettings: vi.fn(),
  getBlockedSlots: vi.fn(),
  getAllSlotsForDate: vi.fn(),
  blockTimeSlot: vi.fn(),
  unblockTimeSlot: vi.fn(),
  getScheduledMeetings: vi.fn(),
  getMeetingById: vi.fn(),
  updateMeetingStatus: vi.fn(),
  rescheduleMeeting: vi.fn(),
  getAvailableSlots: vi.fn(),
  createScheduledMeeting: vi.fn(),
  getMeetingByToken: vi.fn(),
  cancelMeetingByToken: vi.fn(),
  confirmMeetingByToken: vi.fn(),
  updateMeetingLink: vi.fn(),
  getScheduledMeetingById: vi.fn(),
  sendContractToMeeting: vi.fn(),
  getMeetingByContractToken: vi.fn(),
  getCompanyFormByEmail: vi.fn(),
  getCompanyByEmail: vi.fn(),
  getAgencyById: vi.fn(),
  getAutentiqueDocumentsByContext: vi.fn(),
  signMeetingContract: vi.fn(),
  getCompanyFormByEmailOnly: vi.fn(),
  updateCompanyPipelineStatus: vi.fn(),
  getCompanyById: vi.fn(),
  createCompanyRegistrationToken: vi.fn(),
  getCompanyByRegistrationToken: vi.fn(),
  completeCompanyRegistration: vi.fn(),
  createCompanyForm: vi.fn(),
  deleteCompanyForm: vi.fn(),
  updateCompanyFormStatus: vi.fn(),
  getCompanyFormsByAdmin: vi.fn(),
  getCompanyFullHistory: vi.fn(),
  updateScheduledMeeting: vi.fn(),
  createAutentiqueDocument: vi.fn(),
  getDocumentTemplates: vi.fn(),
  createCompanyWithUser: vi.fn(),
  createJobFromCompanyForm: vi.fn(),
  updateCompany: vi.fn(),
  createMeetingForCompany: vi.fn(),
  getScheduledMeetingByEmail: vi.fn(),
  updateMeetingContract: vi.fn(),
}));

vi.mock("../../routers/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../integrations/zoom", () => ({
  createZoomMeeting: vi.fn(),
  isZoomConfigured: vi.fn().mockReturnValue(false),
}));

vi.mock("../../integrations/googleMeet", () => ({
  createGoogleMeeting: vi.fn(),
  isGoogleMeetConfigured: vi.fn().mockReturnValue(false),
}));

vi.mock("../../integrations/autentique", () => ({
  createDocument: vi.fn(),
  isAutentiqueConfigured: vi.fn().mockReturnValue(false),
  getDocumentStatus: vi.fn(),
}));

vi.mock("../../_core/env", () => ({
  ENV: {
    appUrl: "http://localhost:5173",
  },
}));

vi.mock("../../_core/htmlEscape", () => ({
  escapeHtml: vi.fn((str: string) => str),
}));

vi.mock("../../_core/passwordSchema", () => {
  const { z } = require("zod");
  return { passwordSchema: z.string().min(8) };
});

vi.mock("../../services/ai/summarizer", () => ({
  generateCompanySummary: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://storage.test/file.pdf" }),
}));

import { outreachRouter } from "../../routers/outreach";
import * as _db from "../../db";
const db: any = _db;
import { sendEmail } from "../../routers/email";
import { isZoomConfigured, createZoomMeeting } from "../../integrations/zoom";
import {
  isGoogleMeetConfigured,
  createGoogleMeeting,
} from "../../integrations/googleMeet";
import {
  agencyContext,
  adminContext,
  candidateContext,
  companyContext,
  unauthenticatedContext,
} from "../helpers/mock-context";
import { mockAgency, mockCompany, MOCK_IDS } from "../helpers/mock-data";

const createCaller = (ctx: any) => outreachRouter.createCaller(ctx);

const MEETING_ID = "70000000-0000-4000-8000-000000000001";
const TOKEN_ID = "80000000-0000-4000-8000-000000000001";

describe("outreach router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // sendEmail
  // ============================================
  describe("sendEmail", () => {
    const validInput = {
      recipientEmail: "company@test.com",
      subject: "Job opportunity",
      body: "We have a great position for you",
    };

    it("sends outreach email successfully", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.createEmailOutreach).mockResolvedValue(undefined);
      vi.mocked(sendEmail).mockResolvedValue(undefined);

      const caller = createCaller(agencyContext());
      const result = await caller.sendEmail(validInput);

      expect(result.success).toBe(true);
      expect(db.createEmailOutreach).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: "company@test.com",
          subject: "Job opportunity",
          emailType: "outreach",
        })
      );
      expect(sendEmail).toHaveBeenCalledWith(
        "company@test.com",
        "Job opportunity",
        expect.stringContaining("We have a great position for you")
      );
    });

    it("includes form and booking links by default", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.createEmailOutreach).mockResolvedValue(undefined);
      vi.mocked(sendEmail).mockResolvedValue(undefined);

      const caller = createCaller(agencyContext());
      await caller.sendEmail(validInput);

      const htmlBody = vi.mocked(sendEmail).mock.calls[0][2];
      expect(htmlBody).toContain("/form/");
      expect(htmlBody).toContain("/book/");
    });

    it("excludes links when flags are false", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.createEmailOutreach).mockResolvedValue(undefined);
      vi.mocked(sendEmail).mockResolvedValue(undefined);

      const caller = createCaller(agencyContext());
      await caller.sendEmail({
        ...validInput,
        includeFormLink: false,
        includeBookingLink: false,
      });

      const htmlBody = vi.mocked(sendEmail).mock.calls[0][2];
      expect(htmlBody).not.toContain("/form/");
      expect(htmlBody).not.toContain("/book/");
    });

    it("throws INTERNAL_SERVER_ERROR when email send fails", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.createEmailOutreach).mockResolvedValue(undefined);
      vi.mocked(sendEmail).mockRejectedValue(new Error("SMTP connection failed"));

      const caller = createCaller(agencyContext());
      await expect(caller.sendEmail(validInput)).rejects.toThrow(
        "Erro ao enviar email"
      );
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.sendEmail(validInput)).rejects.toThrow(
        "Agency access required"
      );
    });

    it("rejects company users", async () => {
      const caller = createCaller(companyContext());
      await expect(caller.sendEmail(validInput)).rejects.toThrow(
        "Agency access required"
      );
    });

    it("validates email format", async () => {
      const caller = createCaller(agencyContext());
      await expect(
        caller.sendEmail({ ...validInput, recipientEmail: "not-an-email" })
      ).rejects.toThrow();
    });

    it("validates subject is not empty", async () => {
      const caller = createCaller(agencyContext());
      await expect(
        caller.sendEmail({ ...validInput, subject: "" })
      ).rejects.toThrow();
    });

    it("allows admin to send emails", async () => {
      vi.mocked(db.getAdminAgencyContext).mockResolvedValue(MOCK_IDS.agency);
      vi.mocked(db.createEmailOutreach).mockResolvedValue(undefined);
      vi.mocked(sendEmail).mockResolvedValue(undefined);

      const caller = createCaller(adminContext());
      const result = await caller.sendEmail(validInput);
      expect(result.success).toBe(true);
    });
  });

  // ============================================
  // getEmailHistory
  // ============================================
  describe("getEmailHistory", () => {
    it("returns email history for admin", async () => {
      const mockHistory = [
        { id: "1", recipientEmail: "co@test.com", subject: "Test" },
      ];
      vi.mocked(db.getEmailOutreachHistory).mockResolvedValue(mockHistory);

      const caller = createCaller(adminContext());
      const result = await caller.getEmailHistory();

      expect(result).toEqual(mockHistory);
    });

    it("filters by companyId when provided", async () => {
      vi.mocked(db.getEmailOutreachHistory).mockResolvedValue([]);

      const caller = createCaller(adminContext());
      await caller.getEmailHistory({ companyId: MOCK_IDS.company });

      expect(db.getEmailOutreachHistory).toHaveBeenCalledWith(
        "aa000000-0000-4000-8000-000000000001",
        MOCK_IDS.company
      );
    });

    it("rejects agency users (admin only)", async () => {
      const caller = createCaller(agencyContext());
      await expect(caller.getEmailHistory()).rejects.toThrow(
        "Admin access required"
      );
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.getEmailHistory()).rejects.toThrow(
        "Admin access required"
      );
    });
  });

  // ============================================
  // getAdminSettings / saveAdminSettings
  // ============================================
  describe("getAdminSettings", () => {
    it("returns settings for agency user", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.getAdminSettings).mockResolvedValue({
        meeting_duration_minutes: 45,
      });

      const caller = createCaller(agencyContext());
      const result = await caller.getAdminSettings();

      expect(result.meeting_duration_minutes).toBe(45);
    });

    it("returns default settings when none exist", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.getAdminSettings).mockResolvedValue(null);

      const caller = createCaller(agencyContext());
      const result = await caller.getAdminSettings();

      expect(result.meeting_duration_minutes).toBe(30);
    });

    it("rejects candidate users", async () => {
      const caller = createCaller(candidateContext());
      await expect(caller.getAdminSettings()).rejects.toThrow(
        "Agency access required"
      );
    });
  });

  describe("saveAdminSettings", () => {
    it("saves settings successfully", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.saveAdminSettings).mockResolvedValue(undefined);

      const caller = createCaller(agencyContext());
      const result = await caller.saveAdminSettings({
        meeting_duration_minutes: 60,
      });

      expect(result).toEqual({ success: true });
      expect(db.saveAdminSettings).toHaveBeenCalledWith(
        "ee000000-0000-4000-8000-000000000004",
        { meeting_duration_minutes: 60 },
        MOCK_IDS.agency
      );
    });

    it("validates duration range", async () => {
      const caller = createCaller(agencyContext());
      await expect(
        caller.saveAdminSettings({ meeting_duration_minutes: 3 })
      ).rejects.toThrow();
      await expect(
        caller.saveAdminSettings({ meeting_duration_minutes: 200 })
      ).rejects.toThrow();
    });
  });

  // ============================================
  // getAvailability / saveAvailability / deleteAvailability
  // ============================================
  describe("getAvailability", () => {
    it("returns availability for agency user", async () => {
      const mockSlots = [{ id: "1", dayOfWeek: 1, startTime: "09:00" }];
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.getAdminAvailability).mockResolvedValue(mockSlots);

      const caller = createCaller(agencyContext());
      const result = await caller.getAvailability();
      expect(result).toEqual(mockSlots);
    });
  });

  describe("saveAvailability", () => {
    it("saves availability successfully", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.createAdminAvailability).mockResolvedValue({ id: "1" });

      const caller = createCaller(agencyContext());
      const result = await caller.saveAvailability({
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
      });

      expect(result).toEqual({ id: "1" });
    });
  });

  describe("deleteAvailability", () => {
    it("deletes availability successfully", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.deleteAdminAvailability).mockResolvedValue(undefined);

      const caller = createCaller(agencyContext());
      const result = await caller.deleteAvailability({ id: MEETING_ID });
      expect(result).toEqual({ success: true });
    });
  });

  // ============================================
  // getBlockedSlots
  // ============================================
  describe("getBlockedSlots", () => {
    it("returns blocked slots", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.getBlockedSlots).mockResolvedValue([]);

      const caller = createCaller(agencyContext());
      const result = await caller.getBlockedSlots({ date: "2026-04-01" });
      expect(result).toEqual([]);
    });

    it("throws BAD_REQUEST when agency cannot be resolved", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(undefined as any);

      const caller = createCaller(agencyContext());
      await expect(
        caller.getBlockedSlots({ date: "2026-04-01" })
      ).rejects.toThrow("Could not resolve agency context");
    });
  });

  // ============================================
  // getMeetings
  // ============================================
  describe("getMeetings", () => {
    it("returns meetings for agency user", async () => {
      const mockMeetings = [{ id: MEETING_ID, status: "pending" }];
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.getScheduledMeetings).mockResolvedValue(mockMeetings);

      const caller = createCaller(agencyContext());
      const result = await caller.getMeetings();
      expect(result).toEqual(mockMeetings);
    });

    it("filters by status when provided", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.getScheduledMeetings).mockResolvedValue([]);

      const caller = createCaller(agencyContext());
      await caller.getMeetings({ status: "confirmed" });

      expect(db.getScheduledMeetings).toHaveBeenCalledWith(
        "ee000000-0000-4000-8000-000000000004",
        "confirmed",
        MOCK_IDS.agency
      );
    });
  });

  // ============================================
  // updateMeetingStatus
  // ============================================
  describe("updateMeetingStatus", () => {
    it("updates meeting status and sends confirmation email", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.getMeetingById).mockResolvedValue({
        id: MEETING_ID,
        company_email: "co@test.com",
        contact_name: "John",
        scheduled_at: "2026-04-15T14:00:00.000Z",
      });
      vi.mocked(db.updateMeetingStatus).mockResolvedValue(undefined);
      vi.mocked(sendEmail).mockResolvedValue(undefined);

      const caller = createCaller(agencyContext());
      const result = await caller.updateMeetingStatus({
        id: MEETING_ID,
        status: "confirmed",
      });

      expect(result).toEqual({ success: true });
      expect(sendEmail).toHaveBeenCalled();
    });

    it("sends cancellation email with reason", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.getMeetingById).mockResolvedValue({
        id: MEETING_ID,
        company_email: "co@test.com",
        contact_name: "John",
        scheduled_at: "2026-04-15T14:00:00.000Z",
        agency_id: MOCK_IDS.agency,
      });
      vi.mocked(db.updateMeetingStatus).mockResolvedValue(undefined);
      vi.mocked(sendEmail).mockResolvedValue(undefined);

      const caller = createCaller(agencyContext());
      await caller.updateMeetingStatus({
        id: MEETING_ID,
        status: "cancelled",
        cancellationReason: "Schedule conflict",
      });

      const htmlBody = vi.mocked(sendEmail).mock.calls[0][2];
      expect(htmlBody).toContain("Cancelada");
    });

    it("skips email when sendEmail is false", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.getMeetingById).mockResolvedValue({
        id: MEETING_ID,
        company_email: "co@test.com",
        scheduled_at: "2026-04-15T14:00:00.000Z",
      });
      vi.mocked(db.updateMeetingStatus).mockResolvedValue(undefined);

      const caller = createCaller(agencyContext());
      await caller.updateMeetingStatus({
        id: MEETING_ID,
        status: "completed",
        sendEmail: false,
      });

      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // rescheduleMeeting
  // ============================================
  describe("rescheduleMeeting", () => {
    it("reschedules meeting and sends email", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.getMeetingById).mockResolvedValue({
        id: MEETING_ID,
        company_email: "co@test.com",
        contact_name: "John",
        confirmation_token: TOKEN_ID,
      });
      vi.mocked(db.rescheduleMeeting).mockResolvedValue(undefined);
      vi.mocked(sendEmail).mockResolvedValue(undefined);

      const caller = createCaller(agencyContext());
      const result = await caller.rescheduleMeeting({
        id: MEETING_ID,
        newScheduledAt: "2026-04-20T10:00:00.000Z",
      });

      expect(result).toEqual({ success: true });
      expect(db.rescheduleMeeting).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
    });

    it("throws NOT_FOUND when meeting not found", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.getMeetingById).mockResolvedValue(null);

      const caller = createCaller(agencyContext());
      await expect(
        caller.rescheduleMeeting({
          id: MEETING_ID,
          newScheduledAt: "2026-04-20T10:00:00.000Z",
        })
      ).rejects.toThrow("não encontrada");
    });
  });

  // ============================================
  // Public endpoints
  // ============================================
  describe("getAvailableSlots (public)", () => {
    it("returns available slots", async () => {
      const mockSlots = [{ time: "09:00" }, { time: "10:00" }];
      vi.mocked(db.getAvailableSlots).mockResolvedValue(mockSlots);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.getAvailableSlots({
        adminId: MOCK_IDS.user.admin,
        date: "2026-04-15",
      });

      expect(result).toEqual(mockSlots);
    });
  });

  describe("createBooking (public)", () => {
    it("creates a booking successfully", async () => {
      const mockMeeting = { id: MEETING_ID, confirmation_token: TOKEN_ID };
      vi.mocked(db.createScheduledMeeting).mockResolvedValue(mockMeeting);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.createBooking({
        adminId: MOCK_IDS.user.admin,
        scheduledAt: "2026-04-15T14:00:00.000Z",
        companyEmail: "newco@test.com",
        companyName: "New Company",
      });

      expect(result).toEqual(mockMeeting);
    });

    it("validates email format", async () => {
      const caller = createCaller(unauthenticatedContext());
      await expect(
        caller.createBooking({
          adminId: MOCK_IDS.user.admin,
          scheduledAt: "2026-04-15T14:00:00.000Z",
          companyEmail: "not-email",
        })
      ).rejects.toThrow();
    });
  });

  describe("getMeetingByToken (public)", () => {
    it("returns meeting by token", async () => {
      const mockMeeting = { id: MEETING_ID, status: "pending" };
      vi.mocked(db.getMeetingByToken).mockResolvedValue(mockMeeting);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.getMeetingByToken({ token: TOKEN_ID });
      expect(result).toEqual(mockMeeting);
    });
  });

  describe("cancelMeetingByToken (public)", () => {
    it("cancels meeting by token", async () => {
      vi.mocked(db.cancelMeetingByToken).mockResolvedValue(undefined);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.cancelMeetingByToken({
        token: TOKEN_ID,
        reason: "Changed plans",
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("confirmMeetingByToken (public)", () => {
    it("confirms meeting by token", async () => {
      vi.mocked(db.confirmMeetingByToken).mockResolvedValue(undefined);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.confirmMeetingByToken({ token: TOKEN_ID });
      expect(result).toEqual({ success: true });
    });
  });

  // ============================================
  // createZoomMeeting
  // ============================================
  describe("createZoomMeeting", () => {
    it("throws PRECONDITION_FAILED when Zoom is not configured", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.getMeetingById).mockResolvedValue({
        id: MEETING_ID,
        scheduled_at: "2026-04-15T14:00:00.000Z",
        company_email: "co@test.com",
      });
      vi.mocked(isZoomConfigured).mockReturnValue(false);

      const caller = createCaller(agencyContext());
      await expect(
        caller.createZoomMeeting({ meetingId: MEETING_ID })
      ).rejects.toThrow("Zoom não está configurado");
    });

    it("throws NOT_FOUND when meeting not found", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.getMeetingById).mockResolvedValue(null);

      const caller = createCaller(agencyContext());
      await expect(
        caller.createZoomMeeting({ meetingId: MEETING_ID })
      ).rejects.toThrow("não encontrada");
    });

    it("creates Zoom meeting and sends email when configured", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.getMeetingById).mockResolvedValue({
        id: MEETING_ID,
        scheduled_at: "2026-04-15T14:00:00.000Z",
        company_email: "co@test.com",
        company_name: "Test Co",
        duration_minutes: 30,
      });
      vi.mocked(isZoomConfigured).mockReturnValue(true);
      vi.mocked(createZoomMeeting).mockResolvedValue({
        joinUrl: "https://zoom.us/j/123",
        startUrl: "https://zoom.us/s/123",
        meetingId: "123",
      } as any);
      vi.mocked(db.updateMeetingLink).mockResolvedValue(undefined);
      vi.mocked(sendEmail).mockResolvedValue(undefined);

      const caller = createCaller(agencyContext());
      const result = await caller.createZoomMeeting({ meetingId: MEETING_ID });

      expect(result.success).toBe(true);
      expect(result.joinUrl).toBe("https://zoom.us/j/123");
      expect(sendEmail).toHaveBeenCalled();
    });
  });

  // ============================================
  // createGoogleMeeting
  // ============================================
  describe("createGoogleMeeting", () => {
    it("throws PRECONDITION_FAILED when Google Meet is not configured", async () => {
      vi.mocked(db.getAgencyByUserId).mockResolvedValue(mockAgency() as any);
      vi.mocked(db.getMeetingById).mockResolvedValue({
        id: MEETING_ID,
        scheduled_at: "2026-04-15T14:00:00.000Z",
        company_email: "co@test.com",
      });
      vi.mocked(isGoogleMeetConfigured).mockReturnValue(false);

      const caller = createCaller(agencyContext());
      await expect(
        caller.createGoogleMeeting({ meetingId: MEETING_ID })
      ).rejects.toThrow("Google não está configurado");
    });
  });

  // ============================================
  // updatePipelineStatus (admin only)
  // ============================================
  describe("updatePipelineStatus", () => {
    it("updates pipeline status successfully", async () => {
      vi.mocked(db.updateCompanyPipelineStatus).mockResolvedValue(undefined);

      const caller = createCaller(adminContext());
      const result = await caller.updatePipelineStatus({
        companyId: MOCK_IDS.company,
        status: "meeting_done",
      });

      expect(result).toEqual({ success: true });
      expect(db.updateCompanyPipelineStatus).toHaveBeenCalledWith(
        MOCK_IDS.company,
        "meeting_done"
      );
    });

    it("rejects agency users", async () => {
      const caller = createCaller(agencyContext());
      await expect(
        caller.updatePipelineStatus({
          companyId: MOCK_IDS.company,
          status: "lead",
        })
      ).rejects.toThrow("Admin access required");
    });

    it("validates status enum", async () => {
      const caller = createCaller(adminContext());
      await expect(
        caller.updatePipelineStatus({
          companyId: MOCK_IDS.company,
          status: "invalid_status" as any,
        })
      ).rejects.toThrow();
    });
  });

  // ============================================
  // sendContract (admin only)
  // ============================================
  describe("sendContract", () => {
    it("sends contract email successfully", async () => {
      vi.mocked(db.getScheduledMeetingById).mockResolvedValue({
        id: MEETING_ID,
        company_email: "co@test.com",
        company_name: "Test Co",
        agency_id: MOCK_IDS.agency,
      });
      vi.mocked(db.sendContractToMeeting).mockResolvedValue(TOKEN_ID);
      vi.mocked(sendEmail).mockResolvedValue(undefined);

      const caller = createCaller(adminContext());
      const result = await caller.sendContract({ meetingId: MEETING_ID });

      expect(result.success).toBe(true);
      expect(result.contractToken).toBe(TOKEN_ID);
      expect(sendEmail).toHaveBeenCalled();
    });

    it("throws NOT_FOUND when meeting not found", async () => {
      vi.mocked(db.getScheduledMeetingById).mockResolvedValue(null);

      const caller = createCaller(adminContext());
      await expect(
        caller.sendContract({ meetingId: MEETING_ID })
      ).rejects.toThrow("Meeting not found");
    });

    it("rejects agency users", async () => {
      const caller = createCaller(agencyContext());
      await expect(
        caller.sendContract({ meetingId: MEETING_ID })
      ).rejects.toThrow("Admin access required");
    });
  });

  // ============================================
  // getCompanyByContractToken (public)
  // ============================================
  describe("getCompanyByContractToken", () => {
    it("returns company data by contract token", async () => {
      vi.mocked(db.getMeetingByContractToken).mockResolvedValue({
        id: MEETING_ID,
        company_name: "Test Co",
        company_email: "co@test.com",
        contact_name: "John",
        contact_phone: "123456",
        admin_id: MOCK_IDS.user.admin,
        contract_signed_at: null,
        agency_id: null,
        autentique_sign_url: null,
        autentique_document_ids: null,
      });
      vi.mocked(db.getCompanyFormByEmail).mockResolvedValue(null);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.getCompanyByContractToken({ token: TOKEN_ID });

      expect(result.company_name).toBe("Test Co");
      expect(result.company_email).toBe("co@test.com");
    });

    it("throws NOT_FOUND when token is invalid", async () => {
      vi.mocked(db.getMeetingByContractToken).mockResolvedValue(null);

      const caller = createCaller(unauthenticatedContext());
      await expect(
        caller.getCompanyByContractToken({ token: TOKEN_ID })
      ).rejects.toThrow("Invalid contract link");
    });
  });

  // ============================================
  // signContract (public)
  // ============================================
  describe("signContract", () => {
    it("signs contract and returns registration URL", async () => {
      vi.mocked(db.signMeetingContract).mockResolvedValue({
        company_email: "co@test.com",
      });
      vi.mocked(db.getCompanyFormByEmailOnly).mockResolvedValue({
        legal_name: "Test Co Ltda",
      });
      vi.mocked(sendEmail).mockResolvedValue(undefined);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.signContract({
        contractToken: TOKEN_ID,
        signature: "base64-signature-data",
        signerName: "John Doe",
        signerCpf: "12345678901",
      });

      expect(result.success).toBe(true);
      expect(result.registrationUrl).toContain(`/company/register/${TOKEN_ID}`);
      expect(result.companyName).toBe("Test Co Ltda");
    });
  });

  // ============================================
  // approveContract (admin only)
  // ============================================
  describe("approveContract", () => {
    it("approves contract and sends registration link", async () => {
      vi.mocked(db.getCompanyById).mockResolvedValue(
        mockCompany({ pipeline_status: "contract_signed" }) as any
      );
      vi.mocked(db.createCompanyRegistrationToken).mockResolvedValue(TOKEN_ID);
      vi.mocked(sendEmail).mockResolvedValue(undefined);

      const caller = createCaller(adminContext());
      const result = await caller.approveContract({
        companyId: MOCK_IDS.company,
      });

      expect(result).toEqual({ success: true });
      expect(sendEmail).toHaveBeenCalled();
    });

    it("throws NOT_FOUND when company not found", async () => {
      vi.mocked(db.getCompanyById).mockResolvedValue(null);

      const caller = createCaller(adminContext());
      await expect(
        caller.approveContract({ companyId: MOCK_IDS.company })
      ).rejects.toThrow("Company not found");
    });

    it("throws BAD_REQUEST when contract not signed", async () => {
      vi.mocked(db.getCompanyById).mockResolvedValue(
        mockCompany({ pipeline_status: "meeting_done" }) as any
      );

      const caller = createCaller(adminContext());
      await expect(
        caller.approveContract({ companyId: MOCK_IDS.company })
      ).rejects.toThrow("Contract has not been signed");
    });

    it("rejects agency users", async () => {
      const caller = createCaller(agencyContext());
      await expect(
        caller.approveContract({ companyId: MOCK_IDS.company })
      ).rejects.toThrow("Admin access required");
    });
  });

  // ============================================
  // rejectCompany (admin only)
  // ============================================
  describe("rejectCompany", () => {
    it("rejects company and deletes form", async () => {
      vi.mocked(db.getScheduledMeetingById).mockResolvedValue({
        id: MEETING_ID,
        company_email: "co@test.com",
      });
      vi.mocked(db.getCompanyFormByEmail).mockResolvedValue({ id: "form-1" });
      vi.mocked(db.deleteCompanyForm).mockResolvedValue(undefined);

      const caller = createCaller(adminContext());
      const result = await caller.rejectCompany({ meetingId: MEETING_ID });

      expect(result).toEqual({ success: true });
      expect(db.deleteCompanyForm).toHaveBeenCalledWith("form-1");
    });

    it("throws NOT_FOUND when meeting not found", async () => {
      vi.mocked(db.getScheduledMeetingById).mockResolvedValue(null);

      const caller = createCaller(adminContext());
      await expect(
        caller.rejectCompany({ meetingId: MEETING_ID })
      ).rejects.toThrow("Meeting not found");
    });

    it("succeeds even when no form exists", async () => {
      vi.mocked(db.getScheduledMeetingById).mockResolvedValue({
        id: MEETING_ID,
        company_email: "co@test.com",
      });
      vi.mocked(db.getCompanyFormByEmail).mockResolvedValue(null);

      const caller = createCaller(adminContext());
      const result = await caller.rejectCompany({ meetingId: MEETING_ID });
      expect(result).toEqual({ success: true });
      expect(db.deleteCompanyForm).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // submitCompanyForm (public)
  // ============================================
  describe("submitCompanyForm", () => {
    it("submits company form successfully", async () => {
      vi.mocked(db.createCompanyForm).mockResolvedValue({ id: "form-1" });

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.submitCompanyForm({
        adminId: MOCK_IDS.user.admin,
        email: "newco@test.com",
        cnpj: "12345678000199",
        legalName: "New Company Ltda",
        jobTitle: "Software Engineer",
        compensation: "R$ 5.000",
        mainActivities: "Software development",
        requiredSkills: "React, Node.js",
        educationLevel: "Superior",
        workSchedule: "08:00-17:00",
      });

      expect(result.success).toBe(true);
      expect(result.formId).toBe("form-1");
    });

    it("validates required fields", async () => {
      const caller = createCaller(unauthenticatedContext());
      await expect(
        caller.submitCompanyForm({
          adminId: MOCK_IDS.user.admin,
          email: "newco@test.com",
          cnpj: "12345678000199",
          legalName: "",
          jobTitle: "Engineer",
          compensation: "R$ 5.000",
          mainActivities: "Dev",
          requiredSkills: "React",
          educationLevel: "Superior",
          workSchedule: "08:00-17:00",
        })
      ).rejects.toThrow();
    });
  });

  // ============================================
  // checkFormExists (public)
  // ============================================
  describe("checkFormExists", () => {
    it("returns true when form exists", async () => {
      vi.mocked(db.getCompanyFormByEmail).mockResolvedValue({ id: "form-1" });

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.checkFormExists({
        adminId: MOCK_IDS.user.admin,
        email: "co@test.com",
      });
      expect(result.exists).toBe(true);
    });

    it("returns false when form does not exist", async () => {
      vi.mocked(db.getCompanyFormByEmail).mockResolvedValue(null);

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.checkFormExists({
        adminId: MOCK_IDS.user.admin,
        email: "new@test.com",
      });
      expect(result.exists).toBe(false);
    });
  });

  // ============================================
  // getCompanyByRegistrationToken (public)
  // ============================================
  describe("getCompanyByRegistrationToken", () => {
    it("returns company by registration token", async () => {
      vi.mocked(db.getCompanyByRegistrationToken).mockResolvedValue({
        id: MOCK_IDS.company,
        company_name: "Test Co",
        email: "co@test.com",
        isExpired: false,
      });

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.getCompanyByRegistrationToken({
        token: TOKEN_ID,
      });
      expect(result.company_name).toBe("Test Co");
    });

    it("throws NOT_FOUND when token invalid", async () => {
      vi.mocked(db.getCompanyByRegistrationToken).mockResolvedValue(null);

      const caller = createCaller(unauthenticatedContext());
      await expect(
        caller.getCompanyByRegistrationToken({ token: TOKEN_ID })
      ).rejects.toThrow("Invalid registration link");
    });

    it("throws BAD_REQUEST when token expired", async () => {
      vi.mocked(db.getCompanyByRegistrationToken).mockResolvedValue({
        id: MOCK_IDS.company,
        company_name: "Test Co",
        email: "co@test.com",
        isExpired: true,
      });

      const caller = createCaller(unauthenticatedContext());
      await expect(
        caller.getCompanyByRegistrationToken({ token: TOKEN_ID })
      ).rejects.toThrow("Registration link has expired");
    });
  });

  // ============================================
  // completeRegistration (public)
  // ============================================
  describe("completeRegistration", () => {
    it("completes registration successfully", async () => {
      vi.mocked(db.completeCompanyRegistration).mockResolvedValue({
        user: { email: "co@test.com" },
      });

      const caller = createCaller(unauthenticatedContext());
      const result = await caller.completeRegistration({
        registrationToken: TOKEN_ID,
        password: "StrongPass123!",
      });

      expect(result.success).toBe(true);
      expect(result.email).toBe("co@test.com");
    });
  });
});
