// Contract router - employment contract management
import { z } from "zod";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";
import { adminProcedure, companyProcedure, candidateProcedure } from "./procedures";
import * as _db from "../db";
import * as _hiringDb from "../db/hiring";
const db: any = _db;
const hiringDb: any = _hiringDb;

export const contractRouter = router({
  // Create contract
  create: companyProcedure
    .input(z.object({
      candidateId: z.string().uuid(),
      jobId: z.string().uuid(),
      applicationId: z.string().uuid(),
      contractType: z.enum(["estagio", "clt", "menor-aprendiz", "pj"]),
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

      const contractId = await (db as any).createContract({
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
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Ownership check — verify the contract belongs to the requesting user
      const contract = await db.getContractWithDetails(id);
      if (!contract) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Contrato não encontrado' });
      }

      if (ctx.user.role === 'agency') {
        const agency = await db.getAgencyByUserId(ctx.user.id);
        if (!agency || (contract as any).companies?.agency_id !== agency.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
        }
      } else if (ctx.user.role === 'company') {
        const company = await db.getCompanyByUserId(ctx.user.id);
        if (!company || contract.company_id !== company.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
        }
      } else if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }

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
      category: z.enum(['contrato_inicial', 'clt', 'estagio', 'menor_aprendiz', 'pj']),
      contractId: z.string().uuid().optional(),
      candidateId: z.string().uuid().optional(),
      hiringProcessId: z.string().uuid().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const company = await db.getCompanyByUserId(ctx.user.id);

      // Use company's agency_id, or fall back to user's agency_id (during onboarding, company may not exist yet)
      const agencyId = company?.agency_id || ctx.user.agency_id;

      if (!agencyId) {
        return { templates: [], signed: [], total: 0, signedCount: 0, allSigned: true };
      }

      let templates: any[];

      // Check if specific documents were assigned to this hiring process
      if (input.hiringProcessId) {
        const { supabaseAdmin: _sb } = await import("../supabase");
        const sbAdmin = _sb as any;
        const { data: assigned } = await sbAdmin
          .from('hiring_process_documents')
          .select('template:agency_document_templates(*)')
          .eq('hiring_process_id', input.hiringProcessId)
          .in('target', ['company', 'both']);

        if (assigned && assigned.length > 0) {
          templates = assigned.map((a: any) => a.template).filter(Boolean);
        } else {
          // Fallback: all templates of matching category
          templates = await db.getDocumentTemplates(agencyId, input.category);
        }
      } else {
        templates = await db.getDocumentTemplates(agencyId, input.category);
      }

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
      const { supabaseAdmin: _sb } = await import("../supabase");
      const supabaseAdminAny = _sb as any;
      try {
        // 1. Check outreach_contract context (admin sent contract via outreach)
        if (input.category === "contrato_inicial") {
          const { data: meetings } = await supabaseAdminAny
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
          const { data: hiringProcesses } = await supabaseAdminAny
            .from("hiring_processes")
            .select("id")
            .eq("company_id", company.id);

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

      // Refresh status from Autentique API for any pending docs + sync to signed_documents
      if (autentiqueDocuments.length > 0) {
        try {
          const { getDocumentStatus } = await import("../integrations/autentique");
          const { createSignedDocumentFromAutentique, updateSignedDocPdfByAutentique } = await import("../db/documents");
          const { getHiringContextForSigning } = await import("../db/hiring");

          for (const aDoc of autentiqueDocuments) {
            if (aDoc.status === "pending" && aDoc.autentique_document_id) {
              const apiStatus = await getDocumentStatus(aDoc.autentique_document_id);
              const signedSigners = apiStatus.signers.filter((s: any) => s.signed);
              if (signedSigners.length > 0) {
                // Track which signers are newly signed
                const previousSigners = aDoc.signers || [];

                // Update signers signed_at in DB
                const updatedSigners = previousSigners.map((s: any) => {
                  const apiSigner = apiStatus.signers.find((as: any) => as.public_id === s.autentique_signer_id);
                  if (apiSigner?.signed) {
                    return { ...s, signed_at: apiSigner.signed.created_at };
                  }
                  return s;
                });
                const allSignersSigned = updatedSigners.every((s: any) => s.signed_at);
                const newStatus = allSignersSigned ? "signed" : aDoc.status;
                const signedPdfUrl = allSignersSigned && apiStatus.files?.signed ? apiStatus.files.signed : null;

                await supabaseAdminAny
                  .from("autentique_documents")
                  .update({
                    signers: updatedSigners,
                    status: newStatus,
                    ...(signedPdfUrl ? { signed_pdf_url: signedPdfUrl } : {}),
                  })
                  .eq("id", aDoc.id);
                aDoc.status = newStatus;
                aDoc.signers = updatedSigners;

                // Sync newly signed signers to signed_documents table
                if (aDoc.context_type === "hiring_contract" && aDoc.template_id) {
                  const ctx2 = await getHiringContextForSigning(aDoc.context_id);
                  if (ctx2) {
                    for (const signer of updatedSigners) {
                      const wasPreviouslySigned = previousSigners.find((ps: any) =>
                        ps.autentique_signer_id === signer.autentique_signer_id && ps.signed_at
                      );
                      if (signer.signed_at && !wasPreviouslySigned) {
                        const userIdMap: Record<string, string | null> = {
                          company: ctx2.companyUserId,
                          candidate: ctx2.candidateUserId,
                          agency: null,
                        };
                        await createSignedDocumentFromAutentique({
                          autentiqueDocumentId: aDoc.id,
                          templateId: aDoc.template_id,
                          agencyId: ctx2.agencyId,
                          companyId: signer.role === "company" ? ctx2.companyId : null,
                          candidateId: signer.role === "candidate" ? ctx2.candidateId : null,
                          signerUserId: userIdMap[signer.role] || null,
                          signerName: signer.name || signer.role,
                          category: ctx2.category,
                          signedAt: signer.signed_at,
                          signedPdfUrl: signedPdfUrl,
                        });
                        console.log(`[Contract] Created signed_document for ${signer.role} on ${aDoc.document_name}`);
                      }
                    }
                    // Update PDF URL on all related signed_documents when fully signed
                    if (signedPdfUrl) {
                      await updateSignedDocPdfByAutentique(aDoc.id, signedPdfUrl);
                    }

                    // Check if ALL autentique docs for this hiring process have the company/candidate signed
                    // If so, update hiring_processes.company_signed / candidate_signed
                    const allHiringDocs = autentiqueDocuments.filter((d: any) => d.context_id === aDoc.context_id && d.template_id);
                    // Deduplicate by template_id (use most recent)
                    const latestByTemplate = new Map<string, any>();
                    for (const d of allHiringDocs) {
                      const existing = latestByTemplate.get(d.template_id);
                      if (!existing || new Date(d.created_at) > new Date(existing.created_at)) {
                        latestByTemplate.set(d.template_id, d);
                      }
                    }
                    const latestDocs = Array.from(latestByTemplate.values());

                    const allCompanySigned = latestDocs.every((d: any) => {
                      const cs = (d.signers || []).find((s: any) => s.role === 'company');
                      return !cs || cs.signed_at; // no company signer = not required
                    });
                    const allCandidateSigned = latestDocs.every((d: any) => {
                      const cs = (d.signers || []).find((s: any) => s.role === 'candidate');
                      return !cs || cs.signed_at;
                    });

                    const hpUpdates: any = {};
                    if (allCompanySigned) hpUpdates.company_signed = true;
                    if (allCandidateSigned) hpUpdates.candidate_signed = true;

                    // If both signed, check if payment is done → activate
                    if (allCompanySigned && allCandidateSigned) {
                      const { data: paidPayment } = await supabaseAdminAny
                        .from("payments")
                        .select("id")
                        .eq("status", "paid")
                        .limit(1);
                      // For PJ/CLT, activate if both signed (payment check is optional)
                      hpUpdates.status = "active";
                    }

                    if (Object.keys(hpUpdates).length > 0) {
                      await supabaseAdminAny
                        .from("hiring_processes")
                        .update(hpUpdates)
                        .eq("id", aDoc.context_id);
                      console.log(`[Contract] Updated hiring process ${aDoc.context_id}:`, hpUpdates);
                    }
                  }
                }

                if (newStatus === "signed") {
                  console.log(`[Contract] Autentique doc ${aDoc.document_name} marked as signed via API check`);
                }
              }
            }
          }
        } catch (err: any) {
          console.error("[Contract] Error refreshing Autentique status:", err?.message || err);
        }
      }

      const enrichedTemplates = templates.map((t: any) => {
        // Use the most recent Autentique doc for this template (last in ascending order)
        const matchingDocs = autentiqueDocuments.filter((d: any) => d.template_id === t.id);
        const autentiqueDoc = matchingDocs.length > 0 ? matchingDocs[matchingDocs.length - 1] : null;
        // Find the company signer's sign URL (field may be signUrl or sign_url depending on how it was stored)
        const companySigner = autentiqueDoc?.signers?.find((s: any) => s.role === 'company');
        const signUrl = companySigner?.signUrl || companySigner?.sign_url || null;
        const companyHasSigned = !!companySigner?.signed_at;
        return {
          ...t,
          isSigned: signedTemplateIds.has(t.id) || autentiqueDoc?.status === "signed" || companyHasSigned,
          autentiqueStatus: companyHasSigned ? "signed" : (autentiqueDoc?.status || null),
          autentiqueSignUrl: signUrl,
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
      category: z.enum(['contrato_inicial', 'clt', 'estagio', 'menor_aprendiz', 'pj']),
      companyData: z.object({
        legalName: z.string().optional(),
        businessName: z.string().optional(),
        cnpj: z.string().optional(),
        contactPerson: z.string().optional(),
        contactCpf: z.string().optional(),
        phone: z.string().optional(),
        landlinePhone: z.string().optional(),
        email: z.string().optional(),
        website: z.string().optional(),
        employeeCount: z.string().optional(),
        cep: z.string().optional(),
        address: z.string().optional(),
        complement: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        jobTitle: z.string().optional(),
        compensation: z.string().optional(),
        employmentType: z.string().optional(),
      }).optional(),
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
      const { supabaseAdmin: _sb2 } = await import("../supabase");
      const supabaseAdmin2 = _sb2 as any;

      // Check if Autentique docs already exist for this context
      const existingDocs = await db.getAutentiqueDocumentsByContext("onboarding_contract", contextId);
      if (existingDocs.length > 0) {
        return { created: false, reason: "already_exist" };
      }

      // Also check outreach_contract context (admin may have already sent contract)
      if (input.category === "contrato_inicial") {
        const { data: meetings } = await supabaseAdmin2
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

      const signerEmail: any = ctx.user.email;
      const signerName = company?.contact_name || company?.name || ctx.user.name || "Representante";
      let count = 0;

      for (const template of templates) {
        try {
          const fileResponse = await fetch(template.file_url);
          if (!fileResponse.ok) continue;
          const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());

          // Determine if template is DOCX (needs filling + conversion) or PDF (send as-is)
          const isDocx = template.file_url?.toLowerCase().includes('.docx') ||
            template.file_key?.toLowerCase().endsWith('.docx');

          let pdfBuffer: Buffer;

          if (isDocx && input.companyData) {
            // Fill DOCX placeholders with company data, then convert to PDF
            try {
              const { fillDocxTemplate, buildTemplateData } = await import("../lib/fillDocxTemplate");
              const templateData = buildTemplateData(input.companyData);
              console.log(`[Contract] Filling DOCX template "${template.name}" with ${Object.keys(templateData).length} fields`);
              pdfBuffer = await fillDocxTemplate(fileBuffer, templateData);
              console.log(`[Contract] DOCX filled and converted to PDF: ${pdfBuffer.length} bytes`);
            } catch (fillErr: any) {
              console.error(`[Contract] Failed to fill DOCX template "${template.name}":`, fillErr?.message);
              continue;  // Skip this template, don't send raw DOCX to Autentique
            }
          } else if (isDocx && !input.companyData) {
            console.warn(`[Contract] DOCX template "${template.name}" but no companyData provided, skipping fill`);
            pdfBuffer = fileBuffer;
          } else {
            pdfBuffer = fileBuffer;
          }

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

        // Get documents from signed_documents table
        const signedDocs = await db.getSignedDocuments({ companyId: company.id, ...input });

        // Also get contracts uploaded by agency to scheduled_meetings
        const { supabaseAdmin: _sb3 } = await import("../supabase");
        const supabaseAdmin3 = _sb3 as any;
        const { data: meetingContracts, error: meetingError } = await supabaseAdmin3
          .from('scheduled_meetings')
          .select('id, contract_pdf_url, contract_signed_at, company_name, updated_at')
          .eq('company_id', company.id)
          .not('contract_pdf_url', 'is', null)
          .order('contract_signed_at', { ascending: false })
          .limit(100);

        if (meetingError) {
          console.error('[Contract] Error fetching meeting contracts:', meetingError);
          return signedDocs;
        }

        // Normalize meeting contracts to match signed_documents shape
        const normalizedMeetingDocs = (meetingContracts ?? []).map((m: any) => ({
          id: `meeting-${m.id}`,
          category: 'contrato_inicial',
          signed_at: m.contract_signed_at || m.updated_at,
          signer_name: m.company_name || 'Empresa',
          signer_cpf: '',
          signed_pdf_url: m.contract_pdf_url,
          template: { name: 'Contrato Assinado', file_url: m.contract_pdf_url, category: 'contrato_inicial' },
        }));

        // Also check Supabase Storage for contracts uploaded during onboarding
        let storageContracts: any[] = [];
        try {
          const storagePath = `contracts/signed/company-${company.id}`;
          const { data: storageFiles } = await supabaseAdmin3.storage.from('contracts').list(storagePath, { limit: 20 });
          if (storageFiles && storageFiles.length > 0) {
            // Filter out files already in signedDocs or meetingContracts
            const existingUrls = new Set([
              ...signedDocs.map((d: any) => d.signed_pdf_url),
              ...normalizedMeetingDocs.map((d: any) => d.signed_pdf_url),
            ].filter(Boolean));

            for (const file of storageFiles) {
              const { data: urlData } = supabaseAdmin3.storage.from('contracts').getPublicUrl(`${storagePath}/${file.name}`);
              if (urlData?.publicUrl && !existingUrls.has(urlData.publicUrl)) {
                storageContracts.push({
                  id: `storage-${file.id}`,
                  category: 'contrato_inicial',
                  signed_at: file.created_at || company.contract_signed_at,
                  signer_name: company.contract_signer_name || company.company_name,
                  signer_cpf: company.contract_signer_cpf || '',
                  signed_pdf_url: urlData.publicUrl,
                  template: { name: file.name.replace(/^\d+-/, '').replace(/\.[^.]+$/, ''), file_url: urlData.publicUrl, category: 'contrato_inicial' },
                });
              }
            }
          }
        } catch (err) {
          console.error('[Contract] Error checking storage contracts:', err);
        }

        return [...signedDocs, ...normalizedMeetingDocs, ...storageContracts];
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
      category: z.enum(['contrato_inicial', 'clt', 'estagio', 'menor_aprendiz', 'pj']),
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

      let templates: any[];

      // Check if specific documents were assigned to this hiring process
      const { supabaseAdmin: _sb2 } = await import("../supabase");
      const sbAdmin2 = _sb2 as any;
      const { data: assigned } = await sbAdmin2
        .from('hiring_process_documents')
        .select('template:agency_document_templates(*)')
        .eq('hiring_process_id', input.hiringProcessId)
        .in('target', ['candidate', 'both']);

      if (assigned && assigned.length > 0) {
        templates = assigned.map((a: any) => a.template).filter(Boolean);
      } else {
        // Fallback: all templates of matching category
        templates = await db.getDocumentTemplates(agencyId, category);
      }

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

      // Check for Autentique documents for this hiring process
      let autentiqueDocuments: any[] = [];
      try {
        const autentiqueDocs = await db.getAutentiqueDocumentsByContext("hiring_contract", input.hiringProcessId);
        autentiqueDocuments.push(...autentiqueDocs);
      } catch (err: any) {
        console.error("[Contract] Error looking up candidate Autentique docs:", err?.message || err);
      }

      const enrichedTemplates = templates.map((t: any) => {
        const matchingDocs = autentiqueDocuments.filter((d: any) => d.template_id === t.id);
        const autentiqueDoc = matchingDocs.length > 0 ? matchingDocs[matchingDocs.length - 1] : null;
        const candidateSigner = autentiqueDoc?.signers?.find((s: any) => s.role === 'candidate');
        const signUrl = candidateSigner?.signUrl || candidateSigner?.sign_url || null;
        const candidateHasSigned = !!candidateSigner?.signed_at;
        return {
          ...t,
          isSigned: signedTemplateIds.has(t.id) || autentiqueDoc?.status === "signed" || candidateHasSigned,
          autentiqueStatus: candidateHasSigned ? "signed" : (autentiqueDoc?.status || null),
          autentiqueSignUrl: signUrl,
        };
      });

      const totalSigned = enrichedTemplates.filter((t: any) => t.isSigned).length;

      return {
        templates: enrichedTemplates,
        total: templates.length,
        signedCount: totalSigned,
        allSigned: templates.length === 0 || totalSigned >= templates.length,
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

        // Check if all signatures are now complete → activate for CLT/PJ
        const sigStatus = await hiringDb.checkAllSignaturesComplete(input.hiringProcessId);
        if (sigStatus.complete && (hp.hiring_type === "clt" || hp.hiring_type === "pj")) {
          await hiringDb.updateHiringProcess(input.hiringProcessId, { status: "active" });
        }
      }

      return {
        success: true,
        signedDocumentId: result.id,
        remainingUnsigned: status.total - status.signed,
        allSigned: status.allSigned,
      };
    }),
});
