// @ts-nocheck
// Company router - company management and portal
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";
import { adminProcedure, companyProcedure } from "./procedures";
import * as db from "../db";
import { supabaseAdmin } from "../supabase";
import { generateCompanySummary } from "../services/ai/summarizer";

export const companyRouter = router({
  // Check if company has completed onboarding
  checkOnboarding: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'company') {
      return { completed: true }; // Non-company users don't need company onboarding
    }
    const company = await db.getCompanyByUserId(ctx.user.id);
    // Company onboarding is complete if company profile exists with required fields
    const completed = !!(company && company.cnpj && company.company_name);
    return { completed, company };
  }),

  // Get the agency's contract for company onboarding
  getAgencyContract: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'company') {
      return null;
    }
    // Get agency_id from user's profile
    const userProfile = await db.getUserById(ctx.user.id);
    const agencyId = userProfile?.agency_id || ctx.user.agency_id;

    if (!agencyId) {
      return null;
    }

    const agency = await db.getAgencyById(agencyId);
    if (!agency) {
      return null;
    }

    return {
      agency_name: agency.name,
      contract_type: agency.contract_type || null,
      contract_pdf_url: agency.contract_pdf_url || null,
      contract_html: agency.contract_html || null,
    };
  }),

  // Submit onboarding (company info + first job + contract signature)
  submitOnboarding: protectedProcedure
    .input(z.object({
      // Company data
      cnpj: z.string().min(11),
      legalName: z.string().min(1),
      businessName: z.string().optional(),
      contactPerson: z.string().optional(),
      phoneNumbers: z.array(z.object({
        label: z.string(),
        number: z.string(),
      })).optional(),
      emails: z.array(z.object({
        label: z.string(),
        email: z.string(),
        isPrimary: z.boolean(),
      })).optional(),
      landlinePhone: z.string().optional(),
      mobilePhone: z.string().optional(),
      website: z.string().optional(),
      employeeCount: z.string().optional(),
      socialMedia: z.string().optional(),
      cep: z.string().optional(),
      address: z.string().optional(),
      complement: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      // Job data
      jobTitle: z.string().min(1),
      compensation: z.string().min(1),
      mainActivities: z.string().min(1),
      requiredSkills: z.string().min(1),
      employmentType: z.string().optional(),
      urgency: z.string().optional(),
      ageRange: z.string().optional(),
      educationLevel: z.string().min(1),
      benefits: z.array(z.string()).optional(),
      workSchedule: z.string().min(1),
      positionsCount: z.string().optional(),
      genderPreference: z.string().optional(),
      notes: z.string().optional(),
      // Contract signature data
      contractSignature: z.string().optional(), // Base64 signature image
      contractSignerName: z.string().optional(),
      contractSignerCpf: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'company') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only companies can submit onboarding' });
      }

      // Ensure user profile exists in users table (handles race condition from signup)
      const existingProfile = await db.getUserById(ctx.user.id);
      if (!existingProfile) {
        await db.createUserProfile({
          id: ctx.user.id,
          email: ctx.user.email || '',
          name: ctx.user.name || null,
          role: 'company',
          agency_id: ctx.user.agency_id || null,
        });
      }

      // Get agency_id from user profile (set during signup)
      const userProfile = existingProfile || await db.getUserById(ctx.user.id);
      const agencyId = userProfile?.agency_id || ctx.user.agency_id;

      if (!agencyId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Agência não vinculada. Por favor, faça login novamente.' });
      }

      // Get agency's affiliate_id for proper linking
      const { data: agencyData } = await supabaseAdmin
        .from('agencies')
        .select('id, affiliate_id')
        .eq('id', agencyId)
        .single();

      // Check if company already exists
      let company = await db.getCompanyByUserId(ctx.user.id);

      // Get primary phone from phoneNumbers array (first one with a number)
      const primaryPhone = input.phoneNumbers?.find(p => p.number)?.number || input.mobilePhone;

      // Get primary email from emails array
      const primaryEmail = input.emails?.find(e => e.isPrimary)?.email || input.emails?.[0]?.email || ctx.user.email || '';

      if (company) {
        // Update existing company - also set agency linking if not already set
        await db.updateCompany(company.id, {
          cnpj: input.cnpj,
          company_name: input.legalName,
          business_name: input.businessName,
          contact_person: input.contactPerson,
          contact_phone: primaryPhone,
          email: primaryEmail,
          landline_phone: input.landlinePhone,
          mobile_phone: input.mobilePhone,
          website: input.website,
          employee_count: input.employeeCount,
          social_media: input.socialMedia,
          cep: input.cep,
          address: input.address,
          complement: input.complement,
          neighborhood: input.neighborhood,
          city: input.city,
          state: input.state,
          agency_id: agencyId,
          affiliate_id: agencyData?.affiliate_id || null,
        });
      } else {
        // Create new company - use snake_case column names to match database schema
        const companyId = await db.createCompany({
          user_id: ctx.user.id,
          company_name: input.legalName,
          cnpj: input.cnpj,
          email: primaryEmail,
          phone: primaryPhone,
          address: input.address,
          city: input.city,
          state: input.state,
          website: input.website,
          status: 'active',
          agency_id: agencyId,
          affiliate_id: agencyData?.affiliate_id || null,
        });
        company = await db.getCompanyById(companyId);
      }

      if (!company) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create company' });
      }

      // Save multiple phone numbers to company_phone_numbers table
      if (input.phoneNumbers && input.phoneNumbers.length > 0) {
        // Delete existing phone numbers for this company
        await supabaseAdmin
          .from('company_phone_numbers')
          .delete()
          .eq('company_id', company.id);

        // Insert new phone numbers
        const phoneRecords = input.phoneNumbers
          .filter(p => p.number.trim())
          .map(p => ({
            company_id: company.id,
            label: p.label || 'Principal',
            phone_number: p.number,
          }));

        if (phoneRecords.length > 0) {
          await supabaseAdmin
            .from('company_phone_numbers')
            .insert(phoneRecords);
        }
      }

      // Save multiple emails to company_emails table
      if (input.emails && input.emails.length > 0) {
        // Delete existing emails for this company
        await supabaseAdmin
          .from('company_emails')
          .delete()
          .eq('company_id', company.id);

        // Insert new emails
        const emailRecords = input.emails
          .filter(e => e.email.trim())
          .map(e => ({
            company_id: company.id,
            label: e.label || 'Principal',
            email: e.email,
            is_primary: e.isPrimary,
          }));

        if (emailRecords.length > 0) {
          await supabaseAdmin
            .from('company_emails')
            .insert(emailRecords);
        }
      }

      // Create the job request - map form fields to database columns
      // Build description from main activities and requirements
      const description = `${input.mainActivities}\n\nRequisitos: ${input.requiredSkills}${input.notes ? `\n\nObservações: ${input.notes}` : ''}`;

      // Map employment type to contract_type enum
      const contractTypeMap: Record<string, 'estagio' | 'clt' | 'menor-aprendiz'> = {
        'clt': 'clt',
        'estagio': 'estagio',
        'jovem_aprendiz': 'menor-aprendiz',
        'pj': 'clt', // fallback
        'temporario': 'clt', // fallback
      };
      const contractType = contractTypeMap[input.employmentType || 'clt'] || 'clt';

      // Parse salary from compensation string (e.g., "R$ 2.000,00" -> 2000)
      const salaryMatch = input.compensation?.match(/[\d.,]+/);
      const salary = salaryMatch ? parseFloat(salaryMatch[0].replace(/\./g, '').replace(',', '.')) : null;

      // Map education level to database enum
      const educationMap: Record<string, 'fundamental' | 'medio' | 'superior' | 'pos-graduacao'> = {
        'fundamental_incompleto': 'fundamental',
        'fundamental_completo': 'fundamental',
        'medio_incompleto': 'medio',
        'medio_completo': 'medio',
        'tecnico': 'medio',
        'superior_incompleto': 'superior',
        'superior_completo': 'superior',
        'pos_graduacao': 'pos-graduacao',
        'mestrado': 'pos-graduacao',
        'doutorado': 'pos-graduacao',
      };

      // Build location from city and state
      const location = input.city && input.state
        ? `${input.city}, ${input.state}`
        : input.city || input.state || null;

      const jobId = await db.createJobForOnboarding(company.id, {
        title: input.jobTitle,
        description,
        contract_type: contractType,
        work_type: 'presencial', // Default to presencial
        salary: salary ? Math.round(salary) : null, // Store in reais
        salary_min: salary, // Store in reais
        salary_max: salary, // Same as min if single value provided
        benefits: input.benefits || [],
        min_education_level: educationMap[input.educationLevel] || null,
        required_skills: input.requiredSkills ? [input.requiredSkills] : [],
        requirements: input.requiredSkills || null,
        work_schedule: input.workSchedule,
        location,
        openings: input.positionsCount ? parseInt(input.positionsCount) : 1,
        status: 'open',
        published_at: new Date().toISOString(),
        agency_id: agencyId,
      });

      // Save contract signature if provided
      if (input.contractSignature && input.contractSignerName && input.contractSignerCpf) {
        await db.updateCompany(company.id, {
          contract_signature: input.contractSignature,
          contract_signer_name: input.contractSignerName,
          contract_signer_cpf: input.contractSignerCpf,
          contract_signed_at: new Date().toISOString(),
        });
      }

      // Generate company summary in background (fire and forget)
      generateCompanySummary({
        companyName: input.legalName,
        cnpj: input.cnpj,
        industry: undefined, // Not collected in onboarding
        companySize: input.employeeCount,
        website: input.website,
        description: undefined,
        city: input.city,
        state: input.state,
        jobTitle: input.jobTitle,
        contractType: input.employmentType,
        workType: 'presencial',
        compensation: input.compensation,
        mainActivities: input.mainActivities,
        requiredSkills: input.requiredSkills,
        benefits: input.benefits,
        educationLevel: input.educationLevel,
        notes: input.notes,
      }).then(async (summary) => {
        if (summary && company) {
          await db.updateCompany(company.id, {
            summary,
            summary_generated_at: new Date().toISOString(),
          });
          console.log(`Generated summary for company ${company.id}`);
        }
      }).catch((err) => {
        console.error('Failed to generate company summary:', err);
      });

      return { success: true, companyId: company.id };
    }),

  // Get current company profile
  getProfile: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    // Return null instead of throwing - let frontend handle missing profile
    return company || null;
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

  // Create company profile for existing user (admin only)
  createForExistingUser: adminProcedure
    .input(z.object({
      email: z.string().email(),
      companyName: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const company = await db.createCompanyForExistingUser(input.email, input.companyName);
      if (!company) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create company' });
      }
      return { success: true, companyId: company.id };
    }),

  // ==================== COMPANY PORTAL PROCEDURES ====================

  // Dashboard
  getDashboardStats: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
    }
    return await db.getCompanyDashboardStats(company.id);
  }),

  getUpcomingEvents: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) return [];
    return await db.getCompanyUpcomingEvents(company.id);
  }),

  getPendingActions: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) {
      return { pendingFeedback: [], overduePayments: [], pendingAvailability: [] };
    }
    return await db.getCompanyPendingActions(company.id);
  }),

  // Jobs
  getJobs: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) return [];
    return await db.getCompanyJobsWithStatus(company.id);
  }),

  createJobRequest: companyProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      contract_type: z.enum(['estagio', 'clt', 'menor-aprendiz']),
      salary_min: z.number().optional(),
      salary_max: z.number().optional(),
      work_schedule: z.string().optional(),
      city: z.string().optional(),
      requirements: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }
      const jobId = await db.createJobRequest(company.id, input);
      return { jobId };
    }),

  pauseJob: companyProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }
      await db.updateCompanyJobStatus(input.jobId, company.id, 'paused');
      return { success: true };
    }),

  resumeJob: companyProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }
      await db.updateCompanyJobStatus(input.jobId, company.id, 'searching');
      return { success: true };
    }),

  // Scheduling
  getVisits: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) return [];
    return await db.getJobPresentations(company.id);
  }),

  submitVisitAvailability: companyProcedure
    .input(z.object({
      presentationId: z.string(),
      scheduledAt: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }
      await db.submitVisitAvailability(input.presentationId, company.id, input.scheduledAt);
      return { success: true };
    }),

  getInterviews: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) return [];
    return await db.getCompanyInterviews(company.id);
  }),

  getPendingFeedback: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) return [];
    return await db.getInterviewsPendingFeedback(company.id);
  }),

  submitInterviewFeedback: companyProcedure
    .input(z.object({
      applicationId: z.string(),
      candidateAttended: z.boolean(),
      decision: z.enum(['hire', 'reject']),
      rejectionReason: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.submitInterviewFeedback({
        application_id: input.applicationId,
        candidate_attended: input.candidateAttended,
        decision: input.decision,
        rejection_reason: input.rejectionReason,
        notes: input.notes,
        submitted_by: ctx.user.id,
        submitted_at: new Date().toISOString(),
      });
      return { success: true };
    }),

  // Selection
  getPresentedCandidates: companyProcedure
    .input(z.object({ jobId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) return [];
      return await db.getPresentedCandidates(company.id, input?.jobId);
    }),

  getCandidateProfile: companyProcedure
    .input(z.object({ candidateId: z.string() }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }
      const profile = await db.getCandidateProfileForCompany(input.candidateId, company.id);
      if (!profile) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Candidate was not presented to your company' });
      }
      return profile;
    }),

  selectCandidatesForInterview: companyProcedure
    .input(z.object({
      presentationId: z.string(),
      candidateIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }
      await db.selectCandidatesForInterview(input.presentationId, company.id, input.candidateIds);
      return { success: true };
    }),

  // Contracts
  getContracts: companyProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) return [];
      return await db.getCompanyContractsWithDetails(company.id, input?.status);
    }),

  getExpiringContracts: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) return [];
    return await db.getExpiringContracts(company.id, 30);
  }),

  // Employee details for detail page
  getEmployeeDetails: companyProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }
      const employee = await db.getEmployeeDetails(input.contractId, company.id);
      if (!employee) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' });
      }
      return employee;
    }),

  // Payment history for specific employee
  getEmployeePayments: companyProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) return [];
      return await db.getEmployeePayments(input.contractId, company.id);
    }),

  getContractReports: companyProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) return [];
      return await db.getContractReports(input.contractId, company.id);
    }),

  submitMonthlyReport: companyProcedure
    .input(z.object({
      contractId: z.string(),
      periodMonth: z.number().min(1).max(12),
      periodYear: z.number(),
      rating: z.enum(['excellent', 'good', 'regular', 'needs_improvement']),
      strengths: z.string().optional(),
      improvements: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }
      await db.submitContractReport({
        contract_id: input.contractId,
        submitted_by: ctx.user.id,
        period_month: input.periodMonth,
        period_year: input.periodYear,
        rating: input.rating,
        strengths: input.strengths,
        improvements: input.improvements,
        notes: input.notes,
        created_at: new Date().toISOString(),
      });
      return { success: true };
    }),

  // Payments
  getPaymentStats: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) {
      return { dueThisMonth: 0, overdue: 0, paidLast6Months: 0 };
    }
    return await db.getCompanyPaymentStats(company.id);
  }),

  getPayments: companyProcedure
    .input(z.object({
      filter: z.enum(['overdue', 'upcoming', 'history']).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) return [];
      return await db.getCompanyPayments(company.id, input?.filter);
    }),

  confirmPaymentMade: companyProcedure
    .input(z.object({ paymentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }
      await db.confirmPaymentMade(input.paymentId, company.id);
      return { success: true };
    }),

  // Settings
  getCompanyInfo: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
    }
    return company;
  }),

  getUsers: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) return [];
    return await db.getCompanyUsers(company.id);
  }),

  getNotificationPrefs: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) {
      return {
        email_new_candidates: true,
        email_interview_reminders: true,
        email_payment_reminders: true,
        email_contract_expiring: true,
        whatsapp_interview_reminders: true,
        whatsapp_payment_overdue: true,
        whatsapp_new_candidates: false,
      };
    }
    return await db.getCompanyNotificationPrefs(company.id);
  }),

  updateNotificationPrefs: companyProcedure
    .input(z.object({
      email_new_candidates: z.boolean().optional(),
      email_interview_reminders: z.boolean().optional(),
      email_payment_reminders: z.boolean().optional(),
      email_contract_expiring: z.boolean().optional(),
      whatsapp_interview_reminders: z.boolean().optional(),
      whatsapp_payment_overdue: z.boolean().optional(),
      whatsapp_new_candidates: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }
      await db.updateCompanyNotificationPrefs(company.id, input);
      return { success: true };
    }),
});
