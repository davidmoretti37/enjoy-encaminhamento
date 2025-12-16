// @ts-nocheck
// School router - school management
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { publicProcedure } from "../_core/trpc";
import { adminProcedure, schoolProcedure } from "./procedures";
import { sendEmail } from "./email";
import * as db from "../db";
import { ENV } from "../_core/env";

export const schoolRouter = router({
  // Get all active schools (public - for registration dropdown)
  getAllPublic: publicProcedure.query(async () => {
    return await db.getActiveSchoolsPublic();
  }),

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

  // Create school invitation (admin only) and optionally send email
  createInvitation: adminProcedure
    .input(z.object({
      email: z.string().email(),
      notes: z.string().optional(),
      sendEmail: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get the affiliate record for this user
      const affiliate = await db.getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate profile not found' });
      }

      const result = await db.createSchoolInvitation(
        input.email,
        affiliate.id,
        ctx.user.id,
        input.notes
      );

      // Send invitation email if requested
      if (input.sendEmail) {
        const baseUrl = ENV.appUrl;
        const inviteLink = `${baseUrl}/escola/registro?token=${result.token}`;

        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e293b;">Convite para Cadastro na Plataforma</h2>
            <p>Olá!</p>
            <p>Você foi convidado(a) para cadastrar sua escola em nossa plataforma de recrutamento.</p>
            <p>Clique no botão abaixo para completar seu cadastro:</p>
            <div style="margin: 30px 0;">
              <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Cadastrar Escola
              </a>
            </div>
            <p style="color: #64748b; font-size: 14px;">Este link expira em 7 dias.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #64748b; font-size: 12px;">
              Se você não solicitou este convite, por favor ignore este email.
            </p>
          </div>
        `;

        try {
          await sendEmail(
            input.email,
            'Convite para se cadastrar na plataforma',
            htmlBody
          );
        } catch (err: any) {
          console.error('[School Invitation] Email send error:', err);
          // Don't throw - invitation was created, just email failed
          return { ...result, emailSent: false, emailError: err.message };
        }
      }

      return { ...result, emailSent: input.sendEmail };
    }),

  // Validate school invitation (public - for registration page)
  validateInvitation: publicProcedure
    .input(z.object({
      token: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const invitation = await db.getSchoolInvitationByToken(input.token);
      if (!invitation) {
        return { isValid: false, reason: 'Convite nao encontrado' };
      }
      if (invitation.status !== 'pending') {
        return { isValid: false, reason: 'Convite ja utilizado' };
      }
      if (new Date(invitation.expires_at) < new Date()) {
        return { isValid: false, reason: 'Convite expirado' };
      }
      return { isValid: true, email: invitation.email };
    }),

  // Accept school invitation (public - creates account)
  acceptInvitation: publicProcedure
    .input(z.object({
      token: z.string().uuid(),
      password: z.string().min(6),
      schoolData: z.object({
        school_name: z.string(),
        cnpj: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        address: z.string().optional(),
      }),
      contractUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await db.acceptSchoolInvitation(
        input.token,
        input.password,
        input.schoolData,
        input.contractUrl
      );
      return { success: true, schoolId: result.school.id };
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
    const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
    if (!school) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'School profile not found. Please select a school first.' });
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
      const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
      if (!school) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found. Please select a school first.' });
      }
      await db.updateSchool(school.id, input);
      return { success: true };
    }),

  // Get dashboard statistics for school
  getDashboardStats: schoolProcedure.query(async ({ ctx }) => {
    const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
    if (!school) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found. Please select a school first.' });
    }
    return await db.getSchoolDashboardStats(school.id);
  }),

  // Get candidates registered by this school
  getCandidates: schoolProcedure.query(async ({ ctx }) => {
    const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
    if (!school) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found. Please select a school first.' });
    }
    return await db.getCandidatesBySchoolId(school.id);
  }),

  // Get applications from school's candidates
  getApplications: schoolProcedure.query(async ({ ctx }) => {
    const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
    if (!school) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found. Please select a school first.' });
    }
    return await db.getApplicationsBySchoolId(school.id);
  }),

  // Get companies from school's city
  getCompanies: schoolProcedure.query(async ({ ctx }) => {
    const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
    if (!school) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found. Please select a school first.' });
    }
    return await db.getCompaniesBySchoolId(school.id);
  }),

  // Get jobs available for this school's region
  getJobs: schoolProcedure.query(async ({ ctx }) => {
    const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
    if (!school) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found. Please select a school first.' });
    }
    return await db.getJobsBySchoolId(school.id);
  }),

  // Get contracts related to the school's candidates
  getContracts: schoolProcedure.query(async ({ ctx }) => {
    const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
    if (!school) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found. Please select a school first.' });
    }
    return await db.getContractsBySchoolId(school.id);
  }),

  // Get payments related to the school
  getPayments: schoolProcedure.query(async ({ ctx }) => {
    const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
    if (!school) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found. Please select a school first.' });
    }
    return await db.getPaymentsBySchoolId(school.id);
  }),

  // Get meetings for the school's affiliate
  getMeetings: schoolProcedure.query(async ({ ctx }) => {
    const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
    if (!school) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found. Please select a school first.' });
    }
    return await db.getMeetingsBySchoolId(school.id);
  }),

  // Contract management endpoints

  // Get school's contract
  getContract: schoolProcedure.query(async ({ ctx }) => {
    const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
    if (!school) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found. Please select a school first.' });
    }
    if (!school.contract_type) {
      return null;
    }
    return {
      type: school.contract_type,
      pdfUrl: school.contract_pdf_url,
      pdfKey: school.contract_pdf_key,
      html: school.contract_html,
    };
  }),

  // Upload PDF contract
  uploadContractPdf: schoolProcedure
    .input(z.object({
      fileBase64: z.string(),
      fileName: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
      if (!school) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found. Please select a school first.' });
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(input.fileBase64, 'base64');

      // Generate unique key
      const key = `contracts/${school.id}/${Date.now()}-${input.fileName}`;

      // Upload to storage
      const { storagePut } = await import('../storage');
      const { url } = await storagePut(key, buffer, 'application/pdf');

      // Update school contract info
      await db.updateSchoolContract(school.id, {
        contract_type: 'pdf',
        contract_pdf_url: url,
        contract_pdf_key: key,
        contract_html: null,
      });

      return { success: true, url };
    }),

  // Save HTML contract
  saveContractHtml: schoolProcedure
    .input(z.object({
      html: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
      if (!school) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found. Please select a school first.' });
      }

      await db.updateSchoolContract(school.id, {
        contract_type: 'html',
        contract_html: input.html,
        contract_pdf_url: null,
        contract_pdf_key: null,
      });

      return { success: true };
    }),

  // Delete contract
  deleteContract: schoolProcedure.mutation(async ({ ctx }) => {
    const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
    if (!school) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found. Please select a school first.' });
    }

    await db.updateSchoolContract(school.id, {
      contract_type: null,
      contract_html: null,
      contract_pdf_url: null,
      contract_pdf_key: null,
    });

    return { success: true };
  }),

  // Bulk import companies from Excel/CSV
  bulkImportCompanies: schoolProcedure
    .input(z.object({
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
      const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
      if (!school) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found' });
      }

      if (!school.affiliate_id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'School has no affiliate assigned' });
      }

      // Bulk create companies linked to the school's affiliate AND this school
      const result = await db.bulkCreateCompanies(input.companies, school.affiliate_id, school.id);

      return {
        created: result.created.length,
        failed: result.errors.length,
        errors: result.errors.map(e => e.message),
      };
    }),

  // ============================================
  // EMPLOYEE TYPE SETTINGS
  // ============================================

  /**
   * Get all employee type settings for school
   * Returns contract templates and payment configurations
   */
  getEmployeeTypeSettings: schoolProcedure
    .query(async ({ ctx }) => {
      const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
      if (!school) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found' });
      }

      const settings = await db.getSchoolEmployeeTypeSettings(school.id);
      return settings;
    }),

  /**
   * Get specific employee type setting
   */
  getEmployeeTypeSetting: schoolProcedure
    .input(z.object({
      employeeType: z.enum(['estagio', 'clt', 'menor-aprendiz']),
    }))
    .query(async ({ ctx, input }) => {
      const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
      if (!school) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found' });
      }

      const setting = await db.getSchoolEmployeeTypeSetting(school.id, input.employeeType);
      return setting;
    }),

  /**
   * Update employee type setting
   * Upserts contract template and payment configuration
   */
  updateEmployeeTypeSetting: schoolProcedure
    .input(z.object({
      employeeType: z.enum(['estagio', 'clt', 'menor-aprendiz']),
      contractTemplateType: z.enum(['pdf', 'html']).optional(),
      contractPdfUrl: z.string().optional(),
      contractPdfKey: z.string().optional(),
      contractHtml: z.string().optional(),
      paymentFrequency: z.enum(['one_time', 'recurring']),
      defaultUnlockFee: z.number().nonnegative().optional(),
      monthlyFee: z.number().nonnegative().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
      if (!school) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found' });
      }

      const settingId = await db.upsertSchoolEmployeeTypeSetting(school.id, {
        employeeType: input.employeeType,
        contractTemplateType: input.contractTemplateType,
        contractPdfUrl: input.contractPdfUrl,
        contractPdfKey: input.contractPdfKey,
        contractHtml: input.contractHtml,
        paymentFrequency: input.paymentFrequency,
        defaultUnlockFee: input.defaultUnlockFee,
        monthlyFee: input.monthlyFee,
      });

      return { success: true, settingId };
    }),

  /**
   * Delete employee type setting
   */
  deleteEmployeeTypeSetting: schoolProcedure
    .input(z.object({
      employeeType: z.enum(['estagio', 'clt', 'menor-aprendiz']),
    }))
    .mutation(async ({ ctx, input }) => {
      const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
      if (!school) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found' });
      }

      await db.deleteSchoolEmployeeTypeSetting(school.id, input.employeeType);
      return { success: true };
    }),

  // Bulk import candidates from Excel/CSV
  bulkImportCandidates: schoolProcedure
    .input(z.object({
      candidates: z.array(z.object({
        full_name: z.string().min(1),
        cpf: z.string().min(11).max(14),
        email: z.string().email(),
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
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const school = await db.getSchoolForUserContext(ctx.user.id, ctx.user.role);
      if (!school) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'School not found' });
      }

      // Bulk create candidates linked to this school
      const result = await db.bulkCreateCandidates(input.candidates, school.id);

      return {
        created: result.created.length,
        failed: result.errors.length,
        errors: result.errors.map(e => e.message),
      };
    }),
});
