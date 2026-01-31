// @ts-nocheck
// Application router - job application management
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { companyProcedure, candidateProcedure } from "./procedures";
import * as db from "../db";

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

    // Filter out company info unless candidate is hired (status === 'selected')
    return applications.map((app: any) => ({
      ...app,
      jobs: app.jobs ? {
        ...app.jobs,
        // Only include company info if hired
        companies: app.status === 'selected' ? app.jobs.companies : undefined,
        company_id: app.status === 'selected' ? app.jobs.company_id : undefined,
      } : null,
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
