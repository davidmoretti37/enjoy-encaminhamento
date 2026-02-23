// @ts-nocheck
/**
 * Job Router - Job management
 */
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure } from "../_core/trpc";
import { adminProcedure, companyProcedure, candidateProcedure, agencyProcedure } from "./procedures";
import * as db from "../db";
import { supabaseAdmin, withRetry } from "../supabase";
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

  // Create job for a specific company (admin/agency access)
  createForCompany: protectedProcedure
    .input(z.object({
      companyId: z.string().uuid(),
      title: z.string().min(1),
      description: z.string().min(1),
      contractType: z.enum(["estagio", "clt", "menor-aprendiz"]),
      workType: z.enum(["presencial", "remoto", "hibrido"]).default("presencial"),
      workSchedule: z.string().optional(),
      salaryMin: z.number().optional(),
      salaryMax: z.number().optional(),
      requirements: z.string().optional(),
      openings: z.number().default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Allow admin and agency roles
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'agency') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Acesso negado',
        });
      }

      // Get agency_id for the job (only for agency users)
      let agencyId = null;
      if (ctx.user.role === 'agency') {
        const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
        agencyId = agency?.id;
      }

      // Insert job directly
      const { data, error } = await supabaseAdmin.from('jobs').insert({
        company_id: input.companyId,
        agency_id: agencyId,
        title: input.title,
        description: input.description,
        contract_type: input.contractType,
        work_type: input.workType,
        work_schedule: input.workSchedule || null,
        salary_min: input.salaryMin || null,
        salary_max: input.salaryMax || null,
        specific_requirements: input.requirements || null,
        openings: input.openings,
        status: 'open',
        published_at: new Date().toISOString(),
      }).select('id').single();

      if (error) {
        console.error('[Job.createForCompany] Error creating job:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      // Generate AI summary in background (fire and forget)
      generateJobSummary({
        title: input.title,
        description: input.description,
        contractType: input.contractType,
        workType: input.workType,
        requirements: input.requirements,
      }).then(async (summary) => {
        if (summary && data?.id) {
          await db.updateJob(data.id, {
            summary,
            summary_generated_at: new Date().toISOString(),
          });
          console.log(`Generated summary for job ${data.id}`);
          // Generate embedding from summary
          await generateJobEmbedding(data.id);
        }
      }).catch((err) => {
        console.error('Failed to generate job summary:', err);
      });

      return { jobId: data.id };
    }),

  // Trigger matching pipeline for a job (admin/agency access)
  triggerMatchingForAgency: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Allow admin and agency roles
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'agency') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Acesso negado',
        });
      }

      try {
        // Import and run matching pipeline
        const { runMatchingPipeline, saveMatchResults } = await import('../services/matching/index');
        const result = await runMatchingPipeline(input.jobId, {});
        await saveMatchResults(input.jobId, result.results, result.weightProfile);

        return {
          success: true,
          matchesFound: result.results.length,
        };
      } catch (error: any) {
        console.error('[Job.triggerMatchingForAgency] Error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erro ao iniciar busca de candidatos',
        });
      }
    }),

  // Trigger matching pipeline for a job (company access)
  triggerMatching: companyProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });
      }

      const job = await db.getJobById(input.jobId);
      if (!job) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Vaga não encontrada' });
      }

      if (job.company_id !== company.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }

      if (!['pending_review', 'paused'].includes(job.status)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Matching só pode ser iniciado para vagas em análise ou pausadas',
        });
      }

      try {
        const { runMatchingPipeline, saveMatchResults } = await import('../services/matching/index');
        const result = await runMatchingPipeline(input.jobId, {});
        await saveMatchResults(input.jobId, result.results, result.weightProfile);

        return {
          success: true,
          matchesFound: result.results.length,
        };
      } catch (error: any) {
        console.error('[Job.triggerMatching] Error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erro ao iniciar busca de candidatos',
        });
      }
    }),

  // Get matching progress/status for a job (admin/agency access)
  getMatchingProgress: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'agency') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Acesso negado',
        });
      }

      // Check if matches exist for this job
      const { count, error } = await supabaseAdmin
        .from('job_matches')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', input.jobId);

      if (error) {
        console.error('[Job.getMatchingProgress] Error:', error);
      }

      if (count && count > 0) {
        return {
          status: 'completed',
          matchesFound: count,
          percentComplete: 100,
        };
      }

      return {
        status: 'not_started',
        matchesFound: 0,
        percentComplete: 0,
      };
    }),

  // Get matched candidates for a job (admin/agency access)
  getMatchesForJob: protectedProcedure
    .input(z.object({
      jobId: z.string().uuid(),
      minScore: z.number().min(0).max(100).default(0),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'agency') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Acesso negado',
        });
      }

      let data;
      try {
        const result = await withRetry(async () => {
          const res = await supabaseAdmin
            .from('job_matches')
            .select(`
              id,
              candidate_id,
              composite_score,
              semantic_score,
              skills_score,
              experience_score,
              location_score,
              education_score,
              contract_score,
              personality_score,
              history_score,
              bidirectional_score,
              llm_refined_score,
              llm_confidence,
              llm_reasoning,
              llm_recommendation,
              explanation_summary,
              strengths,
              concerns,
              weight_profile,
              candidates(id, full_name, email, phone, city, state, education_level, skills, experience, summary, available_for_clt, available_for_internship, available_for_apprentice)
            `)
            .eq('job_id', input.jobId)
            .gte('composite_score', input.minScore)
            .order('composite_score', { ascending: false })
            .limit(input.limit);
          if (res.error) throw res.error;
          return res.data;
        });
        data = result;
      } catch (error: any) {
        console.error('[Job.getMatchesForJob] Error:', {
          message: error.message || error,
          details: error.stack || '',
          hint: error.hint || '',
          code: error.code || '',
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to fetch matches',
        });
      }

      return {
        matches: (data || []).map((m: any) => ({
          matchId: m.id,
          candidateId: m.candidate_id,
          candidateName: m.candidates?.full_name,
          candidateEmail: m.candidates?.email,
          candidatePhone: m.candidates?.phone,
          candidateProfile: {
            city: m.candidates?.city,
            state: m.candidates?.state,
            educationLevel: m.candidates?.education_level,
            skills: m.candidates?.skills || [],
            experience: m.candidates?.experience || [],
            summary: m.candidates?.summary,
            availableForClt: m.candidates?.available_for_clt,
            availableForInternship: m.candidates?.available_for_internship,
            availableForApprentice: m.candidates?.available_for_apprentice,
          },
          compositeScore: m.composite_score,
          matchFactors: {
            semantic: m.semantic_score,
            skills: m.skills_score,
            experience: m.experience_score,
            location: m.location_score,
            education: m.education_score,
            contract: m.contract_score,
            personality: m.personality_score,
            history: m.history_score,
            bidirectional: m.bidirectional_score,
          },
          llm: m.llm_refined_score ? {
            refinedScore: m.llm_refined_score,
            confidence: m.llm_confidence,
            reasoning: m.llm_reasoning,
          } : null,
          recommendation: m.llm_recommendation,
          explanationSummary: m.explanation_summary,
          strengths: m.strengths || [],
          concerns: m.concerns || [],
        })),
        pagination: {
          totalMatches: data?.length || 0,
        },
      };
    }),

  // Generate missing embeddings for jobs (admin only)
  generateMissingEmbeddings: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores podem executar esta ação',
        });
      }

      // Get jobs with summary but no embedding
      const { data: jobs, error } = await supabaseAdmin
        .from('jobs')
        .select('id, title')
        .not('summary', 'is', null)
        .is('embedding', null);

      if (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message,
        });
      }

      let generated = 0;
      for (const job of jobs || []) {
        try {
          await generateJobEmbedding(job.id);
          console.log(`Generated embedding for job ${job.id} (${job.title})`);
          generated++;
        } catch (err) {
          console.error(`Failed to generate embedding for job ${job.id}:`, err);
        }
      }

      return {
        total: jobs?.length || 0,
        generated,
      };
    }),

  // Update job
  update: companyProcedure
    .input(z.object({
      id: z.string().uuid(),
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
      if (job.companyId !== company?.id && ctx.user.role !== 'admin') {
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

  // Get open jobs for public display (no auth required)
  getPublicJobs: publicProcedure
    .input(z.object({
      contractType: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const jobs = await db.getAllOpenJobs();
      const filtered = input?.contractType
        ? jobs.filter(j => j.contract_type === input.contractType)
        : jobs;
      return filtered.map(job => ({
        id: job.id,
        title: job.title,
        contract_type: job.contract_type,
        work_type: job.work_type,
        location: job.location,
        salary: job.salary,
        hours_per_week: job.hours_per_week,
        published_at: job.published_at,
      }));
    }),

  // Get all open jobs (requires login)
  getAllOpen: protectedProcedure.query(async () => {
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

  // Get job by ID (requires login)
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return await db.getJobById(input.id);
    }),

  // Search jobs (requires login)
  search: protectedProcedure
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

  // Get jobs for an agency (all jobs from companies linked to this agency)
  getByAgency: agencyProcedure.query(async ({ ctx }) => {
    const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
    if (!agency) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Agência não encontrada',
      });
    }

    // Get all jobs where agency_id matches
    const { data, error } = await supabaseAdmin
      .from('jobs')
      .select(`
        *,
        company:companies(id, company_name, email)
      `)
      .eq('agency_id', agency.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Job.getByAgency] Error fetching jobs:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro ao buscar vagas',
      });
    }

    return data || [];
  }),

  // Get jobs for a specific company (agency/admin access)
  getByCompanyId: protectedProcedure
    .input(z.object({
      companyId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Allow admin and agency roles to access this endpoint
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'agency') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Acesso negado',
        });
      }

      // For agency users, verify they have a valid agency
      if (ctx.user.role === 'agency') {
        const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
        if (!agency) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Agência não encontrada',
          });
        }
      }

      // Get jobs for company
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

  // Get matching candidates for a job (agency/admin access)
  getMatchingCandidatesForAgency: agencyProcedure
    .input(z.object({
      jobId: z.string().uuid(),
      threshold: z.number().min(0).max(1).default(0.5),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
      }

      // Verify job belongs to a company linked to this agency
      const { data: job, error } = await supabaseAdmin
        .from('jobs')
        .select('id, agency_id')
        .eq('id', input.jobId)
        .single();

      if (error || !job || job.agency_id !== agency.id) {
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
