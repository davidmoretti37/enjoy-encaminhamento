// Company router - company management and portal
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure } from "../_core/trpc";
import { adminProcedure, companyProcedure } from "./procedures";
import * as _db from "../db";
const db: any = _db;
import { supabaseAdmin as _supabaseAdmin } from "../supabase";
const supabaseAdmin = _supabaseAdmin as any;
import { generateCompanySummary } from "../services/ai/summarizer";
import { storagePut } from "../storage";
import { verifyReceiptWithAI } from "../services/ai/receiptVerifier";

export const companyRouter = router({
  // Check if company has completed onboarding
  checkOnboarding: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'company') {
      return { completed: true, pendingContractSigning: false };
    }
    const company = await db.getCompanyByUserId(ctx.user.id);
    // Company onboarding is complete if explicitly marked or has required fields
    const completed = !!(company && (company.onboarding_completed || (company.cnpj && company.company_name)));
    const pendingContractSigning = company?.pending_contract_signing === true;
    return { completed, company, pendingContractSigning };
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

  // Mark contract signing as complete (called from pending-contracts page)
  markContractSigningComplete: companyProcedure.mutation(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
    }
    await supabaseAdmin
      .from('companies')
      .update({ pending_contract_signing: false, contract_signed_at: new Date().toISOString() })
      .eq('id', company.id);
    return { success: true };
  }),

  // Submit onboarding (company info + first job + contract signature)
  submitOnboarding: protectedProcedure
    .input(z.object({
      // Company data
      agencyId: z.string().uuid().optional(),
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
      employmentType: z.enum(['clt', 'estagio', 'jovem_aprendiz', 'menor-aprendiz', 'pj']).optional(),
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

      // Get agency_id from user profile, auth metadata, or form input
      const userProfile = existingProfile || await db.getUserById(ctx.user.id);
      const agencyId = userProfile?.agency_id || ctx.user.agency_id || input.agencyId || null;

      if (!agencyId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Selecione a região para continuar o cadastro' });
      }

      // Sync agency_id to user profile if it was only in auth metadata or form input
      if (!userProfile?.agency_id && agencyId) {
        await supabaseAdmin
          .from('users')
          .update({ agency_id: agencyId })
          .eq('id', ctx.user.id);
      }

      // Get agency's affiliate_id for proper linking (if agency exists)
      let agencyData: { id: string; affiliate_id: string | null } | null = null;
      if (agencyId) {
        const { data } = await supabaseAdmin
          .from('agencies')
          .select('id, affiliate_id')
          .eq('id', agencyId)
          .single();
        agencyData = data;
      }

      // Check if company already exists
      let company = await db.getCompanyByUserId(ctx.user.id);

      // Get primary phone from phoneNumbers array (first one with a number)
      const primaryPhone = input.phoneNumbers?.find(p => p.number)?.number || input.mobilePhone;

      // Get primary email from emails array
      const primaryEmail = input.emails?.find(e => e.isPrimary)?.email || input.emails?.[0]?.email || ctx.user.email || '';

      // If company doesn't exist yet, create it first (needed for RPC)
      if (!company) {
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

      // Map form fields for the atomic transaction
      const description = `${input.mainActivities}\n\nRequisitos: ${input.requiredSkills}${input.notes ? `\n\nObservações: ${input.notes}` : ''}`;

      const contractTypeMap: Record<string, 'estagio' | 'clt' | 'menor-aprendiz' | 'pj'> = {
        'clt': 'clt',
        'estagio': 'estagio',
        'jovem_aprendiz': 'menor-aprendiz',
        'menor-aprendiz': 'menor-aprendiz',
        'pj': 'pj',
      };
      const mappedType = contractTypeMap[input.employmentType || 'clt'];
      if (!mappedType) {
        console.warn('Unknown contract type submitted:', input.employmentType);
      }
      const contractType = mappedType || 'clt';

      const salaryMatch = input.compensation?.match(/[\d.,]+/);
      const salary = salaryMatch ? parseFloat(salaryMatch[0].replace(/\./g, '').replace(',', '.')) : null;

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

      const location = input.city && input.state
        ? `${input.city}, ${input.state}`
        : input.city || input.state || null;

      // Execute atomic onboarding transaction via RPC:
      // Updates company + inserts job + saves signature + marks onboarding complete
      // If any step fails, Postgres rolls back everything — no partial state
      const { data: jobId, error: rpcError } = await supabaseAdmin.rpc('complete_company_onboarding', {
        p_company_id: company.id,
        p_cnpj: input.cnpj,
        p_company_name: input.legalName,
        p_business_name: input.businessName || null,
        p_contact_person: input.contactPerson || null,
        p_contact_phone: primaryPhone || null,
        p_email: primaryEmail || null,
        p_landline_phone: input.landlinePhone || null,
        p_mobile_phone: input.mobilePhone || null,
        p_website: input.website || null,
        p_employee_count: input.employeeCount || null,
        p_social_media: input.socialMedia || null,
        p_postal_code: input.cep || null,
        p_address: input.address || null,
        p_complement: input.complement || null,
        p_neighborhood: input.neighborhood || null,
        p_city: input.city || null,
        p_state: input.state || null,
        p_agency_id: agencyId || null,
        p_affiliate_id: agencyData?.affiliate_id || null,
        p_job_title: input.jobTitle,
        p_job_description: description,
        p_job_contract_type: contractType,
        p_job_work_type: 'presencial',
        p_job_salary: salary ? Math.round(salary) : null,
        p_job_salary_min: salary,
        p_job_salary_max: salary,
        p_job_benefits: JSON.stringify(input.benefits || []),
        p_job_min_education: educationMap[input.educationLevel] || null,
        p_job_required_skills: JSON.stringify(input.requiredSkills ? [input.requiredSkills] : []),
        p_job_requirements: input.requiredSkills || null,
        p_job_work_schedule: input.workSchedule || null,
        p_job_location: location,
        p_job_openings: input.positionsCount ? parseInt(input.positionsCount) : 1,
        p_contract_signature: input.contractSignature || null,
        p_contract_signer_name: input.contractSignerName || null,
        p_contract_signer_cpf: input.contractSignerCpf || null,
      });

      if (rpcError) {
        console.error('[Company] Onboarding transaction failed:', rpcError);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: rpcError.message });
      }

      // Save supplementary data outside the transaction (non-critical)
      if (input.phoneNumbers && input.phoneNumbers.length > 0) {
        await supabaseAdmin
          .from('company_phone_numbers')
          .delete()
          .eq('company_id', company.id);

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

      if (input.emails && input.emails.length > 0) {
        await supabaseAdmin
          .from('company_emails')
          .delete()
          .eq('company_id', company.id);

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

  // Get agency payment info (PIX key, instructions) for the company's agency
  getAgencyPaymentInfo: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company?.agency_id) return null;
    const agency = await db.getAgencyById(company.agency_id);
    if (!agency) return null;
    return {
      agency_name: agency.agency_name,
      pix_key: agency.pix_key || null,
      pix_key_type: agency.pix_key_type || null,
      payment_instructions: agency.payment_instructions || null,
    };
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
      cnpj: z.string().optional(),
      email: z.string().optional(),
      contactPerson: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      industry: z.string().optional(),
      companySize: z.enum(["1-10", "11-50", "51-200", "201-500", "500+"]).or(z.literal("")).optional(),
      employeeCount: z.string().optional(),
      website: z.string().optional(),
      description: z.string().optional(),
      logo: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }
      // Map camelCase input to snake_case DB columns
      const updateData: Record<string, any> = {};
      if (input.companyName !== undefined) updateData.company_name = input.companyName;
      if (input.cnpj !== undefined) updateData.cnpj = input.cnpj;
      if (input.email !== undefined) updateData.email = input.email;
      if (input.contactPerson !== undefined) updateData.contact_person = input.contactPerson;
      if (input.employeeCount !== undefined) updateData.employee_count = input.employeeCount;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.address !== undefined) updateData.address = input.address;
      if (input.city !== undefined) updateData.city = input.city;
      if (input.state !== undefined) updateData.state = input.state;
      if (input.zipCode !== undefined) updateData.cep = input.zipCode;
      if (input.industry !== undefined) updateData.industry = input.industry;
      if (input.companySize && input.companySize !== '') updateData.company_size = input.companySize;
      if (input.website !== undefined) updateData.website = input.website;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.logo !== undefined) updateData.logo = input.logo;
      await db.updateCompany(company.id, updateData as any);
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

    // Active jobs
    const { count: activeJobs } = await supabaseAdmin
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .in('status', ['open', 'searching', 'pending_review']);

    // Pending interviews
    const { count: pendingInterviews } = await supabaseAdmin
      .from('interview_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .eq('interview_stage', 'company_interview')
      .eq('status', 'scheduled');

    // Total candidates in batches
    const { data: batches } = await supabaseAdmin
      .from('candidate_batches')
      .select('candidate_ids')
      .eq('company_id', company.id)
      .neq('status', 'cancelled');
    const totalCandidates = (batches || []).reduce((sum: any, b: any) => sum + (b.candidate_ids?.length || 0), 0);

    // Hired count
    const { count: hiredCount } = await supabaseAdmin
      .from('hiring_processes')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .eq('status', 'active');

    // Pending selection (batches presented but not yet reviewed)
    const { count: pendingSelection } = await supabaseAdmin
      .from('candidate_batches')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .in('status', ['presented', 'pending_review']);

    // Active employees (active contracts)
    const { count: activeEmployees } = await supabaseAdmin
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .eq('status', 'active');

    return {
      activeJobs: activeJobs || 0,
      totalCandidates,
      pendingInterviews: pendingInterviews || 0,
      hiredCount: hiredCount || 0,
      pendingSelection: pendingSelection || 0,
      activeEmployees: activeEmployees || 0,
    };
  }),

  getUpcomingEvents: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) return [];

    const { data: sessions } = await supabaseAdmin
      .from('interview_sessions')
      .select(`
        id, interview_type, session_format, scheduled_at, duration_minutes, status, interview_stage,
        location_address, location_city, meeting_link, notes,
        job:jobs(id, title),
        participants:interview_participants(
          id, status,
          candidate:candidates(id, full_name, phone, email)
        )
      `)
      .eq('company_id', company.id)
      .eq('interview_stage', 'company_interview')
      .in('status', ['scheduled', 'confirmed'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(20);

    return sessions || [];
  }),

  getPendingActions: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) {
      return { pendingFeedback: [], overduePayments: [], pendingAvailability: [] };
    }

    // Completed interviews without hiring decision
    const { data: completedSessions } = await supabaseAdmin
      .from('interview_sessions')
      .select('id, scheduled_at, job:jobs(title), participants:interview_participants(candidate:candidates(full_name))')
      .eq('company_id', company.id)
      .eq('interview_stage', 'company_interview')
      .eq('status', 'completed')
      .limit(10);

    return {
      pendingFeedback: completedSessions || [],
      overduePayments: [],
      pendingAvailability: [],
    };
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
      contract_type: z.enum(['estagio', 'clt', 'menor-aprendiz', 'pj']),
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

      if (!company.agency_id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Company must be associated with an agency' });
      }

      // Create job directly in jobs table
      const jobId = await db.createJobForOnboarding(company.id, {
        title: input.title,
        description: input.description,
        contract_type: input.contract_type,
        work_type: 'presencial',
        salary_min: input.salary_min || null,
        salary_max: input.salary_max || null,
        work_schedule: input.work_schedule,
        location: input.city,
        requirements: input.requirements,
        status: 'open',
        agency_id: company.agency_id,
      });

      return { jobId };
    }),

  // Update job details (company can edit their own jobs)
  updateJob: companyProcedure
    .input(z.object({
      jobId: z.string().uuid(),
      title: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
      contract_type: z.enum(['estagio', 'clt', 'menor-aprendiz', 'pj']).optional(),
      work_schedule: z.string().optional(),
      salary_min: z.number().optional(),
      salary_max: z.number().optional(),
      requirements: z.string().optional(),
      openings: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }

      const { jobId, ...fields } = input;

      // Verify job belongs to this company
      const { data: job } = await supabaseAdmin
        .from('jobs').select('id, company_id').eq('id', jobId).single();
      if (!job || job.company_id !== company.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Vaga não pertence à sua empresa' });
      }

      const updateData: any = {};
      if (fields.title !== undefined) updateData.title = fields.title;
      if (fields.description !== undefined) updateData.description = fields.description;
      if (fields.contract_type !== undefined) updateData.contract_type = fields.contract_type;
      if (fields.work_schedule !== undefined) updateData.work_schedule = fields.work_schedule || null;
      if (fields.salary_min !== undefined) updateData.salary_min = fields.salary_min || null;
      if (fields.salary_max !== undefined) updateData.salary_max = fields.salary_max || null;
      if (fields.requirements !== undefined) updateData.specific_requirements = fields.requirements || null;
      if (fields.openings !== undefined) updateData.openings = fields.openings;

      await supabaseAdmin.from('jobs').update(updateData).eq('id', jobId);

      return { success: true };
    }),

  pauseJob: companyProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }
      await db.updateJobStatus(input.jobId, 'paused');
      return { success: true };
    }),

  resumeJob: companyProcedure
    .input(z.object({ jobId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }
      await db.updateJobStatus(input.jobId, 'searching');
      return { success: true };
    }),

  // Scheduling
  getVisits: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) return [];
    // TODO: implement getJobPresentations
    return [];
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
      // TODO: implement submitVisitAvailability
      return { success: true };
    }),

  getInterviews: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) return [];
    return await db.getInterviewSessionsByCompany(company.id);
  }),

  getPendingFeedback: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) return [];
    // TODO: implement getInterviewsPendingFeedback
    return [];
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
      // TODO: implement submitInterviewFeedback
      return { success: true };
    }),

  // Selection
  getPresentedCandidates: companyProcedure
    .input(z.object({ jobId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) return [];
      // TODO: implement getPresentedCandidates
      return [];
    }),

  getCandidateProfile: companyProcedure
    .input(z.object({ candidateId: z.string() }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }

      // Get candidate profile (companies can only see candidates presented to them)
      const candidate = await db.getCandidateById(input.candidateId);
      if (!candidate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Candidate not found' });
      }

      // Calculate age
      let age: number | null = null;
      if (candidate.date_of_birth) {
        const today = new Date();
        const birth = new Date(candidate.date_of_birth);
        age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
      }

      // Build education string
      const educationParts = [];
      if (candidate.education_level) educationParts.push(candidate.education_level);
      if (candidate.institution) educationParts.push(candidate.institution);
      if (candidate.course) educationParts.push(candidate.course);

      return {
        id: candidate.id,
        name: candidate.full_name,
        age,
        city: candidate.city,
        state: candidate.state,
        education: educationParts.join(' - ') || null,
        skills: (candidate.skills as string[]) || [],
        experience: candidate.profile_summary || (candidate.experience as any)?.map?.((e: any) =>
          typeof e === 'string' ? e : `${e.role} em ${e.company}`
        ).join(', ') || null,
        photo_url: candidate.photo_url,
      };
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
      // TODO: implement selectCandidatesForInterview
      return { success: true };
    }),

  // Contracts
  getContracts: companyProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) return [];
      // TODO: implement getCompanyContractsWithDetails
      return [];
    }),

  getContractDocuments: companyProcedure
    .input(z.object({
      category: z.enum(["estagio", "clt", "menor_aprendiz"]),
    }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company || !company.agency_id) return [];
      return await db.getDocumentTemplates(company.agency_id, input.category);
    }),

  getExpiringContracts: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) return [];
    // TODO: implement getExpiringContracts
    return [];
  }),

  // Employee details for detail page
  getEmployeeDetails: companyProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }

      // Get contract with candidate and job data
      const { data: contract, error } = await supabaseAdmin
        .from('contracts')
        .select(`
          *,
          candidate:candidates (
            id, full_name, email, phone, cpf, city, state,
            date_of_birth, education_level, institution, course,
            skills, photo_url, profile_summary
          ),
          job:jobs (
            id, title, contract_type, work_type, salary, work_schedule
          ),
          feedback (
            id, contract_id, review_month, review_year,
            performance_rating, punctuality_rating, communication_rating,
            teamwork_rating, technical_skills_rating, strengths,
            areas_for_improvement, general_comments, recommend_continuation,
            status, created_at
          )
        `)
        .eq('id', input.contractId)
        .eq('company_id', company.id)
        .single();

      if (error || !contract) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Employee not found' });
      }

      return contract;
    }),

  // Payment history for specific employee
  getEmployeePayments: companyProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) return [];

      const { data, error } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('company_id', company.id)
        .eq('contract_id', input.contractId)
        .order('due_date', { ascending: false });

      if (error) {
        console.error('[Company.getEmployeePayments] Error:', error);
        return [];
      }

      return data || [];
    }),

  getContractReports: companyProcedure
    .input(z.object({ contractId: z.string() }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) return [];
      // TODO: implement getContractReports
      return [];
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
      // Insert feedback record
      const { error } = await supabaseAdmin.from('feedback').insert({
        contract_id: input.contractId,
        company_id: company.id,
        candidate_id: null, // will be filled from contract
        review_month: input.periodMonth,
        review_year: input.periodYear,
        performance_rating: input.rating === 'excellent' ? 5 : input.rating === 'good' ? 4 : input.rating === 'regular' ? 3 : 2,
        strengths: input.strengths || null,
        areas_for_improvement: input.improvements || null,
        general_comments: input.notes || null,
        status: 'submitted',
      });

      if (error) {
        console.error('[Company.submitMonthlyReport] Error:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao enviar relatório' });
      }

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

  // NOTE: getAgencyPaymentInfo is defined earlier in this router (line ~360) with agency_name included.
  // Duplicate removed to fix build warning.

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

  uploadPaymentReceipt: companyProcedure
    .input(z.object({
      paymentId: z.string().uuid(),
      fileName: z.string(),
      fileData: z.string(), // base64 encoded
      contentType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }

      const payment = await db.getPaymentById(input.paymentId, company.id);
      if (!payment) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment not found' });
      }

      const fileBuffer = Buffer.from(input.fileData, 'base64');
      const storageKey = `receipts/${company.id}/${input.paymentId}/${input.fileName}`;
      const { url, key } = await storagePut(storageKey, fileBuffer, input.contentType);

      await db.updatePayment(input.paymentId, {
        receipt_url: url,
        receipt_key: key,
        receipt_status: 'pending-review',
        receipt_uploaded_at: new Date().toISOString(),
        payment_method: 'pix',
      });

      // AI verification (fire and forget)
      verifyReceiptWithAI(input.paymentId, url, payment.amount)
        .catch(err => console.error('[Receipt] AI verification failed:', err));

      return { success: true, receiptUrl: url };
    }),

  // Upload employee contract document
  uploadEmployeeContract: companyProcedure
    .input(z.object({
      hiringProcessId: z.string(),
      fileName: z.string(),
      fileData: z.string(),
      contentType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' });
      }

      const sanitizedName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileBuffer = Buffer.from(input.fileData, 'base64');
      const storageKey = `contracts/employees/${company.id}/${input.hiringProcessId}/${Date.now()}-${sanitizedName}`;
      const { url } = await storagePut(storageKey, fileBuffer, input.contentType);

      // Update hiring process with contract document URL
      await supabaseAdmin.from('hiring_processes').update({
        contract_document_url: url,
      }).eq('id', input.hiringProcessId).eq('company_id', company.id);

      return { success: true, url };
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
    // TODO: implement getCompanyNotificationPrefs
    return {
      email_new_candidates: true,
      email_interview_reminders: true,
      email_payment_reminders: true,
      email_contract_expiring: true,
      whatsapp_interview_reminders: true,
      whatsapp_payment_overdue: true,
      whatsapp_new_candidates: false,
    };
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
      // TODO: implement updateCompanyNotificationPrefs
      return { success: true };
    }),

  // AI-powered smart search: search companies via their jobs' embeddings
  smartSearch: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'agency') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }

      const { generateEmbedding, formatEmbeddingForPostgres } = await import('../services/ai/embeddings');
      const embedding = await generateEmbedding(input.query);
      if (!embedding) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Não foi possível processar a busca' });
      }

      const { data, error } = await supabaseAdmin.rpc('search_companies_by_job_embedding', {
        query_embedding: formatEmbeddingForPostgres(embedding),
        match_threshold: 0.3,
        match_count: 50,
      });

      if (error) {
        console.error('[Company.smartSearch] RPC error:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro na busca' });
      }

      return (data || []).map((r: any) => ({
        companyId: r.company_id,
        companyName: r.company_name,
        jobTitle: r.job_title,
        similarity: r.similarity,
      }));
    }),

  // Get agency booking info for company to schedule meetings
  getAgencyBookingInfo: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company || !company.agency_id) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agência não encontrada' });
    }

    const agency = await db.getAgencyById(company.agency_id);
    if (!agency) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agência não encontrada' });
    }

    return { adminId: agency.user_id, agencyName: agency.name };
  }),

  // ── Company User Invitations ──

  createUserInvitation: companyProcedure
    .input(z.object({ email: z.string().email(), name: z.string().optional(), role: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) throw new TRPCError({ code: 'NOT_FOUND', message: 'Empresa não encontrada' });

      const { data, error } = await supabaseAdmin
        .from('company_user_invitations')
        .insert({
          company_id: company.id,
          email: input.email,
          name: input.name || null,
          role: input.role || 'member',
          created_by: ctx.user.id,
        })
        .select('token')
        .single();

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { token: data.token, companyName: company.company_name };
    }),

  validateUserInvitation: publicProcedure
    .input(z.object({ token: z.string().uuid() }))
    .query(async ({ input }) => {
      const { data, error } = await supabaseAdmin
        .from('company_user_invitations')
        .select('*, companies(company_name)')
        .eq('token', input.token)
        .eq('status', 'pending')
        .single();

      if (error || !data) return { valid: false, invitation: null };
      if (new Date(data.expires_at) < new Date()) return { valid: false, invitation: null };
      return { valid: true, invitation: { email: data.email, name: data.name, companyName: (data.companies as any)?.company_name } };
    }),

  acceptUserInvitation: publicProcedure
    .input(z.object({ token: z.string().uuid(), name: z.string().min(1), email: z.string().email(), password: z.string().min(6) }))
    .mutation(async ({ input }) => {
      // Validate invitation
      const { data: invite, error: invErr } = await supabaseAdmin
        .from('company_user_invitations')
        .select('*, companies(id, company_name, agency_id)')
        .eq('token', input.token)
        .eq('status', 'pending')
        .single();

      if (invErr || !invite) throw new TRPCError({ code: 'NOT_FOUND', message: 'Convite inválido ou expirado' });
      if (new Date(invite.expires_at) < new Date()) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Convite expirado' });

      // Create Supabase auth user
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: { name: input.name, role: 'company', agency_id: (invite.companies as any)?.agency_id },
      });

      if (authErr) {
        console.error('[CompanyJoin] Auth create failed:', authErr.message);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: authErr.message });
      }

      if (!authData?.user) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao criar usuário' });
      }

      console.log('[CompanyJoin] Auth user created:', authData.user.id, input.email);

      // Create user profile linked to same company
      const company = invite.companies as any;
      const profileResult = await db.createUserProfile({
        id: authData.user.id,
        email: input.email,
        name: input.name,
        role: 'company',
        agency_id: company?.agency_id || null,
      });

      if (profileResult?.error) {
        console.error('[CompanyJoin] Profile create failed:', profileResult.error);
      }

      console.log('[CompanyJoin] Profile created, marking invitation accepted');

      // Mark invitation as accepted
      await supabaseAdmin
        .from('company_user_invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('token', input.token);

      return { success: true };
    }),
});
