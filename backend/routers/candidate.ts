// @ts-nocheck
// Candidate router - candidate management
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";
import { adminProcedure, candidateProcedure } from "./procedures";
import * as db from "../db";
import { generateCandidateSummary } from "../services/ai/summarizer";
import { generateCandidateEmbedding, findMatchingJobs } from "../services/matching";

export const candidateRouter = router({
  // Check if candidate has completed onboarding
  checkOnboarding: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'candidate') {
      return { completed: true }; // Non-candidate users don't need candidate onboarding
    }
    const candidate = await db.getCandidateByUserId(ctx.user.id);
    // Candidate onboarding is complete if profile exists with all required fields
    const completed = !!(
      candidate &&
      candidate.full_name &&
      candidate.cpf &&
      candidate.email &&
      candidate.phone &&
      candidate.city &&
      candidate.state &&
      candidate.education_level &&
      candidate.skills && (candidate.skills as string[]).length > 0
    );
    return { completed, candidate };
  }),

  // Get the school linked to the current user (for pre-populating city/state)
  getMySchool: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.getUserById(ctx.user.id);
    if (!user?.school_id) {
      return null;
    }
    const school = await db.getSchoolById(user.school_id);
    return school;
  }),

  // Submit onboarding (create/update full candidate profile)
  submitOnboarding: protectedProcedure
    .input(z.object({
      full_name: z.string().min(1),
      cpf: z.string().min(11),
      email: z.string().email(),
      phone: z.string().min(1),
      date_of_birth: z.string().optional(),
      city: z.string().min(1),
      state: z.string().min(1),
      social_media: z.string().optional(),
      education_level: z.string().min(1),
      currently_studying: z.boolean().optional(),
      institution: z.string().optional(),
      courses: z.array(z.string()).optional(),
      skills: z.array(z.string()).min(1),
      languages: z.array(z.string()).optional(),
      experiences: z.array(z.string()).optional(),
      profile_summary: z.string().optional(),
      available_for_clt: z.boolean().optional(),
      available_for_internship: z.boolean().optional(),
      available_for_apprentice: z.boolean().optional(),
      preferred_work_type: z.string().optional(),
      experience: z.array(z.object({
        company: z.string(),
        role: z.string(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        current: z.boolean().optional(),
        description: z.string().optional(),
      })).optional(),
      // DISC personality assessment results
      disc_influente: z.number().min(0).max(100).optional(),
      disc_estavel: z.number().min(0).max(100).optional(),
      disc_dominante: z.number().min(0).max(100).optional(),
      disc_conforme: z.number().min(0).max(100).optional(),
      // PDP (Personal Development Profile) results
      pdp_intrapersonal: z.record(z.string()).optional(),
      pdp_interpersonal: z.record(z.string()).optional(),
      pdp_skills: z.record(z.array(z.string())).optional(),
      pdp_competencies: z.array(z.string()).optional(),
      pdp_top_10_competencies: z.array(z.string()).optional(),
      pdp_develop_competencies: z.array(z.string()).optional(),
      pdp_action_plans: z.record(z.array(z.string())).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'candidate') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only candidates can submit onboarding' });
      }

      // Get user's school_id for candidate linking
      const user = await db.getUserById(ctx.user.id);
      const schoolId = user?.school_id;

      // Map frontend education level values to database enum
      const educationLevelMap: Record<string, string> = {
        'fundamental_incompleto': 'fundamental',
        'fundamental_completo': 'fundamental',
        'medio_incompleto': 'medio',
        'medio_completo': 'medio',
        'tecnico': 'medio',
        'superior_incompleto': 'superior',
        'superior_completo': 'superior',
        'pos_graduacao': 'pos-graduacao',
        'mestrado': 'mestrado',
        'doutorado': 'doutorado',
      };
      const mappedEducationLevel = educationLevelMap[input.education_level] || input.education_level;

      // Prepare data with mapped education level and school_id
      // Convert courses array to comma-separated string for storage
      const courseString = input.courses?.join(', ') || '';
      const candidateData: any = {
        ...input,
        education_level: mappedEducationLevel,
        school_id: schoolId,
        course: courseString, // Store as comma-separated string
      };
      delete candidateData.courses; // Remove array version

      // Add disc_completed_at if DISC results are provided
      if (input.disc_influente !== undefined || input.disc_estavel !== undefined ||
          input.disc_dominante !== undefined || input.disc_conforme !== undefined) {
        candidateData.disc_completed_at = new Date().toISOString();
      }

      // Add pdp_completed_at if PDP results are provided
      if (input.pdp_intrapersonal || input.pdp_interpersonal || input.pdp_competencies) {
        candidateData.pdp_completed_at = new Date().toISOString();
      }

      // Check if candidate already exists
      let candidate = await db.getCandidateByUserId(ctx.user.id);

      if (candidate) {
        // Update existing candidate
        await db.updateCandidate(candidate.id, candidateData);
      } else {
        // Create new candidate - use snake_case column names
        const candidateId = await db.createCandidate({
          user_id: ctx.user.id,
          full_name: input.full_name,
          cpf: input.cpf,
          email: input.email,
          phone: input.phone,
          city: input.city,
          state: input.state,
          school_id: schoolId,
        });
        candidate = await db.getCandidateById(candidateId);
        if (candidate) {
          // Update with all the other fields
          await db.updateCandidate(candidate.id, candidateData);
        }
      }

      // Generate AI summary in background (don't await - fire and forget)
      if (candidate && input.pdp_competencies) {
        generateCandidateSummary({
          fullName: input.full_name,
          city: input.city,
          state: input.state,
          educationLevel: input.education_level,
          institution: input.institution,
          course: courseString,
          skills: input.skills,
          languages: input.languages,
          discInfluente: input.disc_influente,
          discEstavel: input.disc_estavel,
          discDominante: input.disc_dominante,
          discConforme: input.disc_conforme,
          pdpIntrapersonal: input.pdp_intrapersonal,
          pdpInterpersonal: input.pdp_interpersonal,
          pdpSkills: input.pdp_skills,
          pdpCompetencies: input.pdp_competencies,
          pdpTop10Competencies: input.pdp_top_10_competencies,
          pdpDevelopCompetencies: input.pdp_develop_competencies,
        }).then(async (summary) => {
          if (summary && candidate) {
            await db.updateCandidate(candidate.id, {
              summary,
              summary_generated_at: new Date().toISOString(),
            });
            console.log(`Generated summary for candidate ${candidate.id}`);
            // Generate embedding from summary
            await generateCandidateEmbedding(candidate.id);
          }
        }).catch((err) => {
          console.error('Failed to generate candidate summary:', err);
        });
      }

      return { success: true };
    }),

  // Get current candidate profile
  getProfile: candidateProcedure.query(async ({ ctx }) => {
    const candidate = await db.getCandidateByUserId(ctx.user.id);
    if (!candidate) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Candidate profile not found' });
    }
    return candidate;
  }),

  // Create candidate profile
  createProfile: protectedProcedure
    .input(z.object({
      fullName: z.string().min(1),
      cpf: z.string().min(11),
      email: z.string().email(),
      phone: z.string().optional(),
      dateOfBirth: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      educationLevel: z.enum(["fundamental", "medio", "superior", "pos-graduacao", "mestrado", "doutorado"]).optional(),
      currentlyStudying: z.boolean().optional(),
      institution: z.string().optional(),
      course: z.string().optional(),
      skills: z.string().optional(),
      profileSummary: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const candidateId = await db.createCandidate({
        user_id: ctx.user.id,
        full_name: input.fullName,
        cpf: input.cpf,
        email: input.email,
        phone: input.phone,
        date_of_birth: input.dateOfBirth ? new Date(input.dateOfBirth).toISOString() : undefined,
        address: input.address,
        city: input.city,
        state: input.state,
        zip_code: input.zipCode,
        education_level: input.educationLevel,
        currently_studying: input.currentlyStudying,
        institution: input.institution,
        course: input.course,
        skills: input.skills ? [input.skills] : undefined,
        profile_summary: input.profileSummary,
      });
      return { candidateId };
    }),

  // Update candidate profile
  updateProfile: candidateProcedure
    .input(z.object({
      full_name: z.string().optional(),
      cpf: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      date_of_birth: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      education_level: z.string().optional(),
      currently_studying: z.boolean().optional(),
      institution: z.string().optional(),
      course: z.string().optional(),
      skills: z.array(z.string()).optional(),
      languages: z.array(z.string()).optional(),
      profile_summary: z.string().optional(),
      available_for_clt: z.boolean().optional(),
      available_for_internship: z.boolean().optional(),
      available_for_apprentice: z.boolean().optional(),
      preferred_work_type: z.string().optional(),
      photo_url: z.string().optional(),
      experience: z.array(z.object({
        company: z.string(),
        role: z.string(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        current: z.boolean().optional(),
        description: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const candidate = await db.getCandidateByUserId(ctx.user.id);
      if (!candidate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Candidate not found' });
      }
      await db.updateCandidate(candidate.id, input);
      return { success: true };
    }),

  // Upload profile photo
  uploadPhoto: candidateProcedure
    .input(z.object({
      base64: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const candidate = await db.getCandidateByUserId(ctx.user.id);
      if (!candidate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Candidate not found' });
      }

      // Validate mime type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(input.mimeType)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.' });
      }

      // Convert base64 to buffer
      const base64Data = input.base64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Validate file size (max 5MB)
      if (buffer.length > 5 * 1024 * 1024) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Arquivo muito grande. Máximo 5MB.' });
      }

      // Generate unique filename
      const ext = input.mimeType.split('/')[1];
      const filename = `candidates/${ctx.user.id}/photo.${ext}`;

      // Upload to storage
      const { storagePut } = await import('../storage');
      const { url } = await storagePut(filename, buffer, input.mimeType);

      // Update candidate with photo URL
      await db.updateCandidate(candidate.id, { photo_url: url });

      return { success: true, photo_url: url };
    }),

  // Search candidates (company and admin only)
  search: protectedProcedure
    .input(z.object({
      educationLevel: z.string().optional(),
      city: z.string().optional(),
      availableForInternship: z.boolean().optional(),
      availableForCLT: z.boolean().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'company' && ctx.user.role !== 'affiliate') {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      return await db.searchCandidates(input);
    }),

  // Get all candidates (admin only)
  getAll: adminProcedure.query(async () => {
    return await db.getAllCandidates();
  }),

  // Get candidate by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getCandidateById(input.id);
    }),

  // Admin-only routes for candidate management
  getAllForAdmin: adminProcedure.query(async () => {
    return await db.getAllCandidatesForAdmin();
  }),

  getByIdForAdmin: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return await db.getCandidateByIdForAdmin(input.id);
    }),

  updateStatus: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['active', 'inactive', 'employed'])
    }))
    .mutation(async ({ input }) => {
      await db.updateCandidateStatus(input.id, input.status);
      return { success: true };
    }),

  searchForAdmin: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      educationLevel: z.string().optional(),
      city: z.string().optional(),
      status: z.string().optional(),
      availableForInternship: z.boolean().optional(),
      availableForCLT: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      return await db.searchCandidatesForAdmin(input);
    }),

  getApplications: adminProcedure
    .input(z.object({ candidateId: z.string().uuid() }))
    .query(async ({ input }) => {
      return await db.getCandidateApplications(input.candidateId);
    }),

  getStats: adminProcedure
    .input(z.object({ candidateId: z.string().uuid() }))
    .query(async ({ input }) => {
      return await db.getCandidateStats(input.candidateId);
    }),

  // Get matching jobs for the current candidate (using vector similarity)
  getMatchingJobs: candidateProcedure
    .input(z.object({
      threshold: z.number().min(0).max(1).default(0.5),
      limit: z.number().min(1).max(50).default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      const candidate = await db.getCandidateByUserId(ctx.user.id);
      if (!candidate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Candidate profile not found' });
      }

      const options = input || { threshold: 0.5, limit: 20 };
      const matches = await findMatchingJobs(candidate.id, {
        threshold: options.threshold,
        limit: options.limit,
      });

      // Strip company information from matches (privacy rule)
      return matches.map(match => ({
        job_id: match.job_id,
        title: match.title,
        description: match.description,
        contract_type: match.contract_type,
        work_type: match.work_type,
        location: match.location,
        similarity: match.similarity,
        // Note: NOT including company info or full summary
      }));
    }),

  // Regenerate embedding for a candidate (admin only)
  regenerateEmbedding: adminProcedure
    .input(z.object({
      candidateId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const success = await generateCandidateEmbedding(input.candidateId);
      return { success };
    }),
});
