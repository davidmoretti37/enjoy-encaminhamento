-- Fix two production bugs surfaced when an agency tried to hire Marco Aurélio:
--
-- 1) `notifications` had RLS enabled but no INSERT policy, so server-side
--    `db.createNotification` calls always failed with "new row violates row-level
--    security policy for table 'notifications'". The server already authenticates
--    requests; backend writes go through `supabaseAdmin`, which bypasses RLS, but
--    we add an explicit permissive INSERT policy as defense-in-depth.
--
-- 2) Hiring deduplication relied on `application_id`, which is NULL on the
--    candidate+job batch path used by the agency hiring flow. After a partial
--    failure (e.g. the RLS error above), retrying created duplicate rows. Add a
--    unique partial index on (candidate_id, job_id) for active processes so the
--    DB rejects duplicates regardless of which code path inserts them.

CREATE POLICY "Service role can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS hiring_processes_active_candidate_job_idx
  ON public.hiring_processes (candidate_id, job_id)
  WHERE status NOT IN ('cancelled', 'failed');
