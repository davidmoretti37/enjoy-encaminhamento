-- Link specific contract templates to hiring processes
-- Agency selects which documents to send to company/candidate
CREATE TABLE IF NOT EXISTS public.hiring_process_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hiring_process_id UUID NOT NULL REFERENCES public.hiring_processes(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.agency_document_templates(id) ON DELETE CASCADE,
  target TEXT NOT NULL CHECK (target IN ('company', 'candidate', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hiring_process_id, template_id)
);

-- RLS
ALTER TABLE public.hiring_process_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on hiring_process_documents"
  ON public.hiring_process_documents FOR ALL
  USING (true) WITH CHECK (true);
