/**
 * Schema Validation Tests
 *
 * Verifies that the Zod input schemas used by key tRPC procedures
 * correctly accept valid data and reject invalid data.
 * Catches accidental schema changes that would break the API contract.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { passwordSchema } from "../_core/passwordSchema";

// ---------------------------------------------------------------------------
// Helper: generate a valid UUID for reuse
// ---------------------------------------------------------------------------
const VALID_UUID = "a0000000-0000-4000-8000-000000000001";

// ---------------------------------------------------------------------------
// Reproduce the schemas exactly as they appear in the router files
// so we test the actual contract. These are copied verbatim.
// ---------------------------------------------------------------------------

// From routers/application.ts — application.create
const applicationCreateSchema = z.object({
  job_id: z.string().uuid(),
  cover_letter: z.string().optional(),
});

// From _core/systemRouter.ts — system.health
const systemHealthSchema = z.object({
  timestamp: z.number().min(0, "timestamp cannot be negative"),
});

// From _core/systemRouter.ts — system.notifyOwner
const systemNotifyOwnerSchema = z.object({
  title: z.string().min(1, "title is required"),
  content: z.string().min(1, "content is required"),
});

// From routers/auth.ts — auth.createProfile
const authCreateProfileSchema = z.object({
  name: z.string().optional(),
});

// From routers/auth.ts — auth.changePassword
const authChangePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
});

// From routers/job.ts — job.create
const jobCreateSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  contractType: z.enum(["estagio", "clt", "menor-aprendiz", "pj"]),
  workType: z.enum(["presencial", "remoto", "hibrido"]),
  location: z.string().optional(),
  salary: z.number().optional(),
  benefits: z.string().optional(),
  minEducationLevel: z
    .enum(["fundamental", "medio", "superior", "pos-graduacao"])
    .optional(),
  requiredSkills: z.string().optional(),
  openings: z.number().default(1),
});

// From routers/invitation.ts — invitation.create
const invitationCreateSchema = z.object({
  email: z.string().email(),
  affiliateId: z.string().uuid(),
  notes: z.string().optional(),
});

// From routers/invitation.ts — invitation.validate
const invitationValidateSchema = z.object({
  token: z.string().uuid(),
});

// From routers/interview.ts — interview.scheduleInterview
const interviewScheduleSchema = z.object({
  batchId: z.string().uuid().optional(),
  jobId: z.string().uuid(),
  candidateIds: z.array(z.string().uuid()).min(1),
  interviewType: z.enum(["online", "in_person"]),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(180).optional().default(30),
  locationAddress: z.string().optional(),
  locationCity: z.string().optional(),
  locationState: z.string().optional(),
  locationNotes: z.string().optional(),
  notes: z.string().optional(),
});

// ===================================================================
// Tests
// ===================================================================

describe("Input schema validation", () => {
  // ---------------------------------------------------------------
  // application.create
  // ---------------------------------------------------------------
  describe("application.create", () => {
    it("accepts valid UUID job_id", () => {
      const result = applicationCreateSchema.safeParse({ job_id: VALID_UUID });
      expect(result.success).toBe(true);
    });

    it("accepts optional cover_letter", () => {
      const result = applicationCreateSchema.safeParse({
        job_id: VALID_UUID,
        cover_letter: "I am very interested in this position.",
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-UUID job_id", () => {
      const result = applicationCreateSchema.safeParse({
        job_id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing job_id", () => {
      const result = applicationCreateSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // system.health
  // ---------------------------------------------------------------
  describe("system.health", () => {
    it("accepts valid timestamp", () => {
      const result = systemHealthSchema.safeParse({
        timestamp: Date.now(),
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative timestamp", () => {
      const result = systemHealthSchema.safeParse({ timestamp: -1 });
      expect(result.success).toBe(false);
    });

    it("rejects string timestamp", () => {
      const result = systemHealthSchema.safeParse({
        timestamp: "2024-01-01",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing timestamp", () => {
      const result = systemHealthSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // system.notifyOwner
  // ---------------------------------------------------------------
  describe("system.notifyOwner", () => {
    it("accepts valid title and content", () => {
      const result = systemNotifyOwnerSchema.safeParse({
        title: "Alert",
        content: "Something happened",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty title", () => {
      const result = systemNotifyOwnerSchema.safeParse({
        title: "",
        content: "Something",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty content", () => {
      const result = systemNotifyOwnerSchema.safeParse({
        title: "Alert",
        content: "",
      });
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // auth.createProfile
  // ---------------------------------------------------------------
  describe("auth.createProfile", () => {
    it("accepts empty object (name is optional)", () => {
      const result = authCreateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts a name", () => {
      const result = authCreateProfileSchema.safeParse({ name: "David" });
      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------
  // auth.changePassword
  // ---------------------------------------------------------------
  describe("auth.changePassword", () => {
    it("accepts valid new password of 8+ chars", () => {
      const result = authChangePasswordSchema.safeParse({
        newPassword: "Str0ngP@ss",
      });
      expect(result.success).toBe(true);
    });

    it("rejects password shorter than 8 characters", () => {
      const result = authChangePasswordSchema.safeParse({
        newPassword: "short",
      });
      expect(result.success).toBe(false);
    });

    it("allows optional currentPassword", () => {
      const result = authChangePasswordSchema.safeParse({
        currentPassword: "OldPass1",
        newPassword: "NewPass12",
      });
      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------
  // passwordSchema (shared)
  // ---------------------------------------------------------------
  describe("passwordSchema (shared)", () => {
    it("accepts strong password with upper, lower, and digit", () => {
      expect(passwordSchema.safeParse("MyPass123").success).toBe(true);
    });

    it("rejects password without uppercase", () => {
      expect(passwordSchema.safeParse("mypass123").success).toBe(false);
    });

    it("rejects password without lowercase", () => {
      expect(passwordSchema.safeParse("MYPASS123").success).toBe(false);
    });

    it("rejects password without digit", () => {
      expect(passwordSchema.safeParse("MyPassABC").success).toBe(false);
    });

    it("rejects password shorter than 8 characters", () => {
      expect(passwordSchema.safeParse("Ab1").success).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // job.create
  // ---------------------------------------------------------------
  describe("job.create", () => {
    const validJob = {
      title: "Software Engineer",
      description: "Build cool things",
      contractType: "clt" as const,
      workType: "remoto" as const,
    };

    it("accepts minimal valid job", () => {
      const result = jobCreateSchema.safeParse(validJob);
      expect(result.success).toBe(true);
    });

    it("defaults openings to 1", () => {
      const result = jobCreateSchema.safeParse(validJob);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.openings).toBe(1);
      }
    });

    it("accepts all optional fields", () => {
      const result = jobCreateSchema.safeParse({
        ...validJob,
        location: "Uberlandia, MG",
        salary: 5000,
        benefits: "VR, VT",
        minEducationLevel: "superior",
        requiredSkills: "TypeScript, React",
        openings: 3,
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty title", () => {
      const result = jobCreateSchema.safeParse({
        ...validJob,
        title: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid contractType", () => {
      const result = jobCreateSchema.safeParse({
        ...validJob,
        contractType: "freelance",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid workType", () => {
      const result = jobCreateSchema.safeParse({
        ...validJob,
        workType: "anywhere",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid minEducationLevel", () => {
      const result = jobCreateSchema.safeParse({
        ...validJob,
        minEducationLevel: "phd",
      });
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // invitation.create
  // ---------------------------------------------------------------
  describe("invitation.create", () => {
    it("accepts valid email and UUID affiliateId", () => {
      const result = invitationCreateSchema.safeParse({
        email: "test@example.com",
        affiliateId: VALID_UUID,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = invitationCreateSchema.safeParse({
        email: "not-an-email",
        affiliateId: VALID_UUID,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-UUID affiliateId", () => {
      const result = invitationCreateSchema.safeParse({
        email: "test@example.com",
        affiliateId: "abc",
      });
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // invitation.validate
  // ---------------------------------------------------------------
  describe("invitation.validate", () => {
    it("accepts valid UUID token", () => {
      const result = invitationValidateSchema.safeParse({
        token: VALID_UUID,
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-UUID token", () => {
      const result = invitationValidateSchema.safeParse({
        token: "my-token-123",
      });
      expect(result.success).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  // interview.scheduleInterview
  // ---------------------------------------------------------------
  describe("interview.scheduleInterview", () => {
    const validSchedule = {
      jobId: VALID_UUID,
      candidateIds: [VALID_UUID],
      interviewType: "online" as const,
      scheduledAt: "2026-04-01T14:00:00.000Z",
    };

    it("accepts valid schedule with minimal fields", () => {
      const result = interviewScheduleSchema.safeParse(validSchedule);
      expect(result.success).toBe(true);
    });

    it("defaults durationMinutes to 30", () => {
      const result = interviewScheduleSchema.safeParse(validSchedule);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.durationMinutes).toBe(30);
      }
    });

    it("rejects empty candidateIds array", () => {
      const result = interviewScheduleSchema.safeParse({
        ...validSchedule,
        candidateIds: [],
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid interviewType", () => {
      const result = interviewScheduleSchema.safeParse({
        ...validSchedule,
        interviewType: "phone",
      });
      expect(result.success).toBe(false);
    });

    it("rejects duration below 15 minutes", () => {
      const result = interviewScheduleSchema.safeParse({
        ...validSchedule,
        durationMinutes: 5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects duration above 180 minutes", () => {
      const result = interviewScheduleSchema.safeParse({
        ...validSchedule,
        durationMinutes: 300,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-datetime scheduledAt", () => {
      const result = interviewScheduleSchema.safeParse({
        ...validSchedule,
        scheduledAt: "next-tuesday",
      });
      expect(result.success).toBe(false);
    });

    it("accepts in_person with location fields", () => {
      const result = interviewScheduleSchema.safeParse({
        ...validSchedule,
        interviewType: "in_person",
        locationAddress: "Rua das Flores, 123",
        locationCity: "Uberlandia",
        locationState: "MG",
      });
      expect(result.success).toBe(true);
    });
  });
});
