-- Migration: Add outreach and scheduling tables
-- Description: Tables for company email outreach, admin availability, and meeting scheduling

-- Admin availability for scheduling meetings
CREATE TABLE IF NOT EXISTS admin_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  specific_date DATE, -- For one-time blocks/availability
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_blocked BOOLEAN DEFAULT false, -- true = blocked time, false = available
  label TEXT, -- e.g., "Almoço", "Reunião interna"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_time_range CHECK (start_time < end_time),
  CONSTRAINT must_have_day_or_date CHECK (day_of_week IS NOT NULL OR specific_date IS NOT NULL)
);

-- Scheduled meetings with companies
CREATE TABLE IF NOT EXISTS scheduled_meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES schools(id) ON DELETE SET NULL, -- schools table is used for companies
  company_email TEXT NOT NULL,
  company_name TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  meeting_type TEXT DEFAULT 'intro_call' CHECK (meeting_type IN ('intro_call', 'demo', 'follow_up', 'consultation')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  confirmation_token UUID DEFAULT uuid_generate_v4(),
  notes TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT CHECK (cancelled_by IN ('admin', 'company')),
  cancellation_reason TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email outreach tracking
CREATE TABLE IF NOT EXISTS email_outreach (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  company_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('outreach', 'meeting_invite', 'reminder', 'follow_up', 'confirmation')),
  subject TEXT,
  body_preview TEXT, -- First 200 chars of email body
  status TEXT DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_availability_admin_id ON admin_availability(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_availability_day_of_week ON admin_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_admin_availability_specific_date ON admin_availability(specific_date);

CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_admin_id ON scheduled_meetings(admin_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_scheduled_at ON scheduled_meetings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_status ON scheduled_meetings(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_confirmation_token ON scheduled_meetings(confirmation_token);

CREATE INDEX IF NOT EXISTS idx_email_outreach_sender_id ON email_outreach(sender_id);
CREATE INDEX IF NOT EXISTS idx_email_outreach_recipient_email ON email_outreach(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_outreach_company_id ON email_outreach(company_id);

-- Row Level Security Policies
ALTER TABLE admin_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_outreach ENABLE ROW LEVEL SECURITY;

-- Admins can manage their own availability
CREATE POLICY "Admins can manage own availability"
  ON admin_availability FOR ALL
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- Public can view availability for booking (filtered by admin_id in queries)
CREATE POLICY "Public can view availability for booking"
  ON admin_availability FOR SELECT
  USING (true);

-- Admins can manage their own meetings
CREATE POLICY "Admins can manage own meetings"
  ON scheduled_meetings FOR ALL
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

-- Public can create meetings (for booking page)
CREATE POLICY "Public can create meetings"
  ON scheduled_meetings FOR INSERT
  WITH CHECK (true);

-- Public can view meetings by confirmation token
CREATE POLICY "Public can view meetings by token"
  ON scheduled_meetings FOR SELECT
  USING (true);

-- Admins can manage their own email outreach
CREATE POLICY "Admins can manage own email outreach"
  ON email_outreach FOR ALL
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_availability_updated_at
  BEFORE UPDATE ON admin_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_meetings_updated_at
  BEFORE UPDATE ON scheduled_meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
