-- 133: Record WHEN a vaga was last searched, independently of the result count.
--
-- WHY
-- The UI decided "has this job been searched?" by counting rows in job_matches.
-- That conflates two very different states:
--
--   * never searched            -> 0 rows
--   * searched, found nobody    -> 0 rows
--
-- Both rendered identically, and because the old MatchingStatusCard treated
-- `not_started` as "running", every unsearched vaga showed a permanent
-- "Buscando candidatos..." animation. 25 of 32 active vagas were in that state.
--
-- A timestamp on the job separates the two, survives an empty result, and gives
-- the operator the one fact she actually asked for: whether the search already
-- ran, and when.
--
-- CARRY-OVER: the backfill below seeds last_matched_at from existing job_matches
-- rows, so the 7 vagas that were already searched keep showing their results as
-- "already searched" instead of resetting to "never searched".

BEGIN;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_matched_at timestamptz;

COMMENT ON COLUMN jobs.last_matched_at IS
  'When the AI candidate search last completed for this job. NULL = never searched. '
  'Set by saveMatchResults(); distinct from "found zero candidates", which is a '
  'non-null timestamp with no job_matches rows.';

-- Backfill from work already done. created_at is when the match row was first
-- written; updated_at moves on re-search, so take the max of both.
UPDATE jobs j
SET last_matched_at = sub.last_run
FROM (
  SELECT job_id, GREATEST(MAX(created_at), MAX(updated_at)) AS last_run
  FROM job_matches
  GROUP BY job_id
) sub
WHERE j.id = sub.job_id
  AND j.last_matched_at IS NULL;

-- getMatchingProgress reads this per job on every poll.
CREATE INDEX IF NOT EXISTS idx_jobs_last_matched_at
  ON jobs (last_matched_at)
  WHERE last_matched_at IS NOT NULL;

COMMIT;
