import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { agentRouter } from "./agents/agentRouter";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Company-only procedure
const companyProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== 'company' && ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Company access required' });
  }
  return next({ ctx });
});

// Candidate-only procedure
const candidateProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'candidate' && ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Candidate access required' });
  }
  return next({ ctx });
});

// School-only procedure
const schoolProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'school' && ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'School access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  agent: agentRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      try {
        // Clear any session cookies
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        ctx.res.clearCookie('sb-access-token', { ...cookieOptions, maxAge: -1 });
        ctx.res.clearCookie('sb-refresh-token', { ...cookieOptions, maxAge: -1 });
      } catch (error) {
        console.error('[Auth] Logout error:', error);
      }
      return { success: true } as const;
    }),
  }),

  // Company routes
  company: router({
    // Get current company profile
    getProfile: companyProcedure.query(async ({ ctx }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company profile not found' });
      }
      return company;
    }),

    // Create company profile
    createProfile: protectedProcedure
      .input(z.object({
        companyName: z.string().min(1),
        cnpj: z.string().min(14),
        email: z.string().email(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        industry: z.string().optional(),
        companySize: z.enum(["1-10", "11-50", "51-200", "201-500", "500+"]).optional(),
        website: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const companyId = await db.createCompany({
          userId: ctx.user.id,
          ...input,
        });
        return { companyId };
      }),

    // Update company profile
    updateProfile: companyProcedure
      .input(z.object({
        companyName: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        industry: z.string().optional(),
        companySize: z.enum(["1-10", "11-50", "51-200", "201-500", "500+"]).optional(),
        website: z.string().optional(),
        description: z.string().optional(),
        logo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const company = await db.getCompanyByUserId(ctx.user.id);
        if (!company) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
        }
        await db.updateCompany(company.id, input);
        return { success: true };
      }),

    // Get all companies (admin only)
    getAll: adminProcedure.query(async () => {
      return await db.getAllCompanies();
    }),

    // Update company status (admin only)
    updateStatus: adminProcedure
      .input(z.object({
        id: z.string().uuid(),
        status: z.enum(['pending', 'active', 'suspended', 'inactive']),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateCompanyStatus(input.id, input.status, ctx.user.id);
        return { success: true };
      }),
  }),

  // School routes (NEW - for franchise structure)
  school: router({
    // Get all schools (admin only)
    getAll: adminProcedure.query(async () => {
      return await db.getAllSchools();
    }),

    // Get school by ID
    getById: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input }) => {
        return await db.getSchoolById(input.id);
      }),

    // Update school status (approve/suspend)
    updateStatus: adminProcedure
      .input(z.object({
        id: z.string().uuid(),
        status: z.enum(['pending', 'active', 'suspended'])
      }))
      .mutation(async ({ input }) => {
        await db.updateSchoolStatus(input.id, input.status);
        return { success: true };
      }),

    // Update school details
    update: adminProcedure
      .input(z.object({
        id: z.string().uuid(),
        school_name: z.string().optional(),
        trade_name: z.string().optional(),
        legal_name: z.string().optional(),
        cnpj: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postal_code: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        notes: z.string().optional()
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateSchool(id, data);
        return { success: true };
      }),

    // Get school statistics
    getStats: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input }) => {
        return await db.getSchoolStats(input.id);
      }),

    // School-specific endpoints (for logged-in school users)

    // Get current school profile
    getProfile: schoolProcedure.query(async ({ ctx }) => {
      const school = await db.getSchoolByUserId(ctx.user.id);
      if (!school) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'School profile not found' });
      }
      return school;
    }),

    // Update own school profile
    updateProfile: schoolProcedure
      .input(z.object({
        school_name: z.string().optional(),
        trade_name: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postal_code: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const school = await db.getSchoolByUserId(ctx.user.id);
        if (!school) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found' });
        }
        await db.updateSchool(school.id, input);
        return { success: true };
      }),

    // Get dashboard statistics for school
    getDashboardStats: schoolProcedure.query(async ({ ctx }) => {
      const school = await db.getSchoolByUserId(ctx.user.id);
      if (!school) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found' });
      }
      return await db.getSchoolDashboardStats(school.id);
    }),

    // Get candidates registered by this school
    getCandidates: schoolProcedure.query(async ({ ctx }) => {
      const school = await db.getSchoolByUserId(ctx.user.id);
      if (!school) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found' });
      }
      return await db.getCandidatesBySchoolId(school.id);
    }),

    // Get applications from school's candidates
    getApplications: schoolProcedure.query(async ({ ctx }) => {
      const school = await db.getSchoolByUserId(ctx.user.id);
      if (!school) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found' });
      }
      return await db.getApplicationsBySchoolId(school.id);
    }),

    // Get companies from school's city
    getCompanies: schoolProcedure.query(async ({ ctx }) => {
      const school = await db.getSchoolByUserId(ctx.user.id);
      if (!school) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found' });
      }
      return await db.getCompaniesBySchoolId(school.id);
    }),
  }),

  // Candidate routes
  candidate: router({
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
          userId: ctx.user.id,
          ...input,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
        });
        return { candidateId };
      }),

    // Update candidate profile
    updateProfile: candidateProcedure
      .input(z.object({
        fullName: z.string().optional(),
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
        resumeUrl: z.string().optional(),
        photoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const candidate = await db.getCandidateByUserId(ctx.user.id);
        if (!candidate) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Candidate not found' });
        }
        await db.updateCandidate(candidate.id, {
          ...input,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
        });
        return { success: true };
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
        if (ctx.user.role !== 'company' && ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin') {
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
  }),

  // Job routes
  job: router({
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
        const jobId = await db.createJob({
          companyId: company.id,
          ...input,
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
        if (job.companyId !== company?.id && ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin') {
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
  }),

  // Application routes
  application: router({
    // Apply to job
    create: candidateProcedure
      .input(z.object({
        jobId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const candidate = await db.getCandidateByUserId(ctx.user.id);
        if (!candidate) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Candidate profile not found' });
        }
        
        const applicationId = await db.createApplication({
          jobId: input.jobId,
          candidateId: candidate.id,
        });
        return { applicationId };
      }),

    // Get applications by candidate
    getByCandidate: candidateProcedure.query(async ({ ctx }) => {
      const candidate = await db.getCandidateByUserId(ctx.user.id);
      if (!candidate) return [];
      return await db.getApplicationsByCandidateId(candidate.id);
    }),

    // Get applications by job (company only)
    getByJob: companyProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ ctx, input }) => {
        const job = await db.getJobById(input.jobId);
        if (!job) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        const company = await db.getCompanyByUserId(ctx.user.id);
        if (job.companyId !== company?.id && ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin') {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        return await db.getApplicationsByJobId(input.jobId);
      }),

    // Update application status
    updateStatus: companyProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["applied", "screening", "interview-scheduled", "interviewed", "selected", "rejected", "withdrawn"]),
        companyNotes: z.string().optional(),
        rejectionReason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateApplication(id, data);
        return { success: true };
      }),
  }),

  // Contract routes
  contract: router({
    // Create contract
    create: companyProcedure
      .input(z.object({
        candidateId: z.number(),
        jobId: z.number(),
        applicationId: z.number(),
        contractType: z.enum(["estagio", "clt", "menor-aprendiz"]),
        contractNumber: z.string(),
        monthlySalary: z.number(),
        monthlyFee: z.number(),
        startDate: z.string(),
        endDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const company = await db.getCompanyByUserId(ctx.user.id);
        if (!company) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
        }
        
        const contractId = await db.createContract({
          companyId: company.id,
          ...input,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        });
        return { contractId };
      }),

    // Get contracts by company
    getByCompany: companyProcedure.query(async ({ ctx }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) return [];
      return await db.getContractsByCompanyId(company.id);
    }),

    // Get contracts by candidate
    getByCandidate: candidateProcedure.query(async ({ ctx }) => {
      const candidate = await db.getCandidateByUserId(ctx.user.id);
      if (!candidate) return [];
      return await db.getContractsByCandidateId(candidate.id);
    }),

    // Get all active contracts (admin)
    getAllActive: adminProcedure.query(async () => {
      return await db.getAllActiveContracts();
    }),

    // Update contract
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending-signature", "active", "suspended", "terminated", "completed"]).optional(),
        terminationReason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateContract(id, data);
        return { success: true };
      }),
  }),

  // Analytics and dashboard
  dashboard: router({
    // Get dashboard stats (admin)
    getStats: adminProcedure.query(async () => {
      return await db.getDashboardStats();
    }),

    // Get company dashboard stats
    getCompanyStats: companyProcedure.query(async ({ ctx }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) return null;
      
      const jobs = await db.getJobsByCompanyId(company.id);
      const contracts = await db.getContractsByCompanyId(company.id);
      
      return {
        totalJobs: jobs.length,
        openJobs: jobs.filter(j => j.status === 'open').length,
        activeContracts: contracts.filter(c => c.status === 'active').length,
        totalContracts: contracts.length,
      };
    }),

    // Get candidate dashboard stats
    getCandidateStats: candidateProcedure.query(async ({ ctx }) => {
      const candidate = await db.getCandidateByUserId(ctx.user.id);
      if (!candidate) return null;
      
      const applications = await db.getApplicationsByCandidateId(candidate.id);
      const contracts = await db.getContractsByCandidateId(candidate.id);
      
      return {
        totalApplications: applications.length,
        pendingApplications: applications.filter(a => a.status === 'applied').length,
        activeContracts: contracts.filter(c => c.status === 'active').length,
        totalContracts: contracts.length,
      };
    }),
  }),

  // Notifications
  notification: router({
    // Get user notifications
    getAll: protectedProcedure.query(async ({ ctx }) => {
      return await db.getNotificationsByUserId(ctx.user.id);
    }),

    // Get unread count
    getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUnreadNotificationsCount(ctx.user.id);
    }),

    // Mark as read
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationAsRead(input.id);
        return { success: true };
      }),

    // Mark all as read
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsAsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // School Invitations (NEW)
  invitation: router({
    // Create invitation (admin only)
    create: adminProcedure
      .input(z.object({
        email: z.string().email(),
        franchiseId: z.string().uuid(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createSchoolInvitation(
          input.email,
          input.franchiseId,
          ctx.user.id,
          input.notes
        );
      }),

    // Validate invitation token (public)
    validate: publicProcedure
      .input(z.object({ token: z.string().uuid() }))
      .query(async ({ input }) => {
        console.log('[Invitation] Validating token:', input.token);
        const invitation = await db.getInvitationByToken(input.token);
        console.log('[Invitation] Result:', invitation ? 'Found' : 'Not found', invitation);
        if (!invitation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
        }
        return invitation;
      }),

    // Accept invitation (public - creates user account)
    acceptWithPassword: publicProcedure
      .input(z.object({
        token: z.string().uuid(),
        password: z.string().min(6),
        schoolData: z.object({
          school_name: z.string().min(1),
          trade_name: z.string().optional(),
          legal_name: z.string().optional(),
          cnpj: z.string().min(14),
          email: z.string().email(),
          phone: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postal_code: z.string().optional(),
          website: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        return await db.acceptSchoolInvitationWithPassword({
          token: input.token,
          password: input.password,
          schoolData: input.schoolData,
        });
      }),

    // Accept invitation (authenticated - legacy)
    accept: protectedProcedure
      .input(z.object({
        token: z.string().uuid(),
        schoolData: z.object({
          school_name: z.string().min(1),
          trade_name: z.string().optional(),
          legal_name: z.string().optional(),
          cnpj: z.string().min(14),
          email: z.string().email(),
          phone: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postal_code: z.string().optional(),
          website: z.string().optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.acceptInvitation(
          input.token,
          ctx.user.id,
          input.schoolData
        );
      }),

    // List all invitations (admin only)
    list: adminProcedure.query(async () => {
      return await db.getAllInvitations();
    }),

    // Revoke invitation (admin only)
    revoke: adminProcedure
      .input(z.object({ token: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        await db.revokeInvitation(input.token, ctx.user.id);
        return { success: true };
      }),

    // Get all franchises for dropdown (admin only)
    getFranchises: adminProcedure.query(async () => {
      return await db.getAllFranchises();
    }),
  }),

  // Affiliate (Franchise Owner) routes
  affiliate: router({
    // Get all affiliates (super admin only)
    getAll: adminProcedure.query(async () => {
      return await db.getAllAffiliates();
    }),

    // Get affiliate by ID
    getById: adminProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input }) => {
        return await db.getAffiliateById(input.id);
      }),

    // Get affiliate by user ID
    getByUserId: protectedProcedure.query(async ({ ctx }) => {
      return await db.getAffiliateByUserId(ctx.user.id);
    }),

    // Get all invitations (super admin only)
    getInvitations: adminProcedure.query(async () => {
      return await db.getAllAffiliateInvitations();
    }),

    // Create affiliate invitation (super admin only) - admin fills all details
    createInvitation: adminProcedure
      .input(z.object({
        email: z.string().email(),
        cities: z.array(z.string().min(1)).min(1).max(100),
        franchise: z.object({
          name: z.string().min(1),
          trade_name: z.string().optional(),
          legal_name: z.string().min(1),
          cnpj: z.string().min(14),
          contact_email: z.string().email(),
          contact_phone: z.string().optional(),
          address: z.string().optional(),
          city: z.string().min(1),
          state: z.string().optional(),
          postal_code: z.string().optional(),
          website: z.string().optional(),
        }),
        schools: z.array(z.object({
          city: z.string().min(1),
          school_name: z.string().min(1),
          trade_name: z.string().optional(),
          legal_name: z.string().optional(),
          cnpj: z.string().min(14),
          email: z.string().email(),
          phone: z.string().optional(),
          address: z.string().optional(),
          state: z.string().optional(),
          postal_code: z.string().optional(),
          website: z.string().optional(),
        })).min(1),
        commission_rate: z.number().min(0).max(100).default(10).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createAffiliateInvitation({
          email: input.email,
          cities: input.cities,
          franchiseData: input.franchise,
          schoolsData: input.schools,
          commission_rate: input.commission_rate || 10,
          createdBy: ctx.user.id,
        });
      }),

    // Verify invitation token (public - anyone with link can check)
    verifyInvitation: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        return await db.verifyAffiliateInvitation(input.token);
      }),

    // Accept invitation - affiliate only provides name, phone, password
    acceptInvitation: publicProcedure
      .input(z.object({
        token: z.string(),
        name: z.string().min(1),
        phone: z.string().min(1),
        password: z.string().min(6),
      }))
      .mutation(async ({ input }) => {
        return await db.acceptAffiliateInvitation(input);
      }),

    // Update affiliate status (super admin only)
    updateStatus: adminProcedure
      .input(z.object({
        id: z.string().uuid(),
        is_active: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        await db.updateAffiliateStatus(input.id, input.is_active);
        return { success: true };
      }),

    // Get schools in affiliate's region
    getSchools: protectedProcedure.query(async ({ ctx }) => {
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
      }
      return await db.getSchoolsByAffiliateId(affiliate.id);
    }),

    // Get companies from affiliate's region
    getCompanies: protectedProcedure.query(async ({ ctx }) => {
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
      }
      return await db.getCompaniesByAffiliateId(affiliate.id);
    }),

    // Create school invitation (affiliates can invite schools to their region)
    createSchoolInvitation: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get the affiliate's ID
        const affiliate = await db.getAffiliateByUserId(ctx.user.id);
        if (!affiliate) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
        }

        // Create invitation with affiliate's franchise ID
        return await db.createSchoolInvitation(
          input.email,
          affiliate.id,
          ctx.user.id,
          input.notes
        );
      }),

    // Update school status (affiliates can approve/suspend schools in their region)
    updateSchoolStatus: protectedProcedure
      .input(z.object({
        id: z.string().uuid(),
        status: z.enum(['pending', 'active', 'suspended'])
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify the school belongs to this affiliate
        const affiliate = await db.getAffiliateByUserId(ctx.user.id);
        if (!affiliate) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
        }

        const school = await db.getSchoolById(input.id);
        if (!school || school.affiliate_id !== affiliate.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only manage schools in your region' });
        }

        await db.updateSchoolStatus(input.id, input.status);
        return { success: true };
      }),

    // Get affiliate's dashboard stats
    getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
      }
      return await db.getAffiliateDashboardStats(affiliate.id);
    }),

    // Get candidates from affiliate's region
    getCandidates: protectedProcedure.query(async ({ ctx }) => {
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
      }
      return await db.getCandidatesByAffiliateId(affiliate.id);
    }),

    // Get jobs from affiliate's region
    getJobs: protectedProcedure.query(async ({ ctx }) => {
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
      }
      return await db.getJobsByAffiliateId(affiliate.id);
    }),

    // Get applications from affiliate's region
    getApplications: protectedProcedure.query(async ({ ctx }) => {
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
      }
      return await db.getApplicationsByAffiliateId(affiliate.id);
    }),

    // Get contracts from affiliate's region
    getContracts: protectedProcedure.query(async ({ ctx }) => {
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
      }
      return await db.getContractsByAffiliateId(affiliate.id);
    }),

    // Get payments from affiliate's region
    getPayments: protectedProcedure.query(async ({ ctx }) => {
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
      }
      return await db.getPaymentsByAffiliateId(affiliate.id);
    }),

    // DEV ONLY: Create test franchise account (remove in production)
    createTestAccount: publicProcedure
      .input(z.object({
        email: z.string().email().default('test-franchise@example.com'),
        password: z.string().min(6).default('test123'),
        name: z.string().default('Test Franchise Owner'),
        region: z.string().default('Test Region'),
        commission_rate: z.number().default(30),
      }))
      .mutation(async ({ input }) => {
        return await db.createTestAffiliateAccount(input);
      }),
  }),

  // Admin dashboard analytics
  admin: router({
    // Get dashboard statistics
    getStats: adminProcedure.query(async () => {
      return await db.getAdminDashboardStats();
    }),

    // Application management
    getAllApplications: adminProcedure.query(async () => {
      return await db.getAllApplications();
    }),

    updateApplicationStatus: adminProcedure
      .input(z.object({
        id: z.string().uuid(),
        status: z.enum(['applied', 'screening', 'interview-scheduled', 'interviewed', 'selected', 'rejected', 'withdrawn']),
      }))
      .mutation(async ({ input }) => {
        await db.updateApplicationStatus(input.id, input.status);
        return { success: true };
      }),

    // Contract management
    getAllContracts: adminProcedure.query(async () => {
      return await db.getAllContracts();
    }),

    updateContractStatus: adminProcedure
      .input(z.object({
        id: z.string().uuid(),
        status: z.enum(['pending-signature', 'active', 'suspended', 'terminated', 'completed']),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateContractStatus(input.id, input.status, ctx.user.id);
        return { success: true };
      }),

    // Payment management
    getAllPayments: adminProcedure.query(async () => {
      return await db.getAllPayments();
    }),

    updatePaymentStatus: adminProcedure
      .input(z.object({
        id: z.string().uuid(),
        status: z.enum(['pending', 'paid', 'overdue', 'failed', 'refunded']),
      }))
      .mutation(async ({ input }) => {
        await db.updatePaymentStatus(input.id, input.status);
        return { success: true };
      }),

    // Feedback management
    getAllFeedback: adminProcedure.query(async () => {
      return await db.getAllFeedback();
    }),

    updateFeedbackStatus: adminProcedure
      .input(z.object({
        id: z.string().uuid(),
        status: z.enum(['pending', 'submitted', 'reviewed']),
      }))
      .mutation(async ({ input }) => {
        await db.updateFeedbackStatus(input.id, input.status);
        return { success: true };
      }),

    // AI Matching oversight
    getAIMatchingStats: adminProcedure.query(async () => {
      return await db.getAIMatchingStats();
    }),

    getApplicationsWithScores: adminProcedure.query(async () => {
      return await db.getApplicationsWithScores();
    }),
  }),
});

export type AppRouter = typeof appRouter;
