// @ts-nocheck
// Application router - job application management
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { companyProcedure, candidateProcedure } from "./procedures";
import * as db from "../db";
import * as hiringDb from "../db/hiring";

export const applicationRouter = router({
  // Apply to job
  create: candidateProcedure
    .input(z.object({
      job_id: z.string().uuid(),
      cover_letter: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const candidate = await db.getCandidateByUserId(ctx.user.id);
      if (!candidate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Candidate profile not found' });
      }

      // Check if already applied
      const existingApplications = await db.getApplicationsByCandidateId(candidate.id);
      const alreadyApplied = existingApplications.some((app: any) => app.job_id === input.job_id);
      if (alreadyApplied) {
        throw new TRPCError({ code: 'CONFLICT', message: 'You have already applied to this job' });
      }

      const applicationId = await db.createApplication({
        job_id: input.job_id,
        candidate_id: candidate.id,
      });
      return { applicationId };
    }),

  // Get applications by candidate
  getByCandidate: candidateProcedure.query(async ({ ctx }) => {
    const candidate = await db.getCandidateByUserId(ctx.user.id);
    if (!candidate) return [];
    const applications = await db.getApplicationsByCandidateId(candidate.id);

    // Auto-fix: if a hiring process exists but application is still "interviewed", update to "selected"
    for (const app of applications) {
      if (app.status === "interviewed") {
        const hp = await hiringDb.getHiringProcessByApplication(app.id);
        if (hp) {
          await db.updateApplication(app.id, { status: "selected" });
          app.status = "selected";
        }
      }
    }

    // Remap 'jobs' to 'job' and strip company info (ANEC is middleman)
    return applications.map((app: any) => ({
      ...app,
      job: app.jobs ? {
        ...app.jobs,
        companies: undefined,
        company: undefined,
        company_id: undefined,
      } : null,
      jobs: undefined,
    }));
  }),

  // Get applications by job (company only)
  getByJob: companyProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const job = await db.getJobById(input.jobId);
      if (!job) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const company = await db.getCompanyByUserId(ctx.user.id);
      if (job.companyId !== company?.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      return await db.getApplicationsByJobId(input.jobId);
    }),

  // Candidate marks they joined the agency meeting (records timestamp, does NOT change status)
  joinMeeting: candidateProcedure
    .input(z.object({
      applicationId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const candidate = await db.getCandidateByUserId(ctx.user.id);
      if (!candidate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Candidate not found' });
      }

      const applications = await db.getApplicationsByCandidateId(candidate.id);
      const app = applications.find((a: any) => a.id === input.applicationId);
      if (!app) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // Record when the candidate joined the meeting (use interview_date field)
      if (!app.interview_date) {
        await db.updateApplication(input.applicationId, { interview_date: new Date().toISOString() });
      }

      return { success: true };
    }),

  // Update application status
  updateStatus: companyProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(["applied", "screening", "interview-scheduled", "interviewed", "selected", "rejected", "withdrawn"]),
      companyNotes: z.string().optional(),
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateApplication(id, data);
      return { success: true };
    }),
});
