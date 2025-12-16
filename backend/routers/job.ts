// @ts-nocheck
/**
 * Job Router - Job management and basic matching
 *
 * Note: The findCandidates endpoint uses the legacy matching service.
 * For advanced matching with multi-factor analysis, use the agents router:
 *   - trpc.agents.matchCandidates - Enhanced matching with ensemble scoring
 *
 * @see ../routers/agents.ts for advanced agent capabilities
 */
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { publicProcedure } from "../_core/trpc";
import { adminProcedure, companyProcedure, candidateProcedure, schoolProcedure } from "./procedures";
import * as db from "../db";
import { supabaseAdmin } from "../supabase";
import { matchCandidatesForJob, deleteMatchesForJob } from "../services/matching";
import { onJobCreated, createJobCreatedContext } from "../events/jobCreated";
import { getBackgroundMatchingService } from "../services/BackgroundMatchingService";

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

      // 🚀 AUTOMATIC MATCHING: Trigger background matching
      try {
        const job = await db.getJobById(jobId);
        if (job && job.status === 'active') {
          console.log(`[JobCreate] Triggering background matching for job ${jobId}...`);

          // Create context for background matching
          const matchingContext = createJobCreatedContext(db);

          // Trigger background matching (non-blocking)
          await onJobCreated(job, matchingContext);

          console.log(`[JobCreate] Background matching initiated for job ${jobId}`);
        }
      } catch (error) {
        // Don't fail job creation if matching fails
        console.error(`[JobCreate] Failed to trigger matching for job ${jobId}:`, error);
      }

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

  // AI Matching: Find candidates for a job
  findCandidates: adminProcedure
    .input(z.object({
      jobId: z.string().uuid(),
      maxCandidates: z.number().min(1).max(100).default(50),
    }))
    .mutation(async ({ input }) => {
      console.log(`[Matching] Starting candidate search for job ${input.jobId}`);

      const results = await matchCandidatesForJob(input.jobId, {
        maxCandidates: input.maxCandidates,
        saveResults: true,
      });

      console.log(`[Matching] Found ${results.length} matches for job ${input.jobId}`);

      return {
        success: true,
        matchCount: results.length,
        matches: results.map(r => ({
          candidateId: r.candidateId,
          matchScore: r.matchScore,
          confidenceScore: r.confidenceScore,
          recommendation: r.recommendation,
          strengths: r.strengths,
          concerns: r.concerns,
          matchExplanation: r.matchExplanation,
        })),
      };
    }),

  // Get existing matches for a job
  getMatches: adminProcedure
    .input(z.object({
      jobId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const matches = await db.getJobMatchesByJobId(input.jobId);
      return matches;
    }),

  // Delete all matches for a job (for re-matching)
  deleteMatches: adminProcedure
    .input(z.object({
      jobId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      await deleteMatchesForJob(input.jobId);
      return { success: true };
    }),

  // 🆕 GET MATCHING PROGRESS (Real-time updates for "Vagas" page)
  // Schools/affiliates can see matching progress as it happens
  getMatchingProgress: publicProcedure
    .input(z.object({
      jobId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      // Query the job_matching_progress table
      const progress = await db.getMatchingProgress(input.jobId);

      if (!progress) {
        return {
          status: 'not_started',
          totalCandidates: 0,
          processedCandidates: 0,
          matchesFound: 0,
          percentComplete: 0,
        };
      }

      const percentComplete = progress.total_candidates > 0
        ? Math.round((progress.processed_candidates / progress.total_candidates) * 100)
        : 0;

      return {
        status: progress.status,
        totalCandidates: progress.total_candidates,
        processedCandidates: progress.processed_candidates,
        matchesFound: progress.matches_found,
        percentComplete,
        startedAt: progress.started_at,
        completedAt: progress.completed_at,
        errorMessage: progress.error_message,
        processingTimeMs: progress.processing_time_ms,
      };
    }),

  // 🆕 GET MATCHES FOR SCHOOLS/AFFILIATES (Main "Vagas" page data)
  // Returns matched candidates with scores and reasoning
  getMatchesForJob: publicProcedure
    .input(z.object({
      jobId: z.string().uuid(),
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(50),
      minScore: z.number().min(0).max(100).optional().default(50),
    }))
    .query(async ({ input }) => {
      const { jobId, page, pageSize, minScore } = input;

      // Get matches from database (sorted by score)
      const allMatches = await db.getJobMatchesByJobId(jobId);

      // Filter by minimum score
      const filteredMatches = allMatches.filter(m => m.composite_score >= minScore);

      // Pagination
      const totalMatches = filteredMatches.length;
      const totalPages = Math.ceil(totalMatches / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedMatches = filteredMatches.slice(startIndex, endIndex);

      // Get candidate details for each match
      const matchesWithCandidates = await Promise.all(
        paginatedMatches.map(async (match) => {
          const candidate = await db.getCandidateById(match.candidate_id);

          return {
            matchId: match.id,
            candidateId: match.candidate_id,
            candidateName: candidate?.full_name || 'Unknown',
            candidateEmail: candidate?.email,
            compositeScore: match.composite_score,
            confidenceScore: match.confidence_score,
            recommendation: match.recommendation,
            matchFactors: match.match_factors,
            semanticFactors: match.semantic_factors,
            reasoning: match.match_reasoning,
            createdAt: match.created_at,
            // Include candidate profile for display
            candidateProfile: {
              skills: candidate?.skills,
              yearsOfExperience: candidate?.years_of_experience,
              educationLevel: candidate?.education_level,
              city: candidate?.city,
              state: candidate?.state,
            },
          };
        })
      );

      return {
        matches: matchesWithCandidates,
        pagination: {
          page,
          pageSize,
          totalPages,
          totalMatches,
          hasMore: page < totalPages,
        },
      };
    }),

  // 🆕 MANUALLY TRIGGER RE-MATCHING (Admin)
  // Allows re-running matching if job requirements changed
  triggerReMatching: adminProcedure
    .input(z.object({
      jobId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const job = await db.getJobById(input.jobId);

      if (!job) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Job not found' });
      }

      console.log(`[ReMatcher] Manually triggering re-matching for job ${input.jobId}...`);

      // Create context and trigger matching
      const matchingContext = createJobCreatedContext(db);
      await onJobCreated(job, matchingContext);

      return {
        success: true,
        message: 'Re-matching initiated in background',
      };
    }),

  // 🆕 TRIGGER MATCHING (Company)
  // Allows companies to manually trigger matching for their jobs
  triggerMatching: companyProcedure
    .input(z.object({
      jobId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const job = await db.getJobById(input.jobId);

      // Verify job exists and ownership
      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Vaga não encontrada',
        });
      }

      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company || job.company_id !== company.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Você não tem permissão para iniciar busca nesta vaga',
        });
      }

      console.log(`[CompanyMatching] Company ${company.id} triggering matching for job ${input.jobId}...`);

      // Create context and trigger matching
      const matchingContext = createJobCreatedContext(db);
      await onJobCreated(job, matchingContext);

      return {
        success: true,
        message: 'Busca de candidatos iniciada',
      };
    }),

  // Trigger matching for a job (school access)
  triggerMatchingForSchool: schoolProcedure
    .input(z.object({
      jobId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const job = await db.getJobById(input.jobId);

      if (!job) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Vaga não encontrada',
        });
      }

      // Verify school has access to this company's jobs
      const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
      if (!school) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Escola não encontrada',
        });
      }

      // Check if company belongs to this school's affiliate
      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('id, affiliate_id, school_id')
        .eq('id', job.company_id)
        .single();

      if (!company || (company.school_id !== school.id && company.affiliate_id !== school.affiliate_id)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Você não tem permissão para iniciar busca nesta vaga',
        });
      }

      // Trigger matching
      const matchingContext = createJobCreatedContext(db);
      await onJobCreated(job, matchingContext);

      return {
        success: true,
        message: 'Busca de candidatos iniciada',
      };
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
    const { data, error } = await db.supabaseAdmin
      .from('jobs')
      .select(`
        *,
        company:companies(id, company_name, email),
        job_matches(count)
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
});
