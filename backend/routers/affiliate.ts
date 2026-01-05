// @ts-nocheck
// Affiliate router - affiliate management
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure } from "../_core/trpc";
import { adminProcedure } from "./procedures";
import { sendEmail } from "./email";
import * as db from "../db";
import { ENV } from "../_core/env";
import { parseExcelWithAI, suggestColumnMappings as suggestColumnMappingsAI, identifyBasicColumns } from "../services/ai/columnMapper";

export const affiliateRouter = router({
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
      affiliate: z.object({
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
        affiliateData: input.affiliate,
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

  // Get companies from affiliate's region (optionally filtered by school)
  getCompanies: protectedProcedure
    .input(z.object({ schoolId: z.string().uuid().nullable().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
      }
      // Use provided schoolId, or fall back to stored context, or null for all
      const schoolId = input?.schoolId ?? await db.getAdminSchoolContext(ctx.user.id);
      return await db.getCompaniesByAffiliateId(affiliate.id, schoolId);
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

      // Create invitation with affiliate's ID
      const result = await db.createSchoolInvitation(
        input.email,
        affiliate.id,
        ctx.user.id,
        input.notes
      );

      // Send invitation email via SMTP
      const baseUrl = ENV.appUrl;
      const inviteLink = `${baseUrl}/register/school?token=${result.token}`;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e293b;">Convite para Cadastro na Plataforma</h2>
          <p>Olá!</p>
          <p>Você foi convidado(a) por <strong>${affiliate.name}</strong> para cadastrar sua escola em nossa plataforma de recrutamento.</p>
          ${input.notes ? `<p><strong>Mensagem:</strong> ${input.notes}</p>` : ''}
          <p>Clique no botão abaixo para completar seu cadastro:</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Cadastrar Escola
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Este link é válido por 7 dias e é exclusivo para ${input.email}.</p>
        </div>
      `;

      await sendEmail(
        input.email,
        'Convite para Cadastro - Currículos MVP',
        htmlBody
      );

      return result;
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

  // Get affiliate's dashboard stats (optionally filtered by school)
  getDashboardStats: protectedProcedure
    .input(z.object({ schoolId: z.string().uuid().nullable().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
      }
      // null = explicitly "all schools" mode, undefined = use stored context
      const schoolId = input?.schoolId === null
        ? undefined
        : (input?.schoolId ?? await db.getAdminSchoolContext(ctx.user.id));
      return await db.getAffiliateDashboardStats(affiliate.id, schoolId);
    }),

  // Get candidates from affiliate's region (optionally filtered by school)
  getCandidates: protectedProcedure
    .input(z.object({ schoolId: z.string().uuid().nullable().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
      }
      // null = explicitly "all schools" mode, undefined = use stored context
      const schoolId = input?.schoolId === null
        ? undefined
        : (input?.schoolId ?? await db.getAdminSchoolContext(ctx.user.id));
      return await db.getCandidatesByAffiliateId(affiliate.id, schoolId);
    }),

  // Get jobs from affiliate's region (optionally filtered by school)
  getJobs: protectedProcedure
    .input(z.object({ schoolId: z.string().uuid().nullable().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
      }
      // null = explicitly "all schools" mode, undefined = use stored context
      const schoolId = input?.schoolId === null
        ? undefined
        : (input?.schoolId ?? await db.getAdminSchoolContext(ctx.user.id));
      return await db.getJobsByAffiliateId(affiliate.id, schoolId);
    }),

  // Get applications from affiliate's region (optionally filtered by school)
  getApplications: protectedProcedure
    .input(z.object({ schoolId: z.string().uuid().nullable().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
      }
      // null = explicitly "all schools" mode, undefined = use stored context
      const schoolId = input?.schoolId === null
        ? undefined
        : (input?.schoolId ?? await db.getAdminSchoolContext(ctx.user.id));
      return await db.getApplicationsByAffiliateId(affiliate.id, schoolId);
    }),

  // Get contracts from affiliate's region (optionally filtered by school)
  getContracts: protectedProcedure
    .input(z.object({ schoolId: z.string().uuid().nullable().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
      }
      // null = explicitly "all schools" mode, undefined = use stored context
      const schoolId = input?.schoolId === null
        ? undefined
        : (input?.schoolId ?? await db.getAdminSchoolContext(ctx.user.id));
      return await db.getContractsByAffiliateId(affiliate.id, schoolId);
    }),

  // Get payments from affiliate's region (optionally filtered by school)
  getPayments: protectedProcedure
    .input(z.object({ schoolId: z.string().uuid().nullable().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
      }
      // null = explicitly "all schools" mode, undefined = use stored context
      const schoolId = input?.schoolId === null
        ? undefined
        : (input?.schoolId ?? await db.getAdminSchoolContext(ctx.user.id));
      return await db.getPaymentsByAffiliateId(affiliate.id, schoolId);
    }),

  // Bulk import companies from Excel/CSV
  bulkImportCompanies: protectedProcedure
    .input(z.object({
      schoolId: z.string().uuid(),
      companies: z.array(z.object({
        company_name: z.string().min(1),
        email: z.string().email(),
        emails: z.array(z.object({
          email: z.string(),
          label: z.string(),
          isPrimary: z.boolean(),
        })).optional(),
        cnpj: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip_code: z.string().optional(),
        industry: z.string().optional(),
        company_size: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
        website: z.string().optional(),
        description: z.string().optional(),
        notes: z.string().optional(),
        // Job data (optional)
        job: z.object({
          title: z.string(),
          description: z.string().optional(),
          salary: z.string().optional(),
          schedule: z.string().optional(),
          benefits: z.string().optional(),
          contract_type: z.string().optional(),
          work_type: z.string().optional(),
          required_skills: z.string().optional(),
          openings: z.string().optional(),
          urgency: z.string().optional(),
          gender_preference: z.string().optional(),
          age_range: z.string().optional(),
          education: z.string().optional(),
          notes: z.string().optional(),
        }).optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get affiliate for this user
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
      }

      // Verify the school belongs to this affiliate
      const school = await db.getSchoolById(input.schoolId);
      if (!school || school.affiliate_id !== affiliate.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'School does not belong to this affiliate' });
      }

      // Bulk create companies linked to both affiliate and school
      const result = await db.bulkCreateCompanies(input.companies, affiliate.id, input.schoolId);

      return {
        created: result.created.length,
        failed: result.errors.length,
        errors: result.errors.map(e => e.message),
      };
    }),

  // AI-powered column mapping suggestions for Excel import (legacy)
  suggestColumnMappings: protectedProcedure
    .input(z.object({
      headers: z.array(z.string()),
      sampleRows: z.array(z.record(z.string())),
    }))
    .mutation(async ({ input }) => {
      const result = await suggestColumnMappingsAI(input.headers, input.sampleRows);
      return result;
    }),

  // AI parses entire Excel and returns candidates directly (new simplified flow)
  parseExcelWithAI: protectedProcedure
    .input(z.object({
      headers: z.array(z.string()),
      rows: z.array(z.record(z.string())),
    }))
    .mutation(async ({ input }) => {
      const result = await parseExcelWithAI(input.headers, input.rows);
      return result;
    }),

  // NEW: AI identifies only basic columns (name, cpf, email) - for dynamic preview
  analyzeExcel: protectedProcedure
    .input(z.object({
      headers: z.array(z.string()),
      sampleRows: z.array(z.record(z.string())),
    }))
    .mutation(async ({ input }) => {
      const result = await identifyBasicColumns(input.headers, input.sampleRows);
      return result;
    }),

  // Bulk import candidates from Excel/CSV (affiliate)
  bulkImportCandidates: protectedProcedure
    .input(z.object({
      schoolId: z.string().uuid(),
      candidates: z.array(z.object({
        full_name: z.string().min(1),
        cpf: z.string().min(11).max(14).optional(),
        email: z.string().email().optional(),
        source: z.enum(['internal', 'external']).optional().default('internal'),
        phone: z.string().optional(),
        date_of_birth: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip_code: z.string().optional(),
        education_level: z.enum(['fundamental', 'medio', 'superior', 'pos-graduacao', 'mestrado', 'doutorado']).optional(),
        currently_studying: z.boolean().optional(),
        institution: z.string().optional(),
        course: z.string().optional(),
        skills: z.array(z.string()).optional(),
        languages: z.array(z.string()).optional(),
        has_work_experience: z.boolean().optional(),
        profile_summary: z.string().optional(),
        available_for_internship: z.boolean().optional(),
        available_for_clt: z.boolean().optional(),
        available_for_apprentice: z.boolean().optional(),
        preferred_work_type: z.enum(['presencial', 'remoto', 'hibrido']).optional(),
        // DISC profile
        disc_dominante: z.number().min(0).max(100).optional(),
        disc_influente: z.number().min(0).max(100).optional(),
        disc_estavel: z.number().min(0).max(100).optional(),
        disc_conforme: z.number().min(0).max(100).optional(),
        // PDP data
        pdp_competencies: z.array(z.string()).optional(),
        pdp_intrapersonal: z.record(z.string()).optional(),
        pdp_interpersonal: z.record(z.string()).optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get affiliate for this user
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
      }

      // Verify the school belongs to this affiliate
      const school = await db.getSchoolById(input.schoolId);
      if (!school || school.affiliate_id !== affiliate.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'School does not belong to this affiliate' });
      }

      // Bulk create candidates linked to the school
      const result = await db.bulkCreateCandidates(input.candidates, input.schoolId);

      return {
        created: result.created.length,
        failed: result.errors.length,
        errors: result.errors.map(e => e.message),
      };
    }),
});
