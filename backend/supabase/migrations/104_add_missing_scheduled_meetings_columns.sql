-- Add missing columns to scheduled_meetings that exist in types but not in DB
ALTER TABLE scheduled_meetings
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT 'intro_call';
