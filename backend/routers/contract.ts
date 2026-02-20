// @ts-nocheck
// Contract router - employment contract management
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";
import { adminProcedure, companyProcedure, candidateProcedure } from "./procedures";
import * as db from "../db";
import * as hiringDb from "../db/hiring";

export const contractRouter = router({
  // Create contract
  create: companyProcedure
    .input(z.object({
      candidateId: z.string().uuid(),
      jobId: z.string().uuid(),
      applicationId: z.string().uuid(),
      contractType: z.enum(["estagio", "clt", "menor-aprendiz"]),
      contractNumber: z.string(),
      monthlySalary: z.number(),
      monthlyFee: z.number(),
      insuranceFee: z.number().optional(),
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
        insuranceFee: input.insuranceFee || 0,
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
      id: z.string().uuid(),
      status: z.enum(["pending-signature", "active", "suspended", "terminated", "completed"]).optional(),
      terminationReason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateContract(id, data);

      // Generate payment schedule when contract is activated
      if (input.status === 'active') {
        try {
          const count = await db.generateContractPayments(id);
          console.log(`[Contract] Generated ${count} payments for contract ${id}`);
        } catch (err) {
          console.error(`[Contract] Failed to generate payments for contract ${id}:`, err);
        }
      }

      return { success: true };
    }),

  // ============================================
  // Document Signing Flow
  // ============================================

  // Get documents to sign for a given category (with signing status)
  getDocumentsToSign: companyProcedure
    .input(z.object({
      category: z.enum(['contrato_inicial', 'clt', 'estagio', 'menor_aprendiz']),
      contractId: z.string().uuid().optional(),
      candidateId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);

      // Use company's agency_id, or fall back to user's agency_id (during onboarding, company may not exist yet)
      const agencyId = company?.agency_id || ctx.user.agency_id;

      if (!agencyId) {
        return { templates: [], signed: [], total: 0, signedCount: 0, allSigned: true };
      }

      const templates = await db.getDocumentTemplates(agencyId, input.category);
      const templateIds = templates.map((t: any) => t.id);

      let signedDocs: any[] = [];
      if (templateIds.length > 0) {
        signedDocs = await db.getSignedDocumentsByTemplateIds(
          company?.id || null,
          templateIds,
          input.contractId,
          ctx.user.id
        );
      }

      const signedTemplateIds = new Set(signedDocs.map((s: any) => s.template_id));

      // Check for Autentique documents (signing happens on Autentique)
      let autentiqueDocuments: any[] = [];
      const { supabaseAdmin } = await import("../supabase");
      try {
        // 1. Check outreach_contract context (admin sent contract via outreach)
        if (input.category === "contrato_inicial") {
          const { data: meetings } = await supabaseAdmin
            .from("scheduled_meetings")
            .select("id")
            .eq("company_email", ctx.user.email)
            .not("autentique_document_ids", "is", null);

          if (meetings && meetings.length > 0) {
            for (const meeting of meetings) {
              const docs = await db.getAutentiqueDocumentsByContext("outreach_contract", meeting.id);
              autentiqueDocuments.push(...docs);
            }
          }

          // 2. Check onboarding_contract context (self-service onboarding)
          const contextId = company?.id || ctx.user.id;
          console.log(`[Contract] Looking up onboarding_contract docs for contextId=${contextId}`);
          const onboardingDocs = await db.getAutentiqueDocumentsByContext("onboarding_contract", contextId);
          console.log(`[Contract] Found ${onboardingDocs.length} onboarding Autentique docs`);
          autentiqueDocuments.push(...onboardingDocs);
        }

        // 3. Check hiring_contract context (hiring process contracts)
        if (company?.id) {
          const { data: hiringProcesses } = await supabaseAdmin
            .from("hiring_processes")
            .select("id, autentique_document_ids")
            .eq("company_id", company.id)
            .not("autentique_document_ids", "eq", "{}");

          if (hiringProcesses && hiringProcesses.length > 0) {
            for (const hp of hiringProcesses) {
              const docs = await db.getAutentiqueDocumentsByContext("hiring_contract", hp.id);
              autentiqueDocuments.push(...docs);
            }
          }
        }
      } catch (err: any) {
        console.error("[Contract] Error looking up Autentique docs:", err?.message || err);
      }

      const enrichedTemplates = templates.map((t: any) => {
        const autentiqueDoc = autentiqueDocuments.find((d: any) => d.template_id === t.id);
        return {
          ...t,
          isSigned: signedTemplateIds.has(t.id) || autentiqueDoc?.status === "signed",
          autentiqueStatus: autentiqueDoc?.status || null,
          autentiqueSignUrl: autentiqueDoc?.signers?.find((s: any) => s.sign_url)?.sign_url || null,
        };
      });

      const totalSigned = enrichedTemplates.filter((t: any) => t.isSigned).length;

      return {
        templates: enrichedTemplates,
        signed: signedDocs,
        total: templates.length,
        signedCount: totalSigned,
        allSigned: templates.length === 0 || totalSigned >= templates.length,
      };
    }),

  // Create Autentique documents on-demand for self-service onboarding
  prepareAutentiqueDocuments: companyProcedure
    .input(z.object({
      category: z.enum(['contrato_inicial', 'clt', 'estagio', 'menor_aprendiz']),
    }))
    .mutation(async ({ ctx, input }) => {
      const { createDocument: createAutentiqueDocument, isAutentiqueConfigured } = await import("../integrations/autentique");

      if (!isAutentiqueConfigured()) {
        return { created: false, reason: "autentique_not_configured" };
      }

      const company = await db.getCompanyByUserId(ctx.user.id);
      const agencyId = company?.agency_id || ctx.user.agency_id;
      if (!agencyId) {
        return { created: false, reason: "no_agency" };
      }

      const contextId = company?.id || ctx.user.id;
      const { supabaseAdmin } = await import("../supabase");

      // Check if Autentique docs already exist for this context
      const existingDocs = await db.getAutentiqueDocumentsByContext("onboarding_contract", contextId);
      if (existingDocs.length > 0) {
        return { created: false, reason: "already_exist" };
      }

      // Also check outreach_contract context (admin may have already sent contract)
      if (input.category === "contrato_inicial") {
        const { data: meetings } = await supabaseAdmin
          .from("scheduled_meetings")
          .select("id")
          .eq("company_email", ctx.user.email)
          .not("autentique_document_ids", "is", null);

        if (meetings && meetings.length > 0) {
          return { created: false, reason: "outreach_exists" };
        }
      }

      const templates = await db.getDocumentTemplates(agencyId, input.category);
      if (templates.length === 0) {
        return { created: false, reason: "no_templates" };
      }

      const signerEmail = ctx.user.email;
      const signerName = company?.contact_name || company?.name || ctx.user.name || "Representante";
      let count = 0;

      for (const template of templates) {
        try {
          const pdfResponse = await fetch(template.file_url);
          if (!pdfResponse.ok) continue;
          const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

          const result = await createAutentiqueDocument(
            template.name,
            pdfBuffer,
            [{ email: signerEmail, name: signerName, action: "SIGN" }],
            {
              message: `Por favor, assine o documento "${template.name}".`,
              reminder: "WEEKLY",
            }
          );

          console.log(`[Contract] Autentique doc created on API: ${result.documentId}, signUrl=${result.signers[0]?.signUrl || "EMPTY"}`);

          await db.createAutentiqueDocument({
            autentiqueDocumentId: result.documentId,
            documentName: template.name,
            contextType: "onboarding_contract",
            contextId,
            templateId: template.id,
            signers: result.signers.map((s) => ({
              role: "company",
              email: s.email,
              name: s.name,
              autentiqueSignerId: s.public_id,
              signUrl: s.signUrl,
            })),
          });
          console.log(`[Contract] Autentique doc stored in DB: template=${template.name}, contextId=${contextId}`);
          count++;
        } catch (err: any) {
          console.error(`[Contract] Failed to store Autentique doc for ${template.name}:`, err?.message || err);
        }
      }

      return { created: count > 0, count };
    }),

  // Sign a document (legacy canvas signing - kept as fallback)
  signDocument: companyProcedure
    .input(z.object({
      templateId: z.string().uuid(),
      signerName: z.string().min(1),
      signerCpf: z.string().min(11),
      signature: z.string().min(1),
      contractId: z.string().uuid().optional(),
      candidateId: z.string().uuid().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      let company = await db.getCompanyByUserId(ctx.user.id);
      if (!company && ctx.user.email) {
        company = await db.getCompanyByEmail(ctx.user.email) || undefined;
      }
      const agencyId = company?.agency_id || ctx.user.agency_id;

      if (!agencyId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Agência não vinculada' });
      }

      // Verify template belongs to the agency
      const template = await db.getDocumentTemplateById(input.templateId);
      if (!template || template.agency_id !== agencyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Documento não pertence à sua agência' });
      }

      const result = await db.createSignedDocument({
        templateId: input.templateId,
        agencyId: template.agency_id,
        companyId: company?.id || null,
        signerUserId: ctx.user.id,
        category: template.category,
        contractId: input.contractId,
        candidateId: input.candidateId,
        signerName: input.signerName,
        signerCpf: input.signerCpf,
        signature: input.signature,
      });

      // Generate signed PDF with embedded signature
      try {
        const { embedSignatureInPdf } = await import('../lib/signPdf');
        const { storagePut } = await import('../storage');

        const signedPdfBytes = await embedSignatureInPdf(
          template.file_url,
          input.signature,
          input.signerName,
          input.signerCpf
        );

        const pdfKey = `signed-docs/${result.id}.pdf`;
        const { url: signedPdfUrl } = await storagePut(pdfKey, signedPdfBytes, 'application/pdf');
        await db.updateSignedDocumentUrl(result.id, signedPdfUrl);
        console.log(`[Contract] Generated signed PDF for document ${result.id}`);
      } catch (err) {
        console.error(`[Contract] Failed to generate signed PDF for ${result.id}:`, err);
      }

      // Check remaining unsigned
      const status = await db.checkAllDocumentsSigned({
        agencyId: template.agency_id,
        companyId: company?.id || null,
        signerUserId: ctx.user.id,
        category: template.category,
        contractId: input.contractId,
      });

      // Bridge to agency view: update companies table when contrato_inicial is fully signed
      if (template.category === 'contrato_inicial' && status.allSigned && company?.id) {
        try {
          await db.updateCompanyContractSigning(company.id, {
            contract_signed_at: new Date().toISOString(),
            contract_signature: input.signature,
            contract_signer_name: input.signerName,
            contract_signer_cpf: input.signerCpf,
          });
        } catch (err) {
          console.error(`[Contract] Failed to update company contract status:`, err);
        }
      }

      return {
        success: true,
        signedDocumentId: result.id,
        remainingUnsigned: status.total - status.signed,
        allSigned: status.allSigned,
      };
    }),

  // Get signed documents (agency/company/admin view)
  getSignedDocuments: protectedProcedure
    .input(z.object({
      companyId: z.string().uuid().optional(),
      contractId: z.string().uuid().optional(),
      category: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role === 'company') {
        const company = await db.getCompanyByUserId(ctx.user.id);
        if (!company) return [];
        return await db.getSignedDocuments({ companyId: company.id, ...input });
      }

      if (ctx.user.role === 'agency') {
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency) return [];
        return await db.getSignedDocuments({ agencyId: agency.id, ...input });
      }

      if (ctx.user.role === 'admin') {
        return await db.getSignedDocuments(input);
      }

      throw new TRPCError({ code: 'FORBIDDEN' });
    }),

  // Check if all documents are signed for a category
  checkAllSigned: companyProcedure
    .input(z.object({
      category: z.enum(['contrato_inicial', 'clt', 'estagio', 'menor_aprendiz']),
      contractId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);
      const agencyId = company?.agency_id || ctx.user.agency_id;

      if (!agencyId) {
        return { allSigned: true, total: 0, signed: 0 };
      }

      return await db.checkAllDocumentsSigned({
        agencyId,
        companyId: company?.id || null,
        category: input.category,
        contractId: input.contractId,
        signerUserId: ctx.user.id,
      });
    }),

  // ============================================
  // Candidate Document Signing
  // ============================================

  // Get contract documents for candidate based on hiring type
  getCandidateContractDocuments: candidateProcedure
    .input(z.object({
      hiringProcessId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const candidate = await db.getCandidateByUserId(ctx.user.id);
      if (!candidate) {
        return { templates: [], total: 0, signedCount: 0, allSigned: true };
      }

      // Get hiring process and verify it belongs to this candidate
      const hp = await db.getHiringProcessById(input.hiringProcessId);
      if (!hp || hp.candidate_id !== candidate.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Processo não encontrado' });
      }

      // Get agency_id from the company
      const company = await db.getCompanyById(hp.company_id);
      const agencyId = company?.agency_id;
      if (!agencyId) {
        return { templates: [], total: 0, signedCount: 0, allSigned: true };
      }

      // Map hiring_type to document category
      const categoryMap: Record<string, string> = {
        'estagio': 'estagio',
        'clt': 'clt',
        'menor-aprendiz': 'menor_aprendiz',
      };
      const category = categoryMap[hp.hiring_type] || hp.hiring_type;

      const templates = await db.getDocumentTemplates(agencyId, category);
      const templateIds = templates.map((t: any) => t.id);

      let signedDocs: any[] = [];
      if (templateIds.length > 0) {
        signedDocs = await db.getSignedDocumentsByTemplateIds(
          null,
          templateIds,
          undefined,
          ctx.user.id
        );
      }

      const signedTemplateIds = new Set(signedDocs.map((s: any) => s.template_id));

      return {
        templates: templates.map((t: any) => ({
          ...t,
          isSigned: signedTemplateIds.has(t.id),
        })),
        total: templates.length,
        signedCount: signedDocs.length,
        allSigned: templates.length === 0 || signedDocs.length >= templates.length,
      };
    }),

  // Sign a document as candidate
  signDocumentAsCandidate: candidateProcedure
    .input(z.object({
      templateId: z.string().uuid(),
      hiringProcessId: z.string().uuid(),
      signerName: z.string().min(1),
      signerCpf: z.string().min(11),
      signature: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const candidate = await db.getCandidateByUserId(ctx.user.id);
      if (!candidate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Candidato não encontrado' });
      }

      // Verify hiring process belongs to candidate
      const hp = await db.getHiringProcessById(input.hiringProcessId);
      if (!hp || hp.candidate_id !== candidate.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Processo não encontrado' });
      }

      const company = await db.getCompanyById(hp.company_id);
      const agencyId = company?.agency_id;
      if (!agencyId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Agência não vinculada' });
      }

      // Verify template belongs to the agency
      const template = await db.getDocumentTemplateById(input.templateId);
      if (!template || template.agency_id !== agencyId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Documento não pertence à agência' });
      }

      const result = await db.createSignedDocument({
        templateId: input.templateId,
        agencyId: template.agency_id,
        companyId: company?.id || null,
        signerUserId: ctx.user.id,
        category: template.category,
        candidateId: candidate.id,
        signerName: input.signerName,
        signerCpf: input.signerCpf,
        signature: input.signature,
      });

      // Generate signed PDF with embedded signature
      try {
        const { embedSignatureInPdf } = await import('../lib/signPdf');
        const { storagePut } = await import('../storage');

        const signedPdfBytes = await embedSignatureInPdf(
          template.file_url,
          input.signature,
          input.signerName,
          input.signerCpf
        );

        const pdfKey = `signed-docs/${result.id}.pdf`;
        const { url: signedPdfUrl } = await storagePut(pdfKey, signedPdfBytes, 'application/pdf');
        await db.updateSignedDocumentUrl(result.id, signedPdfUrl);
      } catch (err) {
        console.error(`[Contract] Failed to generate signed PDF for ${result.id}:`, err);
      }

      // Check remaining unsigned
      const categoryMap: Record<string, string> = {
        'estagio': 'estagio',
        'clt': 'clt',
        'menor-aprendiz': 'menor_aprendiz',
      };
      const category = categoryMap[hp.hiring_type] || hp.hiring_type;

      const status = await db.checkAllDocumentsSigned({
        agencyId: template.agency_id,
        companyId: null,
        category,
        signerUserId: ctx.user.id,
      });

      // Mark candidate_signed on hiring process when all documents are signed
      if (status.allSigned) {
        await hiringDb.updateHiringProcess(input.hiringProcessId, {
          candidate_signed: true,
          candidate_signed_at: new Date().toISOString(),
          candidate_signer_cpf: input.signerCpf,
        } as any);
      }

      return {
        success: true,
        signedDocumentId: result.id,
        remainingUnsigned: status.total - status.signed,
        allSigned: status.allSigned,
      };
    }),
});
