-- Add scheduling preference columns to jobs table
-- Companies can specify preferred days, time range, and notes for the agency

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS preferred_days TEXT[],
  ADD COLUMN IF NOT EXISTS preferred_time_start TIME,
  ADD COLUMN IF NOT EXISTS preferred_time_end TIME,
  ADD COLUMN IF NOT EXISTS scheduling_notes TEXT;
