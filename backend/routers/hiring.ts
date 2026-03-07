// @ts-nocheck
// Hiring router - handles the flow from interview to employee
// Different processes for Estágio (4-party signing, recurring) vs CLT (one-time payment)

import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { companyProcedure, candidateProcedure, agencyProcedure } from "./procedures";
import * as db from "../db";
import * as hiringDb from "../db/hiring";
import { supabaseAdmin } from "../supabase";
import { sendEmail } from "./email";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createDocument as createAutentiqueDoc, isAutentiqueConfigured } from "../integrations/autentique";
import { ENV } from "../_core/env";
import { fillDocxTemplate, buildHiringTemplateData, scanPlaceholders, PLACEHOLDER_LABELS } from "../lib/fillDocxTemplate";

// ============================================
// HIRING ROUTER
// ============================================

export const hiringRouter = router({
  // ============================================
  // COMPANY ENDPOINTS
  // ============================================

  /**
   * Get hiring preview before initiating
   * Returns candidate info, calculated fee, and required fields
   */
  getHiringPreview: companyProcedure
    .input(z.object({
      applicationId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      // Get application with related data
      const application = await db.getApplicationById(input.applicationId);
      if (!application) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      }

      // Get job
      const job = await db.getJobById(application.job_id);
      if (!job || job.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      // Get candidate with parent/school info
      const candidate = await db.getCandidateById(application.candidate_id);
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not found" });
      }

      const hiringType = job.contract_type as "estagio" | "clt" | "menor-aprendiz";

      // Check if first intern (for estágio pricing)
      let isFirstIntern = false;
      let calculatedFee = 0;

      if (hiringType === "estagio") {
        const activeEstagios = await hiringDb.countActiveEstagioContracts(company.id);
        isFirstIntern = activeEstagios === 0;
        calculatedFee = hiringDb.calculateEstagioFee(isFirstIntern);
      } else if (hiringType === "clt") {
        // CLT: 50% of salary
        const salary = job.salary || candidate.expected_salary || 0;
        calculatedFee = hiringDb.calculateCLTFee(salary);
      }

      // Check if parent/school info is needed (estágio) and if it's already on profile
      const needsParentInfo = hiringType === "estagio" && !candidate.parent_guardian_email;
      const needsSchoolInfo = hiringType === "estagio" && !candidate.educational_institution_email;

      return {
        application,
        candidate: {
          id: candidate.id,
          fullName: candidate.full_name,
          email: candidate.email,
          phone: candidate.phone,
          cpf: candidate.cpf,
          // Parent info (if exists)
          parentGuardianName: candidate.parent_guardian_name,
          parentGuardianEmail: candidate.parent_guardian_email,
          parentGuardianCpf: candidate.parent_guardian_cpf,
          parentGuardianPhone: candidate.parent_guardian_phone,
          // School info (if exists)
          educationalInstitutionName: candidate.educational_institution_name,
          educationalInstitutionEmail: candidate.educational_institution_email,
          educationalInstitutionContact: candidate.educational_institution_contact,
        },
        job: {
          id: job.id,
          title: job.title,
          contractType: job.contract_type,
          salary: job.salary,
        },
        hiringType,
        isFirstIntern,
        calculatedFee, // In cents
        feeDisplay: hiringType === "estagio"
          ? `R$ ${(calculatedFee / 100).toFixed(2)}/mês`
          : `R$ ${(calculatedFee / 100).toFixed(2)} (único)`,
        needsParentInfo,
        needsSchoolInfo,
        requiresMultipleSignatures: hiringType === "estagio",
      };
    }),

  /**
   * Initiate hiring process
   * Creates hiring_process record and triggers appropriate flow
   */
  initiateHiring: companyProcedure
    .input(z.object({
      applicationId: z.string().uuid(),
      batchId: z.string().uuid().optional(),
      startDate: z.string(), // ISO date string
      monthlySalary: z.number().optional(), // In cents
      // Parent info (for estágio, if not on candidate profile)
      parentInfo: z.object({
        name: z.string(),
        email: z.string().email(),
        cpf: z.string(),
        phone: z.string().optional(),
      }).optional(),
      // School info (for estágio, if not on candidate profile)
      schoolInfo: z.object({
        name: z.string(),
        email: z.string().email(),
        contact: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      // Get application
      const application = await db.getApplicationById(input.applicationId);
      if (!application) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      }

      // Get job
      const job = await db.getJobById(application.job_id);
      if (!job || job.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      // Get candidate
      const candidate = await db.getCandidateById(application.candidate_id);
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not found" });
      }

      // Check if already has a hiring process
      const existingProcess = await hiringDb.getHiringProcessByApplication(input.applicationId);
      if (existingProcess) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Já existe um processo de contratação para esta candidatura",
        });
      }

      const hiringType = job.contract_type as "estagio" | "clt" | "menor-aprendiz";
      const startDate = new Date(input.startDate);

      // Calculate fee
      let isFirstIntern = false;
      let calculatedFee = 0;

      if (hiringType === "estagio") {
        const activeEstagios = await hiringDb.countActiveEstagioContracts(company.id);
        isFirstIntern = activeEstagios === 0;
        calculatedFee = hiringDb.calculateEstagioFee(isFirstIntern);
      } else if (hiringType === "clt") {
        const salary = input.monthlySalary || job.salary || 0;
        calculatedFee = hiringDb.calculateCLTFee(salary);
      }

      // For estágio, end date will be set by agency in configuration step
      // For CLT, no end date (indefinite)
      let endDate: string | undefined;

      // Update candidate with parent/school info if provided
      if (input.parentInfo) {
        await db.updateCandidate(candidate.id, {
          parent_guardian_name: input.parentInfo.name,
          parent_guardian_email: input.parentInfo.email,
          parent_guardian_cpf: input.parentInfo.cpf,
          parent_guardian_phone: input.parentInfo.phone,
        });
      }

      if (input.schoolInfo) {
        await db.updateCandidate(candidate.id, {
          educational_institution_name: input.schoolInfo.name,
          educational_institution_email: input.schoolInfo.email,
          educational_institution_contact: input.schoolInfo.contact,
        });
      }

      // Create hiring process
      // For estágio: status is awaiting_configuration (agency must configure before contracts go out)
      // For CLT: status is pending_signatures (immediate)
      const hiringProcess = await hiringDb.createHiringProcess({
        applicationId: input.applicationId,
        batchId: input.batchId,
        companyId: company.id,
        candidateId: candidate.id,
        jobId: job.id,
        hiringType,
        isFirstIntern,
        calculatedFee,
        startDate: input.startDate,
        endDate,
        monthlySalary: input.monthlySalary,
        status: hiringType === "estagio" ? "awaiting_configuration" : "pending_signatures",
      });

      // Update application status to 'selected'
      await db.updateApplication(input.applicationId, { status: "selected" });

      // Update batch status if provided
      if (input.batchId) {
        await db.updateBatch(input.batchId, { status: "completed" });
      }

      // Get updated candidate info (with parent/school if just added)
      const updatedCandidate = await db.getCandidateById(candidate.id);

      // For estágio: signing invitations and payments are created later in configureAndSendContract
      // For CLT: create invitations and payment immediately
      if (hiringType !== "estagio") {
        // For CLT, create one-time payment
        await db.createPayment({
          company_id: company.id,
          amount: calculatedFee,
          payment_type: "setup-fee",
          due_date: new Date().toISOString(),
          status: "pending",
          notes: `Taxa de encaminhamento CLT - ${candidate.full_name} - ${job.title}`,
        });

        // Create 30-day follow-up
        await hiringDb.createCLTFollowUp(hiringProcess.id, company.id, startDate);
      }

      // Notify candidate
      if (candidate.user_id) {
        await db.createNotification({
          user_id: candidate.user_id,
          title: "Parabéns! Você foi selecionado!",
          message: `Você foi selecionado para a vaga "${job.title}" na empresa ${company.company_name}. ${hiringType === "estagio" ? "Aguarde a configuração do contrato pela agência." : "Aguarde as instruções da empresa."}`,
          type: "success",
          related_to_type: "hiring",
          related_to_id: hiringProcess.id,
        });
      }

      // Send email to candidate
      if (candidate.email) {
        await sendCandidateSelectedEmail(
          candidate.email,
          candidate.full_name || "Candidato",
          company.company_name || "Empresa",
          job.title,
          startDate,
          hiringType
        );
      }

      return {
        success: true,
        hiringProcessId: hiringProcess.id,
        hiringType,
        status: hiringProcess.status,
        requiresCompanySignature: hiringType === "estagio",
      };
    }),

  /**
   * Agency configures contract terms and sends for signing (estágio only)
   */
  configureAndSendContract: agencyProcedure
    .input(z.object({
      hiringProcessId: z.string().uuid(),
      durationMonths: z.number().int().min(1).max(36),
      monthlyFee: z.number().int().min(0), // In cents
      paymentDay: z.number().int().min(1).max(28),
      monthlySalary: z.number().int().min(0).optional(), // In cents
      selectedTemplateIds: z.array(z.string().uuid()).min(1), // Agency selects which documents to send
      manualFields: z.record(z.string()).optional(), // Manual overrides for template placeholders
    }))
    .mutation(async ({ input }) => {
      const process = await hiringDb.getHiringProcessById(input.hiringProcessId);
      if (!process) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Hiring process not found" });
      }
      if (process.status !== "awaiting_configuration") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This contract has already been configured" });
      }

      // Calculate end date from start date + duration
      const startDate = new Date(process.start_date);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + input.durationMonths);
      const endDateStr = endDate.toISOString().split("T")[0];

      // Update hiring process with configuration
      await supabaseAdmin
        .from("hiring_processes")
        .update({
          calculated_fee: input.monthlyFee,
          payment_day: input.paymentDay,
          contract_duration_months: input.durationMonths,
          end_date: endDateStr,
          monthly_salary: input.monthlySalary || process.monthly_salary,
          selected_template_ids: input.selectedTemplateIds,
          status: "pending_signatures",
        })
        .eq("id", input.hiringProcessId);

      // Get candidate info for signing invitations
      const candidate = await db.getCandidateById(process.candidate_id);
      const company = await db.getCompanyById(process.company_id);

      // Create signing invitations
      if (candidate?.email) {
        await hiringDb.createSigningInvitation({
          hiringProcessId: process.id,
          signerRole: "candidate",
          signerName: candidate.full_name || "Candidato",
          signerEmail: candidate.email,
          signerPhone: candidate.phone,
        });
      }

      // Parent invitation
      const parentEmail = candidate?.parent_guardian_email;
      const parentName = candidate?.parent_guardian_name;
      if (parentEmail && parentName) {
        await hiringDb.createSigningInvitation({
          hiringProcessId: process.id,
          signerRole: "parent_guardian",
          signerName: parentName,
          signerEmail: parentEmail,
          signerPhone: candidate?.parent_guardian_phone,
        });
      }

      // School invitation
      const schoolEmail = candidate?.educational_institution_email;
      const schoolName = candidate?.educational_institution_name;
      if (schoolEmail && schoolName) {
        await hiringDb.createSigningInvitation({
          hiringProcessId: process.id,
          signerRole: "educational_institution",
          signerName: schoolName,
          signerEmail: schoolEmail,
        });
      }

      // Get invitations and job info
      const invitations = await hiringDb.getSigningInvitationsByHiringProcess(process.id);
      const job = await db.getJobById(process.job_id);

      // Upload templates to Autentique if configured
      if (isAutentiqueConfigured()) {
        try {
          const agencyId = company?.agency_id;
          if (agencyId) {
            // Use only the templates selected by the agency
            const templates = await db.getDocumentTemplatesByIds(input.selectedTemplateIds);

            // Build signers list (all parties)
            const autentiqueSigners: Array<{ email: string; name: string; action: "SIGN"; role: string }> = [];

            // Company signer
            if (company?.email) {
              autentiqueSigners.push({
                email: company.email,
                name: company.company_name || "Empresa",
                action: "SIGN",
                role: "company",
              });
            }

            // Candidate signer
            if (candidate?.email) {
              autentiqueSigners.push({
                email: candidate.email,
                name: candidate.full_name || "Candidato",
                action: "SIGN",
                role: "candidate",
              });
            }

            // Parent signer (estágio)
            if (candidate?.parent_guardian_email) {
              autentiqueSigners.push({
                email: candidate.parent_guardian_email,
                name: candidate.parent_guardian_name || "Responsável",
                action: "SIGN",
                role: "parent_guardian",
              });
            }

            // School signer (estágio)
            if (candidate?.educational_institution_email) {
              autentiqueSigners.push({
                email: candidate.educational_institution_email,
                name: candidate.educational_institution_name || "Instituição",
                action: "SIGN",
                role: "educational_institution",
              });
            }

            // Build template data for DOCX filling
            const agency = company?.agency_id ? await db.getAgencyById(company.agency_id) : null;
            const templateData = buildHiringTemplateData({
              company: company ? {
                company_name: company.company_name,
                business_name: company.business_name,
                cnpj: company.cnpj,
                contact_name: company.contact_person,
                contact_cpf: company.contact_cpf,
                phone: company.phone,
                landline_phone: company.landline_phone,
                email: company.email,
                company_email: company.company_email,
                website: company.website,
                employee_count: company.employee_count,
                cep: company.cep,
                address: company.address,
                complement: company.complement,
                neighborhood: company.neighborhood,
                city: company.city,
                state: company.state,
              } : undefined,
              candidate: candidate ? {
                full_name: candidate.full_name,
                cpf: candidate.cpf,
                rg: candidate.rg,
                email: candidate.email,
                phone: candidate.phone,
                date_of_birth: candidate.date_of_birth,
                address: candidate.address,
                city: candidate.city,
                state: candidate.state,
                zip_code: candidate.zip_code,
                education_level: candidate.education_level,
                institution: candidate.institution,
                course: candidate.course,
                parent_guardian_name: candidate.parent_guardian_name,
                parent_guardian_cpf: candidate.parent_guardian_cpf,
                parent_guardian_email: candidate.parent_guardian_email,
                parent_guardian_phone: candidate.parent_guardian_phone,
                educational_institution_name: candidate.educational_institution_name,
                educational_institution_email: candidate.educational_institution_email,
                educational_institution_contact: candidate.educational_institution_contact,
              } : undefined,
              job: job ? {
                title: job.title,
                salary: job.salary,
                contract_type: job.contract_type,
              } : undefined,
              agency: agency ? {
                name: agency.name,
                city: agency.city,
              } : undefined,
              hiring: {
                start_date: process.start_date,
                end_date: endDateStr,
                duration_months: input.durationMonths,
                monthly_salary: input.monthlySalary || process.monthly_salary,
                monthly_fee: input.monthlyFee,
                payment_day: input.paymentDay,
                hiring_type: process.hiring_type,
              },
              manualFields: input.manualFields,
            });

            const autentiqueDocIds: string[] = [];

            for (const template of templates) {
              // Download file from storage
              const fileResponse = await fetch(template.file_url);
              const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());

              // Check if DOCX - if so, fill placeholders and convert to PDF
              const isDocx = template.file_url?.endsWith(".docx") || template.name?.endsWith(".docx");
              let pdfBuffer: Buffer;

              if (isDocx) {
                console.log(`[Hiring] Filling DOCX template: ${template.name}`);
                pdfBuffer = await fillDocxTemplate(fileBuffer, templateData);
                console.log(`[Hiring] Template filled and converted to PDF: ${pdfBuffer.length} bytes`);
              } else {
                // Already a PDF, use as-is
                pdfBuffer = fileBuffer;
              }

              // Upload to Autentique with all signers
              const result = await createAutentiqueDoc(
                template.name,
                pdfBuffer,
                autentiqueSigners.map((s) => ({ email: s.email, name: s.name, action: s.action })),
                {
                  message: `Contrato de ${process.hiring_type} - ${candidate?.full_name} - ${company?.company_name}`,
                  reminder: "WEEKLY",
                  sortable: true,
                }
              );

              autentiqueDocIds.push(result.documentId);

              // Track in our DB
              await db.createAutentiqueDocument({
                autentiqueDocumentId: result.documentId,
                documentName: template.name,
                contextType: "hiring_contract",
                contextId: process.id,
                templateId: template.id,
                signers: result.signers.map((apiSigner) => {
                  // Match API signer to our role by email
                  const ourSigner = autentiqueSigners.find((s) => s.email === apiSigner.email);
                  return {
                    role: ourSigner?.role || "unknown",
                    email: apiSigner.email,
                    name: apiSigner.name,
                    autentiqueSignerId: apiSigner.public_id,
                    signUrl: apiSigner.signUrl,
                  };
                }),
              });

              // Update signing_invitations with Autentique signer IDs and URLs
              for (const apiSigner of result.signers) {
                const matchingInvitation = invitations.find(
                  (inv: any) => inv.signer_email === apiSigner.email
                );
                if (matchingInvitation) {
                  await supabaseAdmin
                    .from("signing_invitations")
                    .update({
                      autentique_document_id: result.documentId,
                      autentique_signer_id: apiSigner.public_id,
                      autentique_sign_url: apiSigner.signUrl,
                    })
                    .eq("id", matchingInvitation.id);
                }
              }
            }

            // Store Autentique doc IDs on hiring process
            if (autentiqueDocIds.length > 0) {
              await supabaseAdmin
                .from("hiring_processes")
                .update({ autentique_document_ids: autentiqueDocIds })
                .eq("id", process.id);
            }
          }
        } catch (autentiqueError: any) {
          console.error("[Hiring] Autentique upload failed:", autentiqueError.message);
          // Fall through to legacy email flow
        }
      }

      // Send invitation emails (with Autentique URLs if available)
      // Refresh invitations to get updated autentique_sign_url
      const updatedInvitations = await hiringDb.getSigningInvitationsByHiringProcess(process.id);

      for (const inv of updatedInvitations) {
        if (!inv.email_sent_at) {
          try {
            await sendSigningInvitationEmail(
              inv,
              inv.signer_name,
              company?.company_name || "Empresa",
              job?.title || "Vaga",
              startDate,
              candidate?.full_name
            );
            await hiringDb.markInvitationEmailSent(inv.id);
          } catch (err) {
            console.error(`[Hiring] Failed to send invitation email to ${inv.signer_email}:`, err);
          }
        }
      }

      // Notify company
      if (company?.user_id) {
        await db.createNotification({
          user_id: company.user_id,
          title: "Contrato configurado e enviado",
          message: `O contrato de estágio para ${candidate?.full_name} foi configurado. Aguardando assinaturas.`,
          type: "info",
          related_to_type: "hiring",
          related_to_id: process.id,
        });
      }

      return { success: true };
    }),

  /**
   * Get hiring process status
   */
  getHiringStatus: companyProcedure
    .input(z.object({
      hiringProcessId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      const process = await hiringDb.getHiringProcessById(input.hiringProcessId);
      if (!process || process.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const signatureStatus = await hiringDb.checkAllSignaturesComplete(input.hiringProcessId);

      return {
        ...process,
        signatureStatus,
      };
    }),

  /**
   * Get all hiring processes for company
   */
  getCompanyHiringProcesses: companyProcedure
    .input(z.object({
      status: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) return [];

      return await hiringDb.getHiringProcessesByCompany(company.id, input?.status);
    }),

  /**
   * Get selected contract documents for a hiring process (company-facing)
   */
  getHiringProcessDocuments: companyProcedure
    .input(z.object({
      hiringProcessId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) return [];

      const process = await hiringDb.getHiringProcessById(input.hiringProcessId);
      if (!process || process.company_id !== company.id) return [];
      if (!process.selected_template_ids?.length) return [];

      return await db.getDocumentTemplatesByIds(process.selected_template_ids);
    }),

  /**
   * Company signs the contract
   */
  signAsCompany: companyProcedure
    .input(z.object({
      hiringProcessId: z.string().uuid(),
      signerName: z.string().min(1),
      signerCpf: z.string().min(11),
      signature: z.string().min(1), // Base64 signature image
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      const process = await hiringDb.getHiringProcessById(input.hiringProcessId);
      if (!process || process.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      if (process.company_signed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Company has already signed",
        });
      }

      await hiringDb.recordCompanySignature(
        input.hiringProcessId,
        input.signerName,
        input.signerCpf,
        input.signature
      );

      // Check if all signatures complete
      const signatureStatus = await hiringDb.checkAllSignaturesComplete(input.hiringProcessId);

      // If all signed, send completion notifications
      if (signatureStatus.complete && !signatureStatus.wasAlreadyComplete) {
        await sendSignaturesCompleteNotifications(
          input.hiringProcessId,
          process,
          company
        );
      }

      // If estágio and all signed, create follow-ups and generate payments
      if (signatureStatus.complete && process.hiring_type === "estagio") {
        await handleEstagioSignaturesComplete(input.hiringProcessId, process, company);
      }

      return {
        success: true,
        signatureStatus,
      };
    }),

  /**
   * Confirm company signed via Autentique (called when DocumentSigningFlow reports all docs signed)
   */
  confirmCompanyAutentiqueSign: companyProcedure
    .input(z.object({
      hiringProcessId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      const process = await hiringDb.getHiringProcessById(input.hiringProcessId);
      if (!process || process.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      if (process.company_signed) {
        return { success: true, alreadySigned: true };
      }

      // Verify on Autentique that the company actually signed
      const { data: autentiqueDocs } = await supabaseAdmin
        .from("autentique_documents")
        .select("*")
        .eq("context_type", "hiring_contract")
        .eq("context_id", input.hiringProcessId);

      if (autentiqueDocs && autentiqueDocs.length > 0) {
        // Check that the company signer has signed all documents
        const companyEmail = company.email;
        const allSignedByCompany = autentiqueDocs.every((doc: any) => {
          const companySigner = doc.signers?.find((s: any) => s.email === companyEmail);
          return companySigner?.signed_at != null;
        });

        if (!allSignedByCompany) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A empresa ainda não assinou todos os documentos na Autentique",
          });
        }
      }

      // Record company signature
      await supabaseAdmin
        .from("hiring_processes")
        .update({
          company_signed: true,
          company_signed_at: new Date().toISOString(),
        })
        .eq("id", input.hiringProcessId);

      // Check if all signatures complete
      const signatureStatus = await hiringDb.checkAllSignaturesComplete(input.hiringProcessId);

      if (signatureStatus.complete && !signatureStatus.wasAlreadyComplete) {
        await sendSignaturesCompleteNotifications(input.hiringProcessId, process, company);
      }

      // If estágio and all signed, create follow-ups and generate payments
      if (signatureStatus.complete && process.hiring_type === "estagio") {
        await handleEstagioSignaturesComplete(input.hiringProcessId, process, company);
      }

      return { success: true, signatureStatus };
    }),

  /**
   * Resend signing invitation email
   */
  resendSigningInvitation: companyProcedure
    .input(z.object({
      invitationId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      // Get invitation with hiring process
      const invitation = await hiringDb.getSigningInvitationById(input.invitationId);

      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
      }

      if (invitation.hiring_process?.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      if (invitation.signed_at) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This invitation has already been signed",
        });
      }

      // Resend email
      await sendSigningInvitationEmail(
        invitation,
        invitation.signer_name,
        company.company_name || "Empresa",
        invitation.hiring_process?.job?.title || "Vaga",
        new Date(invitation.hiring_process?.start_date),
        invitation.hiring_process?.candidate?.full_name
      );

      await hiringDb.markInvitationEmailSent(input.invitationId);

      return { success: true };
    }),

  /**
   * Company adds a missing signer (parent/school) to an existing hiring process.
   * Creates signing_invitation + adds signer to Autentique documents.
   */
  addMissingSigner: companyProcedure
    .input(z.object({
      hiringProcessId: z.string().uuid(),
      signerRole: z.enum(["parent_guardian", "educational_institution"]),
      signerName: z.string().min(1),
      signerEmail: z.string().email(),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      const process = await hiringDb.getHiringProcessById(input.hiringProcessId);
      if (!process || process.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      // Check no existing invitation for this role
      const existingInvitations = await hiringDb.getSigningInvitationsByHiringProcess(input.hiringProcessId);
      const alreadyExists = existingInvitations.find(
        (inv: any) => inv.signer_role === input.signerRole && !inv.signed_at
      );
      if (alreadyExists) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Já existe um convite de assinatura para este papel",
        });
      }

      // Update candidate profile with the new contact info
      const candidate = await db.getCandidateById(process.candidate_id);
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not found" });
      }

      if (input.signerRole === "parent_guardian") {
        await db.updateCandidate(candidate.id, {
          parent_guardian_name: input.signerName,
          parent_guardian_email: input.signerEmail,
        });
      } else {
        await db.updateCandidate(candidate.id, {
          educational_institution_name: input.signerName,
          educational_institution_email: input.signerEmail,
        });
      }

      // Create signing invitation
      const invitation = await hiringDb.createSigningInvitation({
        hiringProcessId: input.hiringProcessId,
        signerRole: input.signerRole,
        signerName: input.signerName,
        signerEmail: input.signerEmail,
      });

      // Add signer to existing Autentique documents
      let autentiqueSignUrl: string | null = null;
      if (isAutentiqueConfigured() && process.autentique_document_ids?.length) {
        try {
          const { addSignerToDocument } = await import("../integrations/autentique");

          for (const docId of process.autentique_document_ids) {
            const result = await addSignerToDocument(docId, {
              name: input.signerName,
              action: "SIGN",
            });

            if (!autentiqueSignUrl && result.signUrl) {
              autentiqueSignUrl = result.signUrl;
            }

            // Update autentique_documents tracking record
            const autentiqueDoc = await db.getAutentiqueDocumentByAutentiqueId(docId);
            if (autentiqueDoc) {
              const updatedSigners = [
                ...(autentiqueDoc.signers as any[]),
                {
                  role: input.signerRole,
                  email: input.signerEmail,
                  name: input.signerName,
                  autentique_signer_id: result.signerId,
                  sign_url: result.signUrl,
                  signed_at: null,
                },
              ];
              await supabaseAdmin
                .from("autentique_documents")
                .update({ signers: updatedSigners })
                .eq("autentique_document_id", docId);
            }
          }

          // Update the signing invitation with Autentique info
          if (autentiqueSignUrl) {
            await supabaseAdmin
              .from("signing_invitations")
              .update({
                autentique_sign_url: autentiqueSignUrl,
                autentique_document_id: process.autentique_document_ids[0],
              })
              .eq("id", invitation.id);
          }
        } catch (err: any) {
          console.error("[Hiring] Failed to add signer to Autentique:", err.message);
          // Fall through - invitation still works via fallback flow
        }
      }

      // Send invitation email
      const job = await db.getJobById(process.job_id);
      try {
        const updatedInvitation = await hiringDb.getSigningInvitationById(invitation.id);
        await sendSigningInvitationEmail(
          updatedInvitation || invitation,
          input.signerName,
          company.company_name || "Empresa",
          job?.title || "Vaga",
          new Date(process.start_date),
          candidate.full_name
        );
        await hiringDb.markInvitationEmailSent(invitation.id);
      } catch (err) {
        console.error(`[Hiring] Failed to send invitation email to ${input.signerEmail}:`, err);
      }

      return {
        success: true,
        invitationId: invitation.id,
        token: invitation.token,
        autentiqueSignUrl,
      };
    }),

  /**
   * Confirm CLT payment and activate hiring process
   */
  confirmCLTPayment: companyProcedure
    .input(z.object({
      hiringProcessId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      const process = await hiringDb.getHiringProcessById(input.hiringProcessId);
      if (!process || process.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      if (process.status !== "pending_payment" && process.status !== "pending_signatures") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Processo não está aguardando pagamento",
        });
      }

      // Update hiring process to active
      await hiringDb.updateHiringProcess(input.hiringProcessId, { status: "active" });

      // Create 30-day follow-up if not already created
      const startDate = new Date(process.start_date);
      try {
        await hiringDb.createCLTFollowUp(input.hiringProcessId, company.id, startDate);
      } catch (e) {
        // Follow-up may already exist from initiateHiring
      }

      // Notify candidate
      if (process.candidate?.user_id) {
        await db.createNotification({
          user_id: process.candidate.user_id,
          title: "Contratação confirmada!",
          message: `Sua contratação para a vaga "${process.job?.title}" foi confirmada. Boa sorte!`,
          type: "success",
          related_to_type: "hiring",
          related_to_id: input.hiringProcessId,
        });
      }

      return { success: true };
    }),

  /**
   * Get upcoming follow-ups for company
   */
  getUpcomingFollowUps: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) return [];

    return await hiringDb.getUpcomingFollowUps(company.id);
  }),

  // ============================================
  // AGENCY ENDPOINTS
  // ============================================

  /**
   * Get hiring processes for a job (agency visibility into contract status)
   */
  getHiringProcessesByJobId: agencyProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ input }) => {
      return await hiringDb.getHiringProcessesByJobId(input.jobId);
    }),

  /**
   * Send signing invitation emails for a hiring process (agency triggers manually)
   */
  sendSigningInvitations: agencyProcedure
    .input(z.object({
      hiringProcessId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const unsent = await hiringDb.getUnsentInvitations(input.hiringProcessId);

      if (unsent.length === 0) {
        return { sent: 0 };
      }

      let sent = 0;
      for (const invitation of unsent) {
        const hp = invitation.hiring_process;
        if (!hp) continue;

        const candidateName = invitation.signer_role !== "candidate"
          ? hp.candidate?.full_name
          : undefined;

        await sendSigningInvitationEmail(
          invitation,
          invitation.signer_name,
          hp.company?.company_name || "Empresa",
          hp.job?.title || "Vaga",
          new Date(hp.start_date),
          candidateName
        );
        sent++;
      }

      return { sent };
    }),

  /**
   * Create a signing invitation for a specific role (agency adds missing parent/school)
   */
  createSigningInvitationForRole: agencyProcedure
    .input(z.object({
      hiringProcessId: z.string().uuid(),
      signerRole: z.enum(["parent_guardian", "educational_institution"]),
      signerName: z.string().min(1),
      signerEmail: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      // Check no existing invitation for this role
      const existing = await hiringDb.getSigningInvitationsByHiringProcess(input.hiringProcessId);
      const alreadyExists = existing.find((inv: any) => inv.signer_role === input.signerRole);
      if (alreadyExists) {
        return { token: alreadyExists.token, alreadyExisted: true };
      }

      const invitation = await hiringDb.createSigningInvitation({
        hiringProcessId: input.hiringProcessId,
        signerRole: input.signerRole,
        signerName: input.signerName,
        signerEmail: input.signerEmail,
      });

      return { token: invitation.token, alreadyExisted: false };
    }),

  /**
   * Scan selected DOCX templates for placeholders and return auto-filled vs missing fields.
   * Used by the agency review screen before sending contracts.
   */
  getTemplatePlaceholders: agencyProcedure
    .input(z.object({
      hiringProcessId: z.string().uuid(),
      selectedTemplateIds: z.array(z.string().uuid()).min(1),
    }))
    .mutation(async ({ input }) => {
      const process = await hiringDb.getHiringProcessById(input.hiringProcessId);
      if (!process) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Hiring process not found" });
      }

      const candidate = await db.getCandidateById(process.candidate_id);
      const company = await db.getCompanyById(process.company_id);
      const job = await db.getJobById(process.job_id);
      const agency = company?.agency_id ? await db.getAgencyById(company.agency_id) : null;

      // Build auto-filled data from available records
      const autoData = buildHiringTemplateData({
        company: company ? {
          company_name: company.company_name,
          business_name: company.business_name,
          cnpj: company.cnpj,
          contact_name: company.contact_person,
          contact_cpf: company.contact_cpf,
          phone: company.phone,
          landline_phone: company.landline_phone,
          email: company.email,
          company_email: company.company_email,
          website: company.website,
          employee_count: company.employee_count,
          cep: company.cep,
          address: company.address,
          complement: company.complement,
          neighborhood: company.neighborhood,
          city: company.city,
          state: company.state,
        } : undefined,
        candidate: candidate ? {
          full_name: candidate.full_name,
          cpf: candidate.cpf,
          rg: candidate.rg,
          email: candidate.email,
          phone: candidate.phone,
          date_of_birth: candidate.date_of_birth,
          address: candidate.address,
          city: candidate.city,
          state: candidate.state,
          zip_code: candidate.zip_code,
          education_level: candidate.education_level,
          institution: candidate.institution,
          course: candidate.course,
          parent_guardian_name: candidate.parent_guardian_name,
          parent_guardian_cpf: candidate.parent_guardian_cpf,
          parent_guardian_email: candidate.parent_guardian_email,
          parent_guardian_phone: candidate.parent_guardian_phone,
          educational_institution_name: candidate.educational_institution_name,
          educational_institution_email: candidate.educational_institution_email,
          educational_institution_contact: candidate.educational_institution_contact,
        } : undefined,
        job: job ? {
          title: job.title,
          salary: job.salary,
          contract_type: job.contract_type,
        } : undefined,
        agency: agency ? {
          name: agency.name,
          city: agency.city,
        } : undefined,
        hiring: {
          start_date: process.start_date,
          end_date: process.end_date,
          duration_months: process.contract_duration_months,
          monthly_salary: process.monthly_salary,
          monthly_fee: process.calculated_fee,
          payment_day: process.payment_day,
          hiring_type: process.hiring_type,
        },
      });

      // Scan each template
      const templates = await db.getDocumentTemplatesByIds(input.selectedTemplateIds);
      const results: Array<{
        templateId: string;
        templateName: string;
        autoFilled: Record<string, string>;
        missing: Array<{ key: string; label: string }>;
      }> = [];

      for (const template of templates) {
        const isDocx = template.file_url?.endsWith(".docx") || template.name?.endsWith(".docx");

        if (!isDocx) {
          // Non-DOCX templates have no placeholders to fill
          results.push({
            templateId: template.id,
            templateName: template.name,
            autoFilled: {},
            missing: [],
          });
          continue;
        }

        try {
          const response = await fetch(template.file_url);
          const buffer = Buffer.from(await response.arrayBuffer());
          const placeholders = scanPlaceholders(buffer);

          const autoFilled: Record<string, string> = {};
          const missing: Array<{ key: string; label: string }> = [];

          for (const key of placeholders) {
            if (autoData[key]) {
              autoFilled[key] = autoData[key];
            } else {
              missing.push({
                key,
                label: PLACEHOLDER_LABELS[key] || key,
              });
            }
          }

          results.push({
            templateId: template.id,
            templateName: template.name,
            autoFilled,
            missing,
          });
        } catch (err: any) {
          console.error(`[Hiring] Failed to scan placeholders in ${template.name}:`, err.message);
          results.push({
            templateId: template.id,
            templateName: template.name,
            autoFilled: {},
            missing: [],
          });
        }
      }

      return {
        templates: results,
        allPlaceholderLabels: PLACEHOLDER_LABELS,
      };
    }),

  // ============================================
  // CANDIDATE ENDPOINTS
  // ============================================

  /**
   * Get hiring processes for candidate (to see contracts to sign)
   */
  getCandidateHiringProcesses: candidateProcedure.query(async ({ ctx }) => {
    const candidate = await db.getCandidateByUserId(ctx.user.id);
    if (!candidate) return [];

    const { data, error } = await supabaseAdmin
      .from("hiring_processes")
      .select(`
        *,
        company:companies(id, company_name, agency_id),
        job:jobs(id, title, contract_type),
        signing_invitations:signing_invitations(*)
      `)
      .eq("candidate_id", candidate.id)
      .order("created_at", { ascending: false });

    if (error) return [];
    return data || [];
  }),

  /**
   * Candidate signs contract
   */
  signAsCandidate: candidateProcedure
    .input(z.object({
      hiringProcessId: z.string().uuid(),
      signerCpf: z.string().min(11),
      signature: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const candidate = await db.getCandidateByUserId(ctx.user.id);
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not found" });
      }

      const process = await hiringDb.getHiringProcessById(input.hiringProcessId);
      if (!process || process.candidate_id !== candidate.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      if (process.candidate_signed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You have already signed",
        });
      }

      await hiringDb.recordCandidateSignature(input.hiringProcessId, input.signerCpf);

      // Update the signing invitation if exists
      const invitation = process.signing_invitations?.find(
        (i: any) => i.signer_role === "candidate" && !i.signed_at
      );
      if (invitation) {
        await hiringDb.completeSigningInvitation(
          invitation.id,
          input.signature,
          input.signerCpf
        );
      }

      // Check status
      const signatureStatus = await hiringDb.checkAllSignaturesComplete(input.hiringProcessId);

      // Notify company
      const company = await db.getCompanyById(process.company_id);
      if (company?.user_id) {
        await db.createNotification({
          user_id: company.user_id,
          title: "Candidato assinou o contrato",
          message: `${candidate.full_name} assinou o contrato de estágio para a vaga "${process.job?.title}".`,
          type: "success",
          related_to_type: "hiring",
          related_to_id: input.hiringProcessId,
        });
      }

      // If all signatures complete, send completion notifications
      if (signatureStatus.complete) {
        await sendSignaturesCompleteNotifications(
          input.hiringProcessId,
          process,
          company
        );
      }

      return { success: true, signatureStatus };
    }),
});

// ============================================
// PUBLIC SIGNING ROUTER (for parent/school)
// ============================================

export const publicSigningRouter = router({
  /**
   * Get signing details by token
   */
  getSigningDetails: publicProcedure
    .input(z.object({
      token: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const invitation = await hiringDb.getSigningInvitationByToken(input.token);

      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado" });
      }

      if (invitation.signed_at) {
        return {
          alreadySigned: true,
          signedAt: invitation.signed_at,
        };
      }

      if (new Date(invitation.expires_at) < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este convite expirou" });
      }

      // Mark as viewed
      await hiringDb.markInvitationViewed(invitation.id);

      const process = invitation.hiring_process;

      // Fetch only the selected contract templates for this hiring process
      let contractTemplates: { name: string; fileUrl: string }[] = [];
      if (process?.selected_template_ids?.length) {
        const templates = await db.getDocumentTemplatesByIds(process.selected_template_ids);
        contractTemplates = templates.map((t: any) => ({
          name: t.name,
          fileUrl: t.file_url,
        }));
      }

      return {
        alreadySigned: false,
        invitationId: invitation.id,
        signerRole: invitation.signer_role,
        signerName: invitation.signer_name,
        signerEmail: invitation.signer_email,
        autentiqueSignUrl: invitation.autentique_sign_url || null,
        candidate: {
          name: process?.candidate?.full_name,
        },
        company: {
          name: process?.company?.company_name,
        },
        job: {
          title: process?.job?.title,
        },
        startDate: process?.start_date,
        hiringType: process?.hiring_type,
        contractTemplates,
      };
    }),

  /**
   * Sign document by token
   */
  signByToken: publicProcedure
    .input(z.object({
      token: z.string().uuid(),
      signerCpf: z.string().min(11),
      signature: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const invitation = await hiringDb.getSigningInvitationByToken(input.token);

      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado" });
      }

      if (invitation.signed_at) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este documento já foi assinado" });
      }

      if (new Date(invitation.expires_at) < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este convite expirou" });
      }

      // Get client IP from request headers if available
      const signerIp = ctx.req?.headers?.["x-forwarded-for"] as string ||
                       ctx.req?.socket?.remoteAddress;

      // Complete the invitation
      await hiringDb.completeSigningInvitation(
        invitation.id,
        input.signature,
        input.signerCpf,
        signerIp
      );

      // Update hiring process based on role
      const hiringProcessId = invitation.hiring_process_id;

      if (invitation.signer_role === "parent_guardian") {
        await hiringDb.recordParentSignature(
          hiringProcessId,
          invitation.signer_name,
          input.signerCpf
        );
      } else if (invitation.signer_role === "educational_institution") {
        await hiringDb.recordSchoolSignature(
          hiringProcessId,
          invitation.signer_name,
          invitation.signer_email
        );
      }

      // Check if all signatures complete
      const signatureStatus = await hiringDb.checkAllSignaturesComplete(hiringProcessId);

      // Notify company
      const process = invitation.hiring_process;
      if (process) {
        const company = await db.getCompanyById(process.company_id);
        if (company?.user_id) {
          const roleLabel = invitation.signer_role === "parent_guardian"
            ? "Responsável"
            : "Instituição de Ensino";

          await db.createNotification({
            user_id: company.user_id,
            title: `${roleLabel} assinou o contrato`,
            message: `${invitation.signer_name} (${roleLabel}) assinou o contrato de estágio para ${process.candidate?.full_name}.${signatureStatus.complete ? " Todas as assinaturas foram coletadas!" : ""}`,
            type: "success",
            related_to_type: "hiring",
            related_to_id: hiringProcessId,
          });
        }

        // If all signatures complete, send completion notifications
        if (signatureStatus.complete) {
          await sendSignaturesCompleteNotifications(
            hiringProcessId,
            process,
            company
          );
        }
      }

      return {
        success: true,
        signatureStatus,
      };
    }),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Handle estágio follow-ups and payment generation when all signatures complete
 */
async function handleEstagioSignaturesComplete(
  hiringProcessId: string,
  process: any,
  company: any
): Promise<void> {
  const startDate = new Date(process.start_date);

  // Create follow-up schedule
  await hiringDb.createEstagioFollowUps(
    hiringProcessId,
    process.contract_id,
    company.id,
    startDate
  );

  // Generate recurring payments using configured values
  const paymentDay = process.payment_day || hiringDb.calculatePaymentDay(startDate);
  const monthlyFee = process.calculated_fee;
  const durationMonths = process.contract_duration_months || 12;

  for (let i = 0; i < durationMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);
    dueDate.setDate(paymentDay);

    await db.createPayment({
      contract_id: process.contract_id || undefined,
      company_id: company.id,
      amount: monthlyFee,
      payment_type: "monthly-fee",
      due_date: dueDate.toISOString(),
      status: "pending",
      billing_period: `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}`,
      notes: `Taxa mensal estágio - ${process.candidate?.full_name}`,
    });
  }
}

/**
 * Send notifications when all signatures are complete
 */
async function sendSignaturesCompleteNotifications(
  hiringProcessId: string,
  process: any,
  company: any
): Promise<void> {
  const jobTitle = process.job?.title || "Vaga";
  const candidateName = process.candidate?.full_name || "Candidato";

  // Notify company
  if (company?.user_id) {
    await db.createNotification({
      user_id: company.user_id,
      title: "Todas as assinaturas coletadas!",
      message: `O contrato de estágio de ${candidateName} para a vaga "${jobTitle}" está completo. Todas as assinaturas foram coletadas com sucesso.`,
      type: "success",
      related_to_type: "hiring",
      related_to_id: hiringProcessId,
    });
  }

  // Notify candidate
  if (process.candidate?.user_id) {
    await db.createNotification({
      user_id: process.candidate.user_id,
      title: "Contrato de estágio completo!",
      message: `Seu contrato de estágio para a vaga "${jobTitle}" foi finalizado. Todas as assinaturas foram coletadas!`,
      type: "success",
      related_to_type: "hiring",
      related_to_id: hiringProcessId,
    });
  }

  // Send email to candidate
  if (process.candidate?.email) {
    const startDate = new Date(process.start_date);
    const formattedDate = format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 16px; border-radius: 6px; margin: 16px 0; border: 1px solid #e5e7eb; }
          .check { font-size: 48px; text-align: center; margin: 16px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0;">Contrato Finalizado!</h1>
          </div>
          <div class="content">
            <div class="check">✅</div>
            <p>Olá ${candidateName},</p>
            <p>Ótima notícia! Todas as assinaturas do seu contrato de estágio foram coletadas com sucesso.</p>

            <div class="info-box">
              <p><strong>Empresa:</strong> ${company?.company_name}</p>
              <p><strong>Vaga:</strong> ${jobTitle}</p>
              <p><strong>Início:</strong> ${formattedDate}</p>
            </div>

            <p><strong>Próximos passos:</strong></p>
            <ul>
              <li>Apresente-se na empresa na data de início</li>
              <li>Leve seus documentos pessoais</li>
              <li>Em caso de dúvidas, entre em contato com a empresa</li>
            </ul>

            <p style="margin-top: 24px; color: #666; font-size: 14px;">
              Desejamos muito sucesso no seu estágio!
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await sendEmail(
        process.candidate.email,
        `✅ Contrato de estágio finalizado - ${jobTitle}`,
        emailHtml
      );
    } catch (err) {
      console.error("[Hiring] Failed to send contract complete email:", err);
    }
  }
}

/**
 * Send email to candidate when they're selected for a job
 */
async function sendCandidateSelectedEmail(
  email: string,
  candidateName: string,
  companyName: string,
  jobTitle: string,
  startDate: Date,
  hiringType: string
): Promise<void> {
  const formattedDate = format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const portalUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/candidate/contratos`;

  const isEstagio = hiringType === "estagio";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
        .info-box { background: white; padding: 16px; border-radius: 6px; margin: 16px 0; border: 1px solid #e5e7eb; }
        .celebration { font-size: 48px; text-align: center; margin: 16px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">Parabéns!</h1>
          <p style="margin:8px 0 0 0;">Você foi selecionado!</p>
        </div>
        <div class="content">
          <div class="celebration">🎉</div>
          <p>Olá ${candidateName},</p>
          <p>Temos uma ótima notícia! Você foi <strong>selecionado(a)</strong> para a vaga de <strong>${jobTitle}</strong>!</p>

          <div class="info-box">
            <p><strong>Empresa:</strong> ${companyName}</p>
            <p><strong>Vaga:</strong> ${jobTitle}</p>
            <p><strong>Tipo:</strong> ${isEstagio ? "Estágio" : "CLT"}</p>
            <p><strong>Início previsto:</strong> ${formattedDate}</p>
          </div>

          ${isEstagio ? `
          <p><strong>Próximos passos:</strong></p>
          <p>Você precisa assinar o contrato de estágio para finalizar sua contratação. Acesse o portal para visualizar e assinar seu contrato.</p>
          <a href="${portalUrl}" class="button">Acessar Meus Contratos</a>
          ` : `
          <p><strong>Próximos passos:</strong></p>
          <p>A empresa entrará em contato com você para os próximos passos da contratação.</p>
          `}

          <p style="margin-top: 24px; color: #666; font-size: 14px;">
            Desejamos muito sucesso nessa nova jornada!
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail(
      email,
      `🎉 Parabéns! Você foi selecionado para ${jobTitle}`,
      emailHtml
    );
  } catch (err) {
    console.error("[Hiring] Failed to send candidate selected email:", err);
  }
}

async function sendSigningInvitationEmail(
  invitation: any,
  signerName: string,
  companyName: string,
  jobTitle: string,
  startDate: Date,
  candidateName?: string
): Promise<void> {
  // Use Autentique signing URL if available, otherwise fallback to our signing page
  const baseUrl = ENV.appUrl;
  const signingUrl = invitation.autentique_sign_url || `${baseUrl}/assinar/${invitation.token}`;
  const formattedDate = format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const roleLabel = invitation.signer_role === "candidate"
    ? "candidato"
    : invitation.signer_role === "parent_guardian"
    ? "responsável legal"
    : "instituição de ensino";

  const forCandidateText = candidateName
    ? `para o(a) candidato(a) <strong>${candidateName}</strong>`
    : "";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
        .info-box { background: white; padding: 16px; border-radius: 6px; margin: 16px 0; border: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">Assinatura de Contrato de Estágio</h1>
        </div>
        <div class="content">
          <p>Olá ${signerName},</p>
          <p>Você foi convidado como <strong>${roleLabel}</strong> para assinar o contrato de estágio ${forCandidateText}.</p>

          <div class="info-box">
            <p><strong>Empresa:</strong> ${companyName}</p>
            <p><strong>Vaga:</strong> ${jobTitle}</p>
            <p><strong>Início:</strong> ${formattedDate}</p>
          </div>

          <p>Clique no botão abaixo para acessar o documento e assinar digitalmente${invitation.autentique_sign_url ? " pela plataforma Autentique" : ""}.</p>

          <a href="${signingUrl}" class="button">Assinar Documento</a>

          <p style="margin-top: 24px; color: #666; font-size: 14px;">
            ${invitation.autentique_sign_url ? "Você também receberá um email da Autentique com o link para assinatura." : "Este link expira em 7 dias."} Se tiver dúvidas, entre em contato com a empresa.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail(
      invitation.signer_email,
      `Assinatura de Contrato de Estágio - ${jobTitle}`,
      emailHtml
    );
    await hiringDb.markInvitationEmailSent(invitation.id);
  } catch (err) {
    console.error("[Hiring] Failed to send signing invitation email:", err);
  }
}
