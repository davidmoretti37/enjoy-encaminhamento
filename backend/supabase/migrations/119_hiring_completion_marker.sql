-- Hiring completion marker: an atomic, path-independent idempotency key for the
-- one-time completion side-effects (candidate/company notification + email, and
-- estágio recurring billing).
--
-- WHY: the BEFORE-UPDATE trigger check_hiring_signatures_complete auto-advances
-- hiring_processes.status on the FINAL signature (estágio -> active, CLT/PJ ->
-- pending_payment) BEFORE any completion hook runs. So gating the completion
-- side-effects on status === 'pending_signatures' is unreliable (the webhook path
-- always saw an already-advanced status and did nothing → estágio hires completed
-- via Autentique were never billed). And hiring_processes.contract_id is never
-- populated, so it can't be used as the billing idempotency key either.
--
-- This column is set exactly once via a compare-and-set
--   UPDATE hiring_processes SET completion_processed_at = now()
--   WHERE id = $1 AND completion_processed_at IS NULL RETURNING id
-- Whichever caller (the Autentique webhook OR the in-app signing path) wins the
-- CAS runs the side-effects; the loser skips. This makes completion exactly-once
-- across both independent processes, independent of status/trigger timing.

ALTER TABLE hiring_processes
  ADD COLUMN IF NOT EXISTS completion_processed_at timestamptz;

COMMENT ON COLUMN hiring_processes.completion_processed_at IS
  'Set once (compare-and-set) by whichever path completes the hire; gates one-time completion side-effects (notify + estágio billing) so webhook and in-app cannot double-fire or miss.';

-- Backfill already-terminal hires so we do NOT retroactively fire notifications /
-- billing for hires that completed before this marker existed. Any hire already
-- active/pending_payment/paid/completed is treated as already-processed.
UPDATE hiring_processes
   SET completion_processed_at = COALESCE(updated_at, created_at, now())
 WHERE completion_processed_at IS NULL
   AND status IN ('active', 'pending_payment', 'paid', 'completed');
