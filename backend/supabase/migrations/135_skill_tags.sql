-- 135: Canonical skill tags, derived, alongside the human text.
--
-- WHY
-- scoreSkills() compares whole free-text entries for equality. Both sides are
-- typed by humans, so it essentially never matched: the average skills score on
-- a live matching run was 1.5 out of 100. That dragged every composite below the
-- LLM re-ranking threshold of 65, which is why the LLM stage has never once run
-- in production.
--
-- These columns hold the canonical tags derived by services/matching/skillTags.ts
-- ("comunicacao", "atendimento-ao-cliente", ...). They are DERIVED, never typed:
--   * candidates.skills and jobs.required_skills keep the original wording, which
--     is what candidates and the agency actually see and edit;
--   * skill_tags is what the matcher compares.
-- Nothing is destroyed, and a bad extraction is fixed by re-running the backfill
-- rather than by restoring data.

BEGIN;

ALTER TABLE jobs       ADD COLUMN IF NOT EXISTS skill_tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS skill_tags jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN jobs.skill_tags IS
  'Canonical skill tags derived from required_skills by skillTags.ts. Derived, not '
  'user-editable. Matching compares these; required_skills keeps the human wording.';
COMMENT ON COLUMN candidates.skill_tags IS
  'Canonical skill tags derived from skills by skillTags.ts. Derived, not '
  'user-editable. Matching compares these; skills keeps the human wording.';

-- The scorer loads whole candidate rows, but containment lookups (find everyone
-- with a tag) are worth indexing for future filtering.
CREATE INDEX IF NOT EXISTS idx_candidates_skill_tags ON candidates USING gin (skill_tags);
CREATE INDEX IF NOT EXISTS idx_jobs_skill_tags       ON jobs       USING gin (skill_tags);

COMMIT;
