-- 129: Make document/contract types DATA instead of hardcoded enums.
--
-- WHY
-- The four categories mom sees in "Documentos da agência" (Contrato Inicial,
-- CLT, Estágio, Jovem Aprendiz) are hardcoded in EIGHT places, including a DB
-- CHECK constraint. Adding one of the ~16 contract/term types she actually uses
-- meant a migration AND a full deploy every time. She asked for exactly this:
-- "serão vários tipos de contratos... vamos ter que adicionar mais campos".
--
-- Also fixes a live inconsistency: backend/routers/contract.ts accepts a 'pj'
-- category (migration 106 added hiring_type='pj'), but the CHECK constraint
-- rejects it — so a PJ / prestação-de-serviço template could never be uploaded.
--
-- SCOPE: per-agency (David's call). Each branch owns its own catalogue, so
-- Ipatinga and Uberlândia can differ. Seeded identically for both.
--
-- `contrato_inicial` is load-bearing — backend/routers/contract.ts special-cases
-- it for company onboarding (:171, :413, :571, :660). Its key MUST NOT change.

BEGIN;

CREATE TABLE IF NOT EXISTS public.document_types (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id          uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  key                text NOT NULL,
  label              text NOT NULL,
  description        text,
  sort_order         integer NOT NULL DEFAULT 0,
  requires_signature boolean NOT NULL DEFAULT true,
  is_active          boolean NOT NULL DEFAULT true,
  is_system          boolean NOT NULL DEFAULT false,  -- referenced by code; not deletable
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_document_types_agency_key
  ON public.document_types (agency_id, key);
CREATE INDEX IF NOT EXISTS idx_document_types_agency
  ON public.document_types (agency_id, is_active, sort_order);

-- Service-role only. The frontend never queries Supabase tables directly
-- (0 `supabase.from(` calls in frontend/src), so RLS on with no policy means
-- anon/authenticated read nothing.
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

-- Seed every existing agency with the catalogue from ANEC's reference PDF.
-- `is_system = true` marks the four keys the application code branches on plus
-- 'pj', so the UI can stop mom deleting something the code depends on.
INSERT INTO public.document_types
  (agency_id, key, label, description, sort_order, requires_signature, is_system)
SELECT a.id, t.key, t.label, t.description, t.sort_order, t.requires_signature, t.is_system
FROM   public.agencies a
CROSS JOIN (VALUES
  -- Existing four — keys preserved exactly.
  ('contrato_inicial',            'Contrato Inicial',                                   'Documentos assinados pela empresa durante o onboarding', 10, true,  true),
  ('clt',                         'CLT',                                                'Documentos para contratação CLT',                        20, true,  true),
  ('estagio',                     'Estágio',                                            'Documentos para contratação de estagiários',             30, true,  true),
  ('menor_aprendiz',              'Jovem Aprendiz',                                     'Documentos para contratação de jovens aprendizes',       40, true,  true),
  -- Accepted by contract.ts but previously blocked by the CHECK constraint.
  ('pj',                          'PJ / Prestação de Serviço',                          'Contratos de prestação de serviço (PJ)',                 50, true,  true),
  -- Contract variants from the reference PDF.
  ('clt_estagio_remunerado',      'CLT / Estágio Remunerado',                           NULL,                                                     60, true,  false),
  ('clt_estagio_gratuito',        'CLT / Estágio Gratuito',                             NULL,                                                     70, true,  false),
  ('estagio_gratuito',            'Estágio Gratuito',                                   NULL,                                                     80, true,  false),
  ('estagio_remunerado',          'Estágio Remunerado',                                 NULL,                                                     90, true,  false),
  ('estagio_empresa_estagiario',  'Estágio — Empresa e Estagiário',                      NULL,                                                    100, true,  false),
  -- Sent on every interview; informational, not signed.
  ('carta_encaminhamento',        'Carta de Encaminhamento',                            'Enviada em todas as entrevistas',                       110, false, false),
  -- Termos.
  ('termo_imagem',                'Termo de Comprometimento e Uso de Imagem',           'Enviado pós-matrícula ou antes das entrevistas',         120, true,  false),
  ('termo_pos_contratacao',       'Termo de Compromisso de Pós-Contratação',            'Enviado depois de uma contratação',                     130, true,  false),
  ('termo_ausencia',              'Termo de Ausência',                                  'Enviado em ausência sem justificativa no processo',     140, true,  false),
  ('termo_rescisao',              'Termo de Rescisão',                                  'Enviado na rescisão do termo de estágio',               150, true,  false),
  ('exclusao_encaminhamento',     'Solicitação de Exclusão Temporária de Encaminhamento', NULL,                                                  160, false, false)
) AS t(key, label, description, sort_order, requires_signature, is_system)
ON CONFLICT (agency_id, key) DO NOTHING;

-- Drop the CHECK. Validity is now enforced against document_types by the
-- application (backend/db/documentTypes.ts assertValidCategory), which is what
-- makes adding a type possible without a deploy.
ALTER TABLE public.agency_document_templates
  DROP CONSTRAINT IF EXISTS agency_document_templates_category_check;

COMMIT;
