-- Add missing columns for candidate DISC/PDP assessments and AI summary
-- These columns are needed to store onboarding assessment results

-- AI-generated summary
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS summary_generated_at TIMESTAMPTZ;

-- DISC assessment scores
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS disc_dominante INTEGER;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS disc_influente INTEGER;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS disc_estavel INTEGER;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS disc_conforme INTEGER;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS disc_completed_at TIMESTAMPTZ;

-- PDP assessment results
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS pdp_competencies JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS pdp_intrapersonal JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS pdp_interpersonal JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS pdp_skills JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS pdp_completed_at TIMESTAMPTZ;
