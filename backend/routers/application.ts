// @ts-nocheck
// Application router - job application management
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
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

  // Get applications by job (company, agency, or admin)
  getByJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const job = await db.getJobById(input.jobId);
      if (!job) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Admin/super_admin: full access
      if (ctx.user.role === 'admin' || ctx.user.role === 'super_admin') {
        return await db.getApplicationsByJobId(input.jobId);
      }

      // Company: verify they own the job
      if (ctx.user.role === 'company') {
        const company = await db.getCompanyByUserId(ctx.user.id);
        if (job.companyId !== company?.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        return await db.getApplicationsByJobId(input.jobId);
      }

      // Agency: verify the job belongs to their agency
      if (ctx.user.role === 'agency') {
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency || job.agency_id !== agency.id) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        return await db.getApplicationsByJobId(input.jobId);
      }

      throw new TRPCError({ code: 'FORBIDDEN' });
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

  // Update application status (company, agency, or admin)
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(["applied", "screening", "interview-scheduled", "interviewed", "selected", "rejected", "withdrawn"]),
      companyNotes: z.string().optional(),
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify access: admin always, company owns the job, agency owns the job
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin') {
        const application = await db.getApplicationById(input.id);
        if (!application) throw new TRPCError({ code: 'NOT_FOUND' });
        const job = await db.getJobById(application.job_id);
        if (!job) throw new TRPCError({ code: 'NOT_FOUND' });

        if (ctx.user.role === 'company') {
          const company = await db.getCompanyByUserId(ctx.user.id);
          if (job.companyId !== company?.id) throw new TRPCError({ code: 'FORBIDDEN' });
        } else if (ctx.user.role === 'agency') {
          const agency = await db.getAgencyByUserId(ctx.user.id);
          if (!agency || job.agency_id !== agency.id) throw new TRPCError({ code: 'FORBIDDEN' });
        } else {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
      }

      const { id, ...data } = input;
      await db.updateApplication(id, data);
      return { success: true };
    }),
});
