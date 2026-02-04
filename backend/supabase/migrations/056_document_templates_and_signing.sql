-- ============================================
-- Document Templates & Signing System
-- Supports 4 categories per agency:
--   contrato_inicial, clt, estagio, menor_aprendiz
-- ============================================

-- Agency document templates (uploaded by agencies)
CREATE TABLE public.agency_document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('contrato_inicial', 'clt', 'estagio', 'menor_aprendiz')),
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_key TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agency_doc_templates_agency ON agency_document_templates(agency_id, category);

-- Signed documents (when a company signs a template)
CREATE TABLE public.signed_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES public.agency_document_templates(id),
  agency_id UUID NOT NULL REFERENCES public.agencies(id),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  category TEXT NOT NULL,
  -- Hiring context (only for clt/estagio/menor_aprendiz)
  contract_id UUID REFERENCES public.contracts(id),
  candidate_id UUID REFERENCES public.candidates(id),
  -- Signature data
  signer_name TEXT NOT NULL,
  signer_cpf TEXT NOT NULL,
  signature TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signed_docs_company ON signed_documents(company_id, category);
CREATE INDEX idx_signed_docs_agency ON signed_documents(agency_id, company_id);
CREATE INDEX idx_signed_docs_contract ON signed_documents(contract_id);
CREATE INDEX idx_signed_docs_template ON signed_documents(template_id);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.agency_document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signed_documents ENABLE ROW LEVEL SECURITY;

-- Agency document templates: agencies see their own, admins see all
CREATE POLICY "Agencies can view own templates"
  ON public.agency_document_templates FOR SELECT
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Agencies can insert own templates"
  ON public.agency_document_templates FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT id FROM public.agencies WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Agencies can delete own templates"
  ON public.agency_document_templates FOR DELETE
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Agencies can update own templates"
  ON public.agency_document_templates FOR UPDATE
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Companies can view templates from their agency (for signing flow)
CREATE POLICY "Companies can view agency templates"
  ON public.agency_document_templates FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM public.companies WHERE user_id = auth.uid()
    )
  );

-- Signed documents: companies see their own, agencies see their companies', admins see all
CREATE POLICY "Companies can view own signed docs"
  ON public.signed_documents FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Companies can insert own signed docs"
  ON public.signed_documents FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT id FROM public.companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Agencies can view signed docs for their companies"
  ON public.signed_documents FOR SELECT
  USING (
    agency_id IN (
      SELECT id FROM public.agencies WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
