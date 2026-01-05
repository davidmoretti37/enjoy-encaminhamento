// @ts-nocheck
/**
 * Job Router - Job management
 */
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { publicProcedure } from "../_core/trpc";
import { adminProcedure, companyProcedure, candidateProcedure, schoolProcedure } from "./procedures";
import * as db from "../db";
import { supabaseAdmin } from "../supabase";
import { generateJobSummary } from "../services/ai/summarizer";
import { generateJobEmbedding, findMatchingCandidates } from "../services/matching";

export const jobRouter = router({
  // Create job posting
  create: companyProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      contractType: z.enum(["estagio", "clt", "menor-aprendiz"]),
      workType: z.enum(["presencial", "remoto", "hibrido"]),
      location: z.string().optional(),
      salary: z.number().optional(),
      benefits: z.string().optional(),
      minEducationLevel: z.enum(["fundamental", "medio", "superior", "pos-graduacao"]).optional(),
      requiredSkills: z.string().optional(),
      openings: z.number().default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }

      // Create job in database
      const jobId = await db.createJob({
        companyId: company.id,
        ...input,
      });

      // Generate AI summary in background (fire and forget)
      generateJobSummary({
        title: input.title,
        description: input.description,
        contractType: input.contractType,
        workType: input.workType,
        city: input.location?.split(',')[0]?.trim(),
        state: input.location?.split(',')[1]?.trim(),
        requirements: input.requiredSkills,
        benefits: input.benefits,
        salary: input.salary ? `R$ ${input.salary}` : undefined,
        companyName: company.company_name,
      }).then(async (summary) => {
        if (summary) {
          await db.updateJob(jobId, {
            summary,
            summary_generated_at: new Date().toISOString(),
          });
          console.log(`Generated summary for job ${jobId}`);
          // Generate embedding from summary
          await generateJobEmbedding(jobId);
        }
      }).catch((err) => {
        console.error('Failed to generate job summary:', err);
      });

      return { jobId };
    }),

  // Update job
  update: companyProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["draft", "open", "closed", "filled"]).optional(),
      salary: z.number().optional(),
      openings: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const job = await db.getJobById(id);
      if (!job) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      const company = await db.getCompanyByUserId(ctx.user.id);
      if (job.companyId !== company?.id && ctx.user.role !== 'affiliate') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      await db.updateJob(id, data);
      return { success: true };
    }),

  // Get jobs by company
  getByCompany: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) return [];
    return await db.getJobsByCompanyId(company.id);
  }),

  // Get all open jobs (public)
  getAllOpen: publicProcedure.query(async () => {
    return await db.getAllOpenJobs();
  }),

  // Get open jobs for candidates (NO company names - privacy rule)
  getOpenJobsForCandidates: candidateProcedure.query(async () => {
    const jobs = await db.getAllOpenJobs();
    // Strip company information - candidates should not see company names until hired
    return jobs.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      contract_type: job.contract_type,
      work_type: job.work_type,
      location: job.location,
      salary: job.salary,
      benefits: job.benefits,
      min_education_level: job.min_education_level,
      required_skills: job.required_skills,
      required_languages: job.required_languages,
      experience_required: job.experience_required,
      min_experience_years: job.min_experience_years,
      min_age: job.min_age,
      max_age: job.max_age,
      specific_requirements: job.specific_requirements,
      hours_per_week: job.hours_per_week,
      openings: job.openings,
      published_at: job.published_at,
      // Explicitly NOT including: company_id, companies
    }));
  }),

  // Get job by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getJobById(input.id);
    }),

  // Search jobs
  search: publicProcedure
    .input(z.object({
      contractType: z.string().optional(),
      workType: z.string().optional(),
      city: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return await db.searchJobs(input);
    }),

  // Admin routes for job management
  getAll: adminProcedure.query(async () => {
    return await db.getAllJobs();
  }),

  updateStatus: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['draft', 'open', 'closed', 'filled']),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.updateJobStatus(input.id, input.status, ctx.user.id);
      return { success: true };
    }),

  // Get jobs for a school (all jobs from companies linked to this school)
  getBySchool: schoolProcedure.query(async ({ ctx }) => {
    const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
    if (!school) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Escola não encontrada',
      });
    }

    // Get all jobs where school_id matches
    const { data, error } = await supabaseAdmin
      .from('jobs')
      .select(`
        *,
        company:companies(id, company_name, email)
      `)
      .eq('school_id', school.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Job.getBySchool] Error fetching jobs:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro ao buscar vagas',
      });
    }

    return data || [];
  }),

  // Get jobs for a specific company (school/affiliate access)
  getByCompanyId: schoolProcedure
    .input(z.object({
      companyId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
      if (!school) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Escola não encontrada',
        });
      }

      // Get jobs for company - school already verified company belongs to them via affiliate
      const { data, error } = await supabaseAdmin
        .from('jobs')
        .select(`
          *,
          company:companies(id, company_name, email)
        `)
        .eq('company_id', input.companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Job.getByCompanyId] Error fetching jobs:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar vagas da empresa',
        });
      }

      return data || [];
    }),

  // Get matching candidates for a job (using vector similarity)
  getMatchingCandidates: companyProcedure
    .input(z.object({
      jobId: z.string().uuid(),
      threshold: z.number().min(0).max(1).default(0.5),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      // Verify job belongs to company
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }

      const job = await db.getJobById(input.jobId);
      if (!job || job.company_id !== company.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Job not found or access denied' });
      }

      const matches = await findMatchingCandidates(input.jobId, {
        threshold: input.threshold,
        limit: input.limit,
      });

      return matches;
    }),

  // Get matching candidates for a job (school/affiliate access)
  getMatchingCandidatesForSchool: schoolProcedure
    .input(z.object({
      jobId: z.string().uuid(),
      threshold: z.number().min(0).max(1).default(0.5),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
      if (!school) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found' });
      }

      // Verify job belongs to a company linked to this school
      const { data: job, error } = await supabaseAdmin
        .from('jobs')
        .select('id, school_id')
        .eq('id', input.jobId)
        .single();

      if (error || !job || job.school_id !== school.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Job not found or access denied' });
      }

      const matches = await findMatchingCandidates(input.jobId, {
        threshold: input.threshold,
        limit: input.limit,
      });

      return matches;
    }),

  // Regenerate embedding for a job (admin only)
  regenerateEmbedding: adminProcedure
    .input(z.object({
      jobId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const success = await generateJobEmbedding(input.jobId);
      return { success };
    }),
});
