-- Migration: Fix scheduled_meetings missing columns
-- Description: Add columns that may be missing from the table

-- Add updated_at column if it doesn't exist
ALTER TABLE scheduled_meetings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add cancellation columns if they don't exist
ALTER TABLE scheduled_meetings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE scheduled_meetings ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE scheduled_meetings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add reminder columns if they don't exist
ALTER TABLE scheduled_meetings ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;
ALTER TABLE scheduled_meetings ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Ensure the trigger exists (recreate if needed)
DROP TRIGGER IF EXISTS update_scheduled_meetings_updated_at ON scheduled_meetings;

CREATE TRIGGER update_scheduled_meetings_updated_at
  BEFORE UPDATE ON scheduled_meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
