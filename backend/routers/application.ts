// @ts-nocheck
// Application router - job application management
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { companyProcedure, candidateProcedure } from "./procedures";
import * as db from "../db";
import * as hiringDb from "../db/hiring";
import { supabaseAdmin } from "../supabase";

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
    const explicitApps = applications.map((app: any) => ({
      ...app,
      job: app.jobs ? {
        ...app.jobs,
        companies: undefined,
        company: undefined,
        company_id: undefined,
      } : null,
      jobs: undefined,
      source: 'application',
    }));

    // Also fetch agency-initiated funnels (batches containing this candidate)
    const { getBatchesByCandidateId } = await import("../db/batches");
    const batches = await getBatchesByCandidateId(candidate.id);

    // Get candidate's interview participations to determine real funnel position
    const { data: participations } = await supabaseAdmin
      .from('interview_participants')
      .select('candidate_id, status, interview_session_id, session:interview_sessions(id, interview_stage, status, scheduled_at, interview_type, batch_id)')
      .eq('candidate_id', candidate.id);

    const participationMap = new Map<string, any[]>(); // batch_id → participations
    for (const p of participations || []) {
      const batchId = (p.session as any)?.batch_id;
      if (batchId) {
        if (!participationMap.has(batchId)) participationMap.set(batchId, []);
        participationMap.get(batchId)!.push(p);
      }
    }

    // Filter out batches for jobs the candidate already applied to
    const appliedJobIds = new Set(explicitApps.map((a: any) => a.job_id));

    const batchApps = batches
      .filter(b => !appliedJobIds.has(b.job_id))
      .map((batch: any) => {
        // Determine status from interview participations
        const batchParticipations = participationMap.get(batch.id) || [];
        const companyInterview = batchParticipations.find((p: any) => (p.session as any)?.interview_stage === 'company_interview');
        const preSelection = batchParticipations.find((p: any) => (p.session as any)?.interview_stage === 'pre_selection');

        let status = 'screening';
        let interviewDetails = null;

        if (batch.candidateStatus === 'rejected') {
          status = 'rejected';
        } else if (companyInterview) {
          const session = companyInterview.session as any;
          if (session.status === 'completed' && companyInterview.status === 'attended') {
            status = 'interviewed';
          } else {
            status = 'interview-scheduled';
            interviewDetails = {
              scheduledAt: session.scheduled_at,
              interviewType: session.interview_type,
            };
          }
        } else if (batch.candidateStatus === 'approved') {
          status = 'screening'; // Approved in pre-selection, waiting for company interview
        } else if (preSelection) {
          status = 'screening';
        }

        return {
          id: `batch_${batch.id}`,
          job_id: batch.job_id,
          candidate_id: candidate.id,
          status,
          applied_at: batch.created_at,
          job: batch.job ? {
            ...batch.job,
            companies: undefined,
            company: undefined,
            company_id: undefined,
          } : null,
          jobs: batch.job || null,
          source: 'agency_match',
          interviewDetails,
        };
      });

    return [...explicitApps, ...batchApps].sort((a: any, b: any) =>
      new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()
    );
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
