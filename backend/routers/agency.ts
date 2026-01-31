// @ts-nocheck
// Agency router - regional recruitment agency management
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { publicProcedure } from "../_core/trpc";
import { adminProcedure, agencyProcedure } from "./procedures";
import { sendEmail } from "./email";
import * as db from "../db";
import { ENV } from "../_core/env";
import { parseExcelWithAI, suggestColumnMappings as suggestColumnMappingsAI, identifyBasicColumns, suggestCompanyColumnMappings, getCompanyFieldsList } from "../services/ai/columnMapper";

export const agencyRouter = router({
  // Get all active agencies (public - for registration dropdown)
  getAllPublic: publicProcedure.query(async () => {
    return await db.getActiveAgenciesPublic();
  }),

  // Get all agencies (admin only)
  getAll: adminProcedure.query(async () => {
    return await db.getAllAgencies();
  }),

  // Get agency by ID
  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return await db.getAgencyById(input.id);
    }),

  // Update agency status (approve/suspend)
  updateStatus: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      status: z.enum(['pending', 'active', 'suspended'])
    }))
    .mutation(async ({ input }) => {
      await db.updateAgencyStatus(input.id, input.status);
      return { success: true };
    }),

  // Create agency invitation (admin only) and optionally send email
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

      const result = await db.createAgencyInvitation(
        input.email,
        affiliate.id,
        ctx.user.id,
        input.notes
      );

      // Send invitation email if requested
      if (input.sendEmail) {
        const baseUrl = ENV.appUrl;
        const inviteLink = `${baseUrl}/agencia/registro?token=${result.token}`;

        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e293b;">Convite para Cadastro na Plataforma</h2>
            <p>Olá!</p>
            <p>Você foi convidado(a) para cadastrar sua agencia em nossa plataforma de recrutamento.</p>
            <p>Clique no botão abaixo para completar seu cadastro:</p>
            <div style="margin: 30px 0;">
              <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Cadastrar Agência
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
          console.error('[Agency Invitation] Email send error:', err);
          // Don't throw - invitation was created, just email failed
          return { ...result, emailSent: false, emailError: err.message };
        }
      }

      return { ...result, emailSent: input.sendEmail };
    }),

  // Validate agency invitation (public - for registration page)
  validateInvitation: publicProcedure
    .input(z.object({
      token: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const invitation = await db.getAgencyInvitationByToken(input.token);
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

  // Accept agency invitation (public - creates account)
  acceptInvitation: publicProcedure
    .input(z.object({
      token: z.string().uuid(),
      password: z.string().min(6),
      agencyData: z.object({
        agency_name: z.string(),
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
      const result = await db.acceptAgencyInvitation(
        input.token,
        input.password,
        input.agencyData,
        input.contractUrl
      );
      return { success: true, agencyId: result.agency.id };
    }),

  // Update agency details
  update: adminProcedure
    .input(z.object({
      id: z.string().uuid(),
      agency_name: z.string().optional(),
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
      await db.updateAgency(id, data);
      return { success: true };
    }),

  // Get agency statistics
  getStats: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return await db.getAgencyStats(input.id);
    }),

  // Agency-specific endpoints (for logged-in agency users)

  // Get current agency profile
  getProfile: agencyProcedure.query(async ({ ctx }) => {
    const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
    if (!agency) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency profile not found. Please select an agency first.' });
    }
    return agency;
  }),

  // Update own agency profile
  updateProfile: agencyProcedure
    .input(z.object({
      agency_name: z.string().optional(),
      trade_name: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postal_code: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found. Please select an agency first.' });
      }
      await db.updateAgency(agency.id, input);
      return { success: true };
    }),

  // Get dashboard statistics for agency
  getDashboardStats: agencyProcedure.query(async ({ ctx }) => {
    const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
    if (!agency) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found. Please select an agency first.' });
    }
    return await db.getAgencyDashboardStats(agency.id);
  }),

  // Get candidates registered by this agency
  getCandidates: agencyProcedure.query(async ({ ctx }) => {
    const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
    if (!agency) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found. Please select an agency first.' });
    }
    return await db.getCandidatesByAgencyId(agency.id);
  }),

  // Get applications from agency's candidates
  getApplications: agencyProcedure.query(async ({ ctx }) => {
    const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
    if (!agency) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found. Please select an agency first.' });
    }
    return await db.getApplicationsByAgencyId(agency.id);
  }),

  // Get companies from agency's city
  getCompanies: agencyProcedure.query(async ({ ctx }) => {
    const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
    if (!agency) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found. Please select an agency first.' });
    }
    return await db.getCompaniesByAgencyId(agency.id);
  }),

  // Get jobs available for this agency's region
  getJobs: agencyProcedure.query(async ({ ctx }) => {
    const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
    if (!agency) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found. Please select an agency first.' });
    }
    return await db.getJobsByAgencyId(agency.id);
  }),

  // Get contracts related to the agency's candidates
  getContracts: agencyProcedure.query(async ({ ctx }) => {
    const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
    if (!agency) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found. Please select an agency first.' });
    }
    return await db.getContractsByAgencyId(agency.id);
  }),

  // Get payments related to the agency
  getPayments: agencyProcedure.query(async ({ ctx }) => {
    const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
    if (!agency) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found. Please select an agency first.' });
    }
    return await db.getPaymentsByAgencyId(agency.id);
  }),

  // Get meetings for the agency's affiliate
  getMeetings: agencyProcedure.query(async ({ ctx }) => {
    const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
    if (!agency) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found. Please select an agency first.' });
    }
    return await db.getMeetingsByAgencyId(agency.id);
  }),

  // Contract management endpoints

  // Get agency's contract
  getContract: agencyProcedure.query(async ({ ctx }) => {
    const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
    if (!agency) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found. Please select an agency first.' });
    }
    if (!agency.contract_type) {
      return null;
    }
    return {
      type: agency.contract_type,
      pdfUrl: agency.contract_pdf_url,
      pdfKey: agency.contract_pdf_key,
      html: agency.contract_html,
    };
  }),

  // Upload PDF contract
  uploadContractPdf: agencyProcedure
    .input(z.object({
      fileBase64: z.string(),
      fileName: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found. Please select an agency first.' });
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(input.fileBase64, 'base64');

      // Generate unique key
      const key = `contracts/${agency.id}/${Date.now()}-${input.fileName}`;

      // Upload to storage
      const { storagePut } = await import('../storage');
      const { url } = await storagePut(key, buffer, 'application/pdf');

      // Update agency contract info
      await db.updateAgencyContract(agency.id, {
        contract_type: 'pdf',
        contract_pdf_url: url,
        contract_pdf_key: key,
        contract_html: null,
      });

      return { success: true, url };
    }),

  // Save HTML contract
  saveContractHtml: agencyProcedure
    .input(z.object({
      html: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found. Please select an agency first.' });
      }

      await db.updateAgencyContract(agency.id, {
        contract_type: 'html',
        contract_html: input.html,
        contract_pdf_url: null,
        contract_pdf_key: null,
      });

      return { success: true };
    }),

  // Delete contract
  deleteContract: agencyProcedure.mutation(async ({ ctx }) => {
    const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
    if (!agency) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found. Please select an agency first.' });
    }

    await db.updateAgencyContract(agency.id, {
      contract_type: null,
      contract_html: null,
      contract_pdf_url: null,
      contract_pdf_key: null,
    });

    return { success: true };
  }),

  // AI-powered column mapping for company imports
  analyzeCompanyColumns: agencyProcedure
    .input(z.object({
      headers: z.array(z.string()),
      sampleRows: z.array(z.record(z.string())),
    }))
    .mutation(async ({ input }) => {
      const result = await suggestCompanyColumnMappings(input.headers, input.sampleRows);
      return result;
    }),

  // Get available company fields for manual mapping
  getCompanyFields: agencyProcedure
    .query(async () => {
      return getCompanyFieldsList();
    }),

  // Bulk import companies from Excel/CSV
  bulkImportCompanies: agencyProcedure
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
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
      }

      if (!agency.affiliate_id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Agency has no affiliate assigned' });
      }

      // Bulk create companies linked to the agency's affiliate AND this agency
      const result = await db.bulkCreateCompanies(input.companies, agency.affiliate_id, agency.id);

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
   * Get all employee type settings for agency
   * Returns contract templates and payment configurations
   */
  getEmployeeTypeSettings: agencyProcedure
    .query(async ({ ctx }) => {
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
      }

      const settings = await db.getAgencyEmployeeTypeSettings(agency.id);
      return settings;
    }),

  /**
   * Get specific employee type setting
   */
  getEmployeeTypeSetting: agencyProcedure
    .input(z.object({
      employeeType: z.enum(['estagio', 'clt', 'menor-aprendiz']),
    }))
    .query(async ({ ctx, input }) => {
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
      }

      const setting = await db.getAgencyEmployeeTypeSetting(agency.id, input.employeeType);
      return setting;
    }),

  /**
   * Update employee type setting
   * Upserts contract template and payment configuration
   */
  updateEmployeeTypeSetting: agencyProcedure
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
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
      }

      const settingId = await db.upsertAgencyEmployeeTypeSetting(agency.id, {
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
  deleteEmployeeTypeSetting: agencyProcedure
    .input(z.object({
      employeeType: z.enum(['estagio', 'clt', 'menor-aprendiz']),
    }))
    .mutation(async ({ ctx, input }) => {
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
      }

      await db.deleteAgencyEmployeeTypeSetting(agency.id, input.employeeType);
      return { success: true };
    }),

  // AI-powered column mapping suggestions for Excel import (legacy)
  suggestColumnMappings: agencyProcedure
    .input(z.object({
      headers: z.array(z.string()),
      sampleRows: z.array(z.record(z.string())),
    }))
    .mutation(async ({ input }) => {
      const result = await suggestColumnMappingsAI(input.headers, input.sampleRows);
      return result;
    }),

  // AI parses entire Excel and returns candidates directly (new simplified flow)
  parseExcelWithAI: agencyProcedure
    .input(z.object({
      headers: z.array(z.string()),
      rows: z.array(z.record(z.string())),
    }))
    .mutation(async ({ input }) => {
      const result = await parseExcelWithAI(input.headers, input.rows);
      return result;
    }),

  // NEW: AI identifies only basic columns (name, cpf, email) - for dynamic preview
  analyzeExcel: agencyProcedure
    .input(z.object({
      headers: z.array(z.string()),
      sampleRows: z.array(z.record(z.string())),
    }))
    .mutation(async ({ input }) => {
      const result = await identifyBasicColumns(input.headers, input.sampleRows);
      return result;
    }),

  // Bulk import candidates from Excel/CSV
  bulkImportCandidates: agencyProcedure
    .input(z.object({
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
      const agency = await db.getAgencyForUserContext(ctx.user.id, ctx.user.role);
      if (!agency) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
      }

      // Bulk create candidates linked to this agency
      const result = await db.bulkCreateCandidates(input.candidates, agency.id);

      return {
        created: result.created.length,
        failed: result.errors.length,
        errors: result.errors.map(e => e.message),
      };
    }),
});
