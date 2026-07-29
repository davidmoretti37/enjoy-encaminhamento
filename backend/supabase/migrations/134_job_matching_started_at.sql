-- 134: Record when a search STARTS, not just when it finishes.
--
-- WHY
-- Search progress lives in a Map in process memory (services/matching/progress.ts)
-- and the pipeline runs inline inside the tRPC mutation. On Vercel that means:
--
--   * reload the page mid-search and the browser's new poll may land on a
--     different instance, which has no memory of the run;
--   * navigate away and the run is orphaned with nothing recording that it
--     ever started.
--
-- Either way getMatchingProgress fell back to "not_started" and the panel told
-- the operator the vaga had never been searched — while a search was running.
-- She then clicks Buscar again, paying for a second full pipeline run.
--
-- A start timestamp on the row survives both. A run is considered in flight when
-- matching_started_at is newer than last_matched_at and younger than the stale
-- window; past that it is presumed dead and the normal saved-state logic applies,
-- so a crashed run can never wedge the UI in "searching" forever.

BEGIN;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS matching_started_at timestamptz;

COMMENT ON COLUMN jobs.matching_started_at IS
  'When an AI candidate search was last STARTED for this job. Compared against '
  'last_matched_at to detect a run still in flight across serverless instances. '
  'Treated as stale (dead run) after MATCHING_STALE_MINUTES.';

COMMIT;
