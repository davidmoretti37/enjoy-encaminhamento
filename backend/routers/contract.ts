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

      return {
        templates: templates.map((t: any) => ({
          ...t,
          isSigned: signedTemplateIds.has(t.id),
        })),
        signed: signedDocs,
        total: templates.length,
        signedCount: signedDocs.length,
        allSigned: templates.length === 0 || signedDocs.length >= templates.length,
      };
    }),

  // Sign a document
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
