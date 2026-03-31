/**
 * Job Router - Job management
 */
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure } from "../_core/trpc";
import { adminProcedure, companyProcedure, candidateProcedure, agencyProcedure } from "./procedures";
import * as _db from "../db";
const db: any = _db;
import { supabaseAdmin as _supabaseAdmin, withRetry } from "../supabase";
const supabaseAdmin = _supabaseAdmin as any;
import { generateJobSummary } from "../services/ai/summarizer";
import { generateJobEmbedding, findMatchingCandidates } from "../services/matching";

export const jobRouter = router({
  // Create job posting
  create: companyProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      contractType: z.enum(["estagio", "clt", "menor-aprendiz", "pj"]),
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

  // Update job for a company (admin/agency access)
  updateForCompany: agencyProcedure
    .input(z.object({
      jobId: z.string().uuid(),
      title: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
      contractType: z.enum(["estagio", "clt", "menor-aprendiz", "pj"]).optional(),
      workType: z.enum(["presencial", "remoto", "hibrido"]).optional(),
      workSchedule: z.string().optional(),
      salaryMin: z.number().optional(),
      salaryMax: z.number().optional(),
      requirements: z.string().optional(),
      openings: z.number().optional(),
      status: z.enum(["draft", "open", "closed", "filled", "paused"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { jobId, ...fields } = input;

      // Verify job exists
      const { data: job } = await supabaseAdmin
        .from('jobs').select('id, company_id, agency_id').eq('id', jobId).single();
      if (!job) throw new TRPCError({ code: 'NOT_FOUND', message: 'Vaga não encontrada' });

      // Agency users can only edit jobs belonging to their agency
      if (ctx.user.role === 'agency') {
        const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
        if (!agency || job.agency_id !== agency.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Vaga não pertence à sua agência' });
        }
      }

      const updateData: any = {};
      if (fields.title !== undefined) updateData.title = fields.title;
      if (fields.description !== undefined) updateData.description = fields.description;
      if (fields.contractType !== undefined) updateData.contract_type = fields.contractType;
      if (fields.workType !== undefined) updateData.work_type = fields.workType;
      if (fields.workSchedule !== undefined) updateData.work_schedule = fields.workSchedule || null;
      if (fields.salaryMin !== undefined) updateData.salary_min = fields.salaryMin || null;
      if (fields.salaryMax !== undefined) updateData.salary_max = fields.salaryMax || null;
      if (fields.requirements !== undefined) updateData.specific_requirements = fields.requirements || null;
      if (fields.openings !== undefined) updateData.openings = fields.openings;
      if (fields.status !== undefined) updateData.status = fields.status;

      await supabaseAdmin.from('jobs').update(updateData).eq('id', jobId);

      // Regenerate AI summary if title or description changed
      if (fields.title || fields.description) {
        const { data: updatedJob } = await supabaseAdmin
          .from('jobs').select('title, description, contract_type, work_type').eq('id', jobId).single();
        if (updatedJob) {
          generateJobSummary({
            title: updatedJob.title,
            description: updatedJob.description,
            contractType: updatedJob.contract_type,
            workType: updatedJob.work_type,
            requirements: fields.requirements,
          }).then(async (summary) => {
            if (summary) {
              await db.updateJob(jobId, { summary, summary_generated_at: new Date().toISOString() });
              await generateJobEmbedding(jobId);
            }
          }).catch((err) => console.error('Failed to regenerate job summary:', err));
        }
      }

      return { success: true };
    }),

  // Delete job (admin/agency access)
  deleteForCompany: agencyProcedure
    .input(z.object({
      jobId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify job exists
      const { data: job } = await supabaseAdmin
        .from('jobs').select('id, company_id, agency_id').eq('id', input.jobId).single();
      if (!job) throw new TRPCError({ code: 'NOT_FOUND', message: 'Vaga não encontrada' });

      // Agency users can only delete jobs belonging to their agency
      if (ctx.user.role === 'agency') {
        const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
        if (!agency || job.agency_id !== agency.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Vaga não pertence à sua agência' });
        }
      }

      // Delete related records first
      await supabaseAdmin.from('job_matches').delete().eq('job_id', input.jobId);
      await supabaseAdmin.from('applications').delete().eq('job_id', input.jobId);
      await supabaseAdmin.from('jobs').delete().eq('id', input.jobId);

      return { success: true };
    }),

  // Create job for a specific company (admin/agency access)
  createForCompany: protectedProcedure
    .input(z.object({
      companyId: z.string().uuid(),
      title: z.string().min(1),
      description: z.string().min(1),
      contractType: z.enum(["estagio", "clt", "menor-aprendiz", "pj"]),
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

      // Get agency_id for the job
      let agencyId = null;
      if (ctx.user.role === 'agency') {
        const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
        agencyId = agency?.id;
      } else if (ctx.user.role === 'admin') {
        // For admin, use the company's existing agency_id
        const { data: companyData } = await supabaseAdmin
          .from('companies')
          .select('agency_id')
          .eq('id', input.companyId)
          .single();
        agencyId = companyData?.agency_id;
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
        const { failProgress } = await import('../services/matching/progress');
        failProgress(input.jobId, error.message || 'Erro desconhecido');
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
    .input(z.object({ jobId: z.string().uuid(), since: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'agency') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Acesso negado',
        });
      }

      // Check in-memory progress first (active pipeline)
      const { getProgress } = await import('../services/matching/progress');
      const liveProgress = getProgress(input.jobId);

      if (liveProgress) {
        return {
          status: liveProgress.status as string,
          matchesFound: 0,
          percentComplete: liveProgress.percentComplete,
          messages: liveProgress.messages,
        };
      }

      // Check if matches exist for this job (pipeline already finished)
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
          messages: [],
        };
      }

      return {
        status: 'not_started',
        matchesFound: 0,
        percentComplete: 0,
        messages: [],
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
              disc_analysis,
              competency_analysis,
              company_fit_notes,
              full_analysis,
              competency_score,
              candidates(id, full_name, email, phone, city, state, education_level, skills, experience, summary, available_for_clt, available_for_internship, available_for_apprentice, disc_dominante, disc_influente, disc_estavel, disc_conforme, pdp_top_10_competencies)
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
            disc: {
              dominante: m.candidates?.disc_dominante,
              influente: m.candidates?.disc_influente,
              estavel: m.candidates?.disc_estavel,
              conforme: m.candidates?.disc_conforme,
            },
            pdpCompetencies: m.candidates?.pdp_top_10_competencies || [],
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
            competency: m.competency_score,
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
          discAnalysis: m.disc_analysis,
          competencyAnalysis: m.competency_analysis,
          companyFitNotes: m.company_fit_notes,
          fullAnalysis: m.full_analysis,
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

  // Set interview preference for a job
  setInterviewPreference: companyProcedure
    .input(z.object({
      jobId: z.string().uuid(),
      preferredInterviewType: z.enum(["online", "in_person"]),
      locationCep: z.string().optional(),
      locationAddress: z.string().optional(),
      locationNumber: z.string().optional(),
      locationComplement: z.string().optional(),
      locationNeighborhood: z.string().optional(),
      locationCity: z.string().optional(),
      locationState: z.string().optional(),
      preferredDays: z.array(z.string()).optional(),
      preferredTimeStart: z.string().optional(),
      preferredTimeEnd: z.string().optional(),
      schedulingNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }

      const { data: job } = await supabaseAdmin
        .from('jobs')
        .select('id, company_id')
        .eq('id', input.jobId)
        .single();

      if (!job || job.company_id !== company.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Job does not belong to this company' });
      }

      await supabaseAdmin
        .from('jobs')
        .update({
          preferred_interview_type: input.preferredInterviewType,
          interview_location_cep: input.locationCep || null,
          interview_location_address: input.locationAddress || null,
          interview_location_number: input.locationNumber || null,
          interview_location_complement: input.locationComplement || null,
          interview_location_neighborhood: input.locationNeighborhood || null,
          interview_location_city: input.locationCity || null,
          interview_location_state: input.locationState || null,
          preferred_days: input.preferredDays || null,
          preferred_time_start: input.preferredTimeStart || null,
          preferred_time_end: input.preferredTimeEnd || null,
          scheduling_notes: input.schedulingNotes || null,
        })
        .eq('id', input.jobId);

      return { success: true };
    }),

  // Get jobs by company
  getByCompany: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) return [];
    return await db.getJobsByCompanyId(company.id);
  }),

  // Get jobs by company ID (agency/admin access) - simple version
  getByCompanyIdSimple: protectedProcedure
    .input(z.object({ companyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin' && ctx.user.role !== 'agency') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      return await db.getJobsByCompanyId(input.companyId);
    }),

  // Get open jobs for public display (no auth required)
  getPublicJobs: publicProcedure
    .input(z.object({
      contractType: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const jobs = await db.getAllOpenJobs();
      const filtered = input?.contractType
        ? jobs.filter((j: any) => j.contract_type === input.contractType)
        : jobs;
      return filtered.map((job: any) => ({
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
    return jobs.map((job: any) => ({
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

  // Get jobs for a specific company (agency/admin access) - detailed version with company info
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
