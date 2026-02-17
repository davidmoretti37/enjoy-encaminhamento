-- Migration 070: Company Interview Scheduling & Candidate Card Support
-- Supports the new flow where agency schedules company-candidate interviews
-- and sends rich candidate cards to the company

-- 1. Add interview_stage to interview_sessions
-- 'pre_selection' = agency pre-selection meeting with candidates
-- 'company_interview' = scheduled interview between company and candidate
ALTER TABLE interview_sessions
  ADD COLUMN IF NOT EXISTS interview_stage VARCHAR(20) DEFAULT 'pre_selection'
    CHECK (interview_stage IN ('pre_selection', 'company_interview'));

-- 2. Add interview preference columns to jobs table
-- Company sets their preferred interview format when creating/viewing the job
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS preferred_interview_type VARCHAR(20)
    CHECK (preferred_interview_type IN ('online', 'in_person')),
  ADD COLUMN IF NOT EXISTS interview_location_address TEXT,
  ADD COLUMN IF NOT EXISTS interview_location_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS interview_location_state VARCHAR(2);

-- 3. Update candidate_batches status constraint to include 'interview_scheduled'
-- This represents the state after agency has scheduled company-candidate interviews
ALTER TABLE candidate_batches
  DROP CONSTRAINT IF EXISTS candidate_batches_status_check;

-- Re-add with the new status option
DO $$
BEGIN
  -- Only add constraint if not exists (safe re-run)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidate_batches_status_check'
  ) THEN
    ALTER TABLE candidate_batches
      ADD CONSTRAINT candidate_batches_status_check
      CHECK (status IN (
        'draft', 'sent', 'forwarded', 'unlocked',
        'meeting_scheduled', 'interview_scheduled',
        'completed', 'cancelled'
      ));
  END IF;
END $$;

COMMENT ON COLUMN interview_sessions.interview_stage IS 'pre_selection = agency meeting with candidates; company_interview = scheduled interview between company and candidate';
COMMENT ON COLUMN jobs.preferred_interview_type IS 'Company preference for interview format (online or in_person)';
