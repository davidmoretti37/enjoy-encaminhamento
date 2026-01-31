-- ============================================
-- ADVANCED AI MATCHING SYSTEM SCHEMA
-- Migration: 047_advanced_matching_schema.sql
-- ============================================

-- ============================================
-- 1. JOB MATCHING CONFIGURATION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.job_matching_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,

  -- Weight profile selection
  weight_profile VARCHAR(50) DEFAULT 'balanced',
  custom_weights JSONB DEFAULT NULL,

  -- LLM re-ranking settings
  enable_llm_reranking BOOLEAN DEFAULT true,
  llm_rerank_threshold NUMERIC(5,2) DEFAULT 60,
  llm_rerank_limit INTEGER DEFAULT 50,

  -- Vector retrieval settings
  vector_recall_limit INTEGER DEFAULT 500,
  vector_threshold NUMERIC(5,2) DEFAULT 0.2,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(job_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_job_matching_config_job ON public.job_matching_config(job_id);

-- ============================================
-- 2. ENHANCED JOB MATCHES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.job_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,

  -- Composite score (final ranking score)
  composite_score NUMERIC(5,2),

  -- Individual factor scores (0-100)
  semantic_score NUMERIC(5,2),
  skills_score NUMERIC(5,2),
  location_score NUMERIC(5,2),
  education_score NUMERIC(5,2),
  experience_score NUMERIC(5,2),
  contract_score NUMERIC(5,2),
  personality_score NUMERIC(5,2),
  history_score NUMERIC(5,2),
  bidirectional_score NUMERIC(5,2),

  -- Weight profile used for this match
  weight_profile VARCHAR(50) DEFAULT 'balanced',

  -- LLM re-ranking results
  llm_refined_score NUMERIC(5,2),
  llm_confidence NUMERIC(5,2),
  llm_reasoning TEXT,
  llm_recommendation VARCHAR(30), -- HIGHLY_RECOMMENDED, RECOMMENDED, CONSIDER, NOT_RECOMMENDED
  llm_reranked_at TIMESTAMPTZ,

  -- Explainability data
  strengths TEXT[],
  opportunities TEXT[],
  concerns TEXT[],
  explanation_summary TEXT,

  -- Data quality indicators
  data_completeness NUMERIC(5,2),
  algorithm_version VARCHAR(20) DEFAULT 'v2.0',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate job-candidate pairs
  UNIQUE(job_id, candidate_id)
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_job_matches_job_composite ON public.job_matches(job_id, composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_job_matches_job_llm ON public.job_matches(job_id, llm_refined_score DESC) WHERE llm_refined_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_matches_candidate ON public.job_matches(candidate_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_created ON public.job_matches(created_at DESC);

-- ============================================
-- 3. SKILL TAXONOMY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.skill_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name VARCHAR(100) NOT NULL,
  skill_normalized VARCHAR(100) NOT NULL,
  skill_category VARCHAR(50),
  related_skills TEXT[],
  parent_skill VARCHAR(100),
  synonyms TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(skill_normalized)
);

-- Index for skill lookups
CREATE INDEX IF NOT EXISTS idx_skill_taxonomy_normalized ON public.skill_taxonomy(skill_normalized);
CREATE INDEX IF NOT EXISTS idx_skill_taxonomy_category ON public.skill_taxonomy(skill_category);
CREATE INDEX IF NOT EXISTS idx_skill_taxonomy_related ON public.skill_taxonomy USING GIN(related_skills);

-- ============================================
-- 4. CANDIDATE PREFERENCES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.candidate_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,

  -- Salary preferences
  min_salary NUMERIC(10,2),
  max_salary NUMERIC(10,2),
  salary_negotiable BOOLEAN DEFAULT true,

  -- Location preferences
  preferred_cities TEXT[],
  preferred_states TEXT[],
  max_commute_minutes INTEGER,
  willing_to_relocate BOOLEAN DEFAULT false,

  -- Work style preferences
  preferred_company_sizes TEXT[], -- 'startup', 'small', 'medium', 'large'
  preferred_industries TEXT[],

  -- Schedule preferences
  preferred_hours_per_week INTEGER,
  flexible_schedule_required BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(candidate_id)
);

-- Index for candidate lookups
CREATE INDEX IF NOT EXISTS idx_candidate_preferences_candidate ON public.candidate_preferences(candidate_id);

-- ============================================
-- 5. UPDATED VECTOR SEARCH FUNCTION
-- Low threshold for broad recall (Stage 1)
-- ============================================

CREATE OR REPLACE FUNCTION match_candidates_broad(
  job_id_input UUID,
  match_threshold FLOAT DEFAULT 0.2,
  match_count INT DEFAULT 500
)
RETURNS TABLE (
  candidate_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  education_level TEXT,
  skills JSONB,
  languages JSONB,
  experience JSONB,
  summary TEXT,
  disc_dominante NUMERIC,
  disc_influente NUMERIC,
  disc_estavel NUMERIC,
  disc_conforme NUMERIC,
  pdp_top10_competencies JSONB,
  available_for_internship BOOLEAN,
  available_for_clt BOOLEAN,
  available_for_apprentice BOOLEAN,
  preferred_work_type TEXT,
  semantic_similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as candidate_id,
    c.full_name,
    c.email,
    c.phone,
    c.city,
    c.state,
    c.education_level::TEXT,
    c.skills::JSONB,
    c.languages::JSONB,
    c.experience::JSONB,
    c.summary,
    c.disc_dominante,
    c.disc_influente,
    c.disc_estavel,
    c.disc_conforme,
    c.pdp_top10_competencies::JSONB,
    c.available_for_internship,
    c.available_for_clt,
    c.available_for_apprentice,
    c.preferred_work_type::TEXT,
    1 - (c.embedding <=> j.embedding) as semantic_similarity
  FROM candidates c, jobs j
  WHERE j.id = job_id_input
    AND c.embedding IS NOT NULL
    AND j.embedding IS NOT NULL
    AND c.status = 'active'
    AND 1 - (c.embedding <=> j.embedding) >= match_threshold
  ORDER BY c.embedding <=> j.embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- 6. SEED INITIAL SKILL TAXONOMY DATA
-- Common Brazilian tech/business skills
-- ============================================

INSERT INTO public.skill_taxonomy (skill_name, skill_normalized, skill_category, related_skills, synonyms) VALUES
-- Programming Languages
('JavaScript', 'javascript', 'programming', ARRAY['typescript', 'nodejs', 'react', 'vue', 'angular'], ARRAY['js', 'ecmascript']),
('TypeScript', 'typescript', 'programming', ARRAY['javascript', 'nodejs', 'react', 'angular'], ARRAY['ts']),
('Python', 'python', 'programming', ARRAY['django', 'flask', 'fastapi', 'machine-learning'], ARRAY['py']),
('Java', 'java', 'programming', ARRAY['spring', 'maven', 'gradle', 'kotlin'], NULL),
('C#', 'csharp', 'programming', ARRAY['dotnet', 'aspnet', 'unity'], ARRAY['c-sharp', '.net']),
('PHP', 'php', 'programming', ARRAY['laravel', 'wordpress', 'symfony'], NULL),
('SQL', 'sql', 'database', ARRAY['mysql', 'postgresql', 'sqlserver', 'oracle'], ARRAY['banco-de-dados']),

-- Frontend
('React', 'react', 'frontend', ARRAY['javascript', 'typescript', 'redux', 'nextjs'], ARRAY['reactjs', 'react.js']),
('Vue.js', 'vue', 'frontend', ARRAY['javascript', 'typescript', 'nuxt'], ARRAY['vuejs', 'vue.js']),
('Angular', 'angular', 'frontend', ARRAY['typescript', 'rxjs'], ARRAY['angularjs']),
('HTML', 'html', 'frontend', ARRAY['css', 'javascript'], ARRAY['html5']),
('CSS', 'css', 'frontend', ARRAY['html', 'sass', 'tailwind'], ARRAY['css3', 'estilos']),

-- Backend/DevOps
('Node.js', 'nodejs', 'backend', ARRAY['javascript', 'typescript', 'express'], ARRAY['node', 'node.js']),
('Docker', 'docker', 'devops', ARRAY['kubernetes', 'linux', 'ci-cd'], ARRAY['containers']),
('AWS', 'aws', 'cloud', ARRAY['azure', 'gcp', 'devops'], ARRAY['amazon-web-services']),
('Git', 'git', 'tools', ARRAY['github', 'gitlab', 'bitbucket'], ARRAY['controle-versao']),

-- Office/Business
('Excel', 'excel', 'office', ARRAY['google-sheets', 'office'], ARRAY['microsoft-excel', 'planilhas']),
('Word', 'word', 'office', ARRAY['google-docs', 'office'], ARRAY['microsoft-word']),
('PowerPoint', 'powerpoint', 'office', ARRAY['google-slides', 'office'], ARRAY['microsoft-powerpoint', 'apresentacoes']),
('Pacote Office', 'pacote-office', 'office', ARRAY['excel', 'word', 'powerpoint'], ARRAY['microsoft-office', 'office-365']),
('Google Workspace', 'google-workspace', 'office', ARRAY['google-sheets', 'google-docs'], ARRAY['gsuite', 'g-suite']),

-- Soft Skills
('Comunicação', 'comunicacao', 'soft-skill', ARRAY['apresentacao', 'negociacao', 'atendimento'], ARRAY['communication']),
('Trabalho em Equipe', 'trabalho-equipe', 'soft-skill', ARRAY['colaboracao', 'lideranca'], ARRAY['teamwork', 'equipe']),
('Liderança', 'lideranca', 'soft-skill', ARRAY['gestao', 'trabalho-equipe'], ARRAY['leadership']),
('Organização', 'organizacao', 'soft-skill', ARRAY['planejamento', 'gestao-tempo'], ARRAY['organization']),
('Proatividade', 'proatividade', 'soft-skill', ARRAY['iniciativa', 'autonomia'], ARRAY['proactive']),

-- Customer Service
('Atendimento ao Cliente', 'atendimento-cliente', 'customer-service', ARRAY['comunicacao', 'vendas'], ARRAY['customer-service', 'suporte']),
('Vendas', 'vendas', 'sales', ARRAY['negociacao', 'atendimento-cliente'], ARRAY['sales', 'comercial']),
('SAC', 'sac', 'customer-service', ARRAY['atendimento-cliente', 'comunicacao'], ARRAY['servico-atendimento'])

ON CONFLICT (skill_normalized) DO NOTHING;

-- ============================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE public.job_matching_config IS 'Configuration for advanced AI matching per job';
COMMENT ON TABLE public.job_matches IS 'Stored results from advanced AI matching pipeline with full explainability';
COMMENT ON TABLE public.skill_taxonomy IS 'Skill hierarchy and relationships for partial matching';
COMMENT ON TABLE public.candidate_preferences IS 'Candidate job preferences for bidirectional matching';

COMMENT ON COLUMN public.job_matches.composite_score IS 'Final weighted score from all factors (0-100)';
COMMENT ON COLUMN public.job_matches.semantic_score IS 'Vector embedding similarity score (0-100)';
COMMENT ON COLUMN public.job_matches.llm_refined_score IS 'Score after LLM re-ranking analysis (0-100)';
COMMENT ON COLUMN public.job_matches.data_completeness IS 'Percentage of available candidate data (0-100)';
