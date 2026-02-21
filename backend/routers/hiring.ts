// @ts-nocheck
/**
 * Hiring Router - handles the flow from interview to employee
 * Different processes for Estágio (4-party signing, recurring) vs CLT (one-time payment)
 *
 * Email templates are in ./hiringEmails.ts
 * Public signing router is in ./publicSigning.ts
 */

import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { companyProcedure, candidateProcedure, agencyProcedure } from "./procedures";
import * as db from "../db";
import * as hiringDb from "../db/hiring";
import { supabaseAdmin } from "../supabase";
import { createDocument as createAutentiqueDoc, isAutentiqueConfigured } from "../integrations/autentique";
import { sendCandidateSelectedEmail, sendSigningInvitationEmail, sendContractCompleteEmail } from "./hiringEmails";

export const hiringRouter = router({
  // ============================================
  // COMPANY ENDPOINTS
  // ============================================

  getHiringPreview: companyProcedure
    .input(z.object({
      applicationId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      const application = await db.getApplicationById(input.applicationId);
      if (!application) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      }

      const job = await db.getJobById(application.job_id);
      if (!job || job.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const candidate = await db.getCandidateById(application.candidate_id);
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not found" });
      }

      const hiringType = job.contract_type as "estagio" | "clt" | "menor-aprendiz";

      let isFirstIntern = false;
      let calculatedFee = 0;

      if (hiringType === "estagio") {
        const activeEstagios = await hiringDb.countActiveEstagioContracts(company.id);
        isFirstIntern = activeEstagios === 0;
        calculatedFee = hiringDb.calculateEstagioFee(isFirstIntern);
      } else if (hiringType === "clt") {
        const salary = job.salary || candidate.expected_salary || 0;
        calculatedFee = hiringDb.calculateCLTFee(salary);
      }

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
          parentGuardianName: candidate.parent_guardian_name,
          parentGuardianEmail: candidate.parent_guardian_email,
          parentGuardianCpf: candidate.parent_guardian_cpf,
          parentGuardianPhone: candidate.parent_guardian_phone,
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
        calculatedFee,
        feeDisplay: hiringType === "estagio"
          ? `R$ ${(calculatedFee / 100).toFixed(2)}/mês`
          : `R$ ${(calculatedFee / 100).toFixed(2)} (único)`,
        needsParentInfo,
        needsSchoolInfo,
        requiresMultipleSignatures: hiringType === "estagio",
      };
    }),

  initiateHiring: companyProcedure
    .input(z.object({
      applicationId: z.string().uuid(),
      batchId: z.string().uuid().optional(),
      startDate: z.string(),
      monthlySalary: z.number().optional(),
      parentInfo: z.object({
        name: z.string(),
        email: z.string().email(),
        cpf: z.string(),
        phone: z.string().optional(),
      }).optional(),
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

      const application = await db.getApplicationById(input.applicationId);
      if (!application) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      }

      const job = await db.getJobById(application.job_id);
      if (!job || job.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }

      const candidate = await db.getCandidateById(application.candidate_id);
      if (!candidate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Candidate not found" });
      }

      const existingProcess = await hiringDb.getHiringProcessByApplication(input.applicationId);
      if (existingProcess) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Já existe um processo de contratação para esta candidatura",
        });
      }

      const hiringType = job.contract_type as "estagio" | "clt" | "menor-aprendiz";
      const startDate = new Date(input.startDate);

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

      let endDate: string | undefined;

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

      await db.updateApplication(input.applicationId, { status: "selected" });

      if (input.batchId) {
        await db.updateBatch(input.batchId, { status: "completed" });
      }

      if (hiringType !== "estagio") {
        await db.createPayment({
          company_id: company.id,
          amount: calculatedFee,
          payment_type: "setup-fee",
          due_date: new Date().toISOString(),
          status: "pending",
          notes: `Taxa de encaminhamento CLT - ${candidate.full_name} - ${job.title}`,
        });

        await hiringDb.createCLTFollowUp(hiringProcess.id, company.id, startDate);
      }

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

  configureAndSendContract: agencyProcedure
    .input(z.object({
      hiringProcessId: z.string().uuid(),
      durationMonths: z.number().int().min(1).max(36),
      monthlyFee: z.number().int().min(0),
      paymentDay: z.number().int().min(1).max(28),
      monthlySalary: z.number().int().min(0).optional(),
      selectedTemplateIds: z.array(z.string().uuid()).min(1),
    }))
    .mutation(async ({ input }) => {
      const process = await hiringDb.getHiringProcessById(input.hiringProcessId);
      if (!process) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Hiring process not found" });
      }
      if (process.status !== "awaiting_configuration") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This contract has already been configured" });
      }

      const startDate = new Date(process.start_date);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + input.durationMonths);
      const endDateStr = endDate.toISOString().split("T")[0];

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

      if (candidate?.parent_guardian_email && candidate?.parent_guardian_name) {
        await hiringDb.createSigningInvitation({
          hiringProcessId: process.id,
          signerRole: "parent_guardian",
          signerName: candidate.parent_guardian_name,
          signerEmail: candidate.parent_guardian_email,
          signerPhone: candidate.parent_guardian_phone,
        });
      }

      if (candidate?.educational_institution_email && candidate?.educational_institution_name) {
        await hiringDb.createSigningInvitation({
          hiringProcessId: process.id,
          signerRole: "educational_institution",
          signerName: candidate.educational_institution_name,
          signerEmail: candidate.educational_institution_email,
        });
      }

      const invitations = await hiringDb.getSigningInvitationsByHiringProcess(process.id);
      const job = await db.getJobById(process.job_id);

      // Upload templates to Autentique if configured
      if (isAutentiqueConfigured()) {
        try {
          const agencyId = company?.agency_id;
          if (agencyId) {
            const templates = await db.getDocumentTemplatesByIds(input.selectedTemplateIds);

            const autentiqueSigners: Array<{ email: string; name: string; action: "SIGN"; role: string }> = [];

            if (company?.email) {
              autentiqueSigners.push({ email: company.email, name: company.company_name || "Empresa", action: "SIGN", role: "company" });
            }
            if (candidate?.email) {
              autentiqueSigners.push({ email: candidate.email, name: candidate.full_name || "Candidato", action: "SIGN", role: "candidate" });
            }
            if (candidate?.parent_guardian_email) {
              autentiqueSigners.push({ email: candidate.parent_guardian_email, name: candidate.parent_guardian_name || "Responsável", action: "SIGN", role: "parent_guardian" });
            }
            if (candidate?.educational_institution_email) {
              autentiqueSigners.push({ email: candidate.educational_institution_email, name: candidate.educational_institution_name || "Instituição", action: "SIGN", role: "educational_institution" });
            }

            const autentiqueDocIds: string[] = [];

            for (const template of templates) {
              const pdfResponse = await fetch(template.file_url);
              const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

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

              await db.createAutentiqueDocument({
                autentiqueDocumentId: result.documentId,
                documentName: template.name,
                contextType: "hiring_contract",
                contextId: process.id,
                templateId: template.id,
                signers: result.signers.map((apiSigner) => {
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

            if (autentiqueDocIds.length > 0) {
              await supabaseAdmin
                .from("hiring_processes")
                .update({ autentique_document_ids: autentiqueDocIds })
                .eq("id", process.id);
            }
          }
        } catch (autentiqueError: any) {
          console.error("[Hiring] Autentique upload failed:", autentiqueError.message);
        }
      }

      // Send invitation emails
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

  getHiringStatus: companyProcedure
    .input(z.object({ hiringProcessId: z.string().uuid() }))
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
      return { ...process, signatureStatus };
    }),

  getCompanyHiringProcesses: companyProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) return [];
      return await hiringDb.getHiringProcessesByCompany(company.id, input?.status);
    }),

  getHiringProcessDocuments: companyProcedure
    .input(z.object({ hiringProcessId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) return [];

      const process = await hiringDb.getHiringProcessById(input.hiringProcessId);
      if (!process || process.company_id !== company.id) return [];
      if (!process.selected_template_ids?.length) return [];

      return await db.getDocumentTemplatesByIds(process.selected_template_ids);
    }),

  signAsCompany: companyProcedure
    .input(z.object({
      hiringProcessId: z.string().uuid(),
      signerName: z.string().min(1),
      signerCpf: z.string().min(11),
      signature: z.string().min(1),
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
        throw new TRPCError({ code: "BAD_REQUEST", message: "Company has already signed" });
      }

      await hiringDb.recordCompanySignature(input.hiringProcessId, input.signerName, input.signerCpf, input.signature);

      const signatureStatus = await hiringDb.checkAllSignaturesComplete(input.hiringProcessId);

      if (signatureStatus.complete && !signatureStatus.wasAlreadyComplete) {
        await sendSignaturesCompleteNotifications(input.hiringProcessId, process, company);
      }

      if (signatureStatus.complete && process.hiring_type === "estagio") {
        await handleEstagioSignaturesComplete(input.hiringProcessId, process, company);
      }

      return { success: true, signatureStatus };
    }),

  confirmCompanyAutentiqueSign: companyProcedure
    .input(z.object({ hiringProcessId: z.string().uuid() }))
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

      const { data: autentiqueDocs } = await supabaseAdmin
        .from("autentique_documents")
        .select("*")
        .eq("context_type", "hiring_contract")
        .eq("context_id", input.hiringProcessId);

      if (autentiqueDocs && autentiqueDocs.length > 0) {
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

      await supabaseAdmin
        .from("hiring_processes")
        .update({ company_signed: true, company_signed_at: new Date().toISOString() })
        .eq("id", input.hiringProcessId);

      const signatureStatus = await hiringDb.checkAllSignaturesComplete(input.hiringProcessId);

      if (signatureStatus.complete && !signatureStatus.wasAlreadyComplete) {
        await sendSignaturesCompleteNotifications(input.hiringProcessId, process, company);
      }

      if (signatureStatus.complete && process.hiring_type === "estagio") {
        await handleEstagioSignaturesComplete(input.hiringProcessId, process, company);
      }

      return { success: true, signatureStatus };
    }),

  resendSigningInvitation: companyProcedure
    .input(z.object({ invitationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      if (!company) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Company not found" });
      }

      const invitation = await hiringDb.getSigningInvitationById(input.invitationId);
      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
      }
      if (invitation.hiring_process?.company_id !== company.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      }
      if (invitation.signed_at) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This invitation has already been signed" });
      }

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

      const existingInvitations = await hiringDb.getSigningInvitationsByHiringProcess(input.hiringProcessId);
      const alreadyExists = existingInvitations.find(
        (inv: any) => inv.signer_role === input.signerRole && !inv.signed_at
      );
      if (alreadyExists) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Já existe um convite de assinatura para este papel" });
      }

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

      const invitation = await hiringDb.createSigningInvitation({
        hiringProcessId: input.hiringProcessId,
        signerRole: input.signerRole,
        signerName: input.signerName,
        signerEmail: input.signerEmail,
      });

      let autentiqueSignUrl: string | null = null;
      if (isAutentiqueConfigured() && process.autentique_document_ids?.length) {
        try {
          const { addSignerToDocument } = await import("../integrations/autentique");

          for (const docId of process.autentique_document_ids) {
            const result = await addSignerToDocument(docId, { name: input.signerName, action: "SIGN" });

            if (!autentiqueSignUrl && result.signUrl) {
              autentiqueSignUrl = result.signUrl;
            }

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
        }
      }

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

      return { success: true, invitationId: invitation.id, token: invitation.token, autentiqueSignUrl };
    }),

  confirmCLTPayment: companyProcedure
    .input(z.object({ hiringProcessId: z.string().uuid() }))
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
        throw new TRPCError({ code: "BAD_REQUEST", message: "Processo não está aguardando pagamento" });
      }

      await hiringDb.updateHiringProcess(input.hiringProcessId, { status: "active" });

      const startDate = new Date(process.start_date);
      try {
        await hiringDb.createCLTFollowUp(input.hiringProcessId, company.id, startDate);
      } catch (e) {
        // Follow-up may already exist from initiateHiring
      }

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

  getUpcomingFollowUps: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) return [];
    return await hiringDb.getUpcomingFollowUps(company.id);
  }),

  // ============================================
  // AGENCY ENDPOINTS
  // ============================================

  getHiringProcessesByJobId: agencyProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ input }) => {
      return await hiringDb.getHiringProcessesByJobId(input.jobId);
    }),

  sendSigningInvitations: agencyProcedure
    .input(z.object({ hiringProcessId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const unsent = await hiringDb.getUnsentInvitations(input.hiringProcessId);
      if (unsent.length === 0) return { sent: 0 };

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

  createSigningInvitationForRole: agencyProcedure
    .input(z.object({
      hiringProcessId: z.string().uuid(),
      signerRole: z.enum(["parent_guardian", "educational_institution"]),
      signerName: z.string().min(1),
      signerEmail: z.string().email(),
    }))
    .mutation(async ({ input }) => {
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

  // ============================================
  // CANDIDATE ENDPOINTS
  // ============================================

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
        throw new TRPCError({ code: "BAD_REQUEST", message: "You have already signed" });
      }

      await hiringDb.recordCandidateSignature(input.hiringProcessId, input.signerCpf);

      const invitation = process.signing_invitations?.find(
        (i: any) => i.signer_role === "candidate" && !i.signed_at
      );
      if (invitation) {
        await hiringDb.completeSigningInvitation(invitation.id, input.signature, input.signerCpf);
      }

      const signatureStatus = await hiringDb.checkAllSignaturesComplete(input.hiringProcessId);

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

      if (signatureStatus.complete) {
        await sendSignaturesCompleteNotifications(input.hiringProcessId, process, company);
      }

      return { success: true, signatureStatus };
    }),
});

// ============================================
// HELPER FUNCTIONS (exported for publicSigning router)
// ============================================

async function handleEstagioSignaturesComplete(
  hiringProcessId: string,
  process: any,
  company: any
): Promise<void> {
  const startDate = new Date(process.start_date);

  await hiringDb.createEstagioFollowUps(
    hiringProcessId,
    process.contract_id,
    company.id,
    startDate
  );

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

export async function sendSignaturesCompleteNotifications(
  hiringProcessId: string,
  process: any,
  company: any
): Promise<void> {
  const jobTitle = process.job?.title || "Vaga";
  const candidateName = process.candidate?.full_name || "Candidato";

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

  if (process.candidate?.email) {
    await sendContractCompleteEmail(
      process.candidate.email,
      candidateName,
      company?.company_name || "Empresa",
      jobTitle,
      new Date(process.start_date)
    );
  }
}
