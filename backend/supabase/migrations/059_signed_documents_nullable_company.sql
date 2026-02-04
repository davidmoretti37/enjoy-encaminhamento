-- Migration 059: Allow signing documents during onboarding (before company record exists)
-- Make company_id nullable and add signer_user_id for tracking

ALTER TABLE public.signed_documents ALTER COLUMN company_id DROP NOT NULL;

ALTER TABLE public.signed_documents
  ADD COLUMN IF NOT EXISTS signer_user_id UUID REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS idx_signed_docs_user ON signed_documents(signer_user_id);

-- Update RLS: allow users to insert/view their own signed docs (even without a company)
CREATE POLICY "Users can insert own signed docs"
  ON public.signed_documents FOR INSERT
  WITH CHECK (signer_user_id = auth.uid());

CREATE POLICY "Users can view own signed docs"
  ON public.signed_documents FOR SELECT
  USING (signer_user_id = auth.uid());
