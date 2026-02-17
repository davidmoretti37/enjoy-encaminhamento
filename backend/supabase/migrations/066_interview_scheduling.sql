-- Interview Scheduling Tables
-- Supports online (Jitsi) and in-person interviews with candidate confirmation

-- Interview Sessions (the scheduled event)
CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES candidate_batches(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Interview Details
  interview_type VARCHAR(20) NOT NULL CHECK (interview_type IN ('online', 'in_person')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,

  -- Location (for in-person)
  location_address TEXT,
  location_city VARCHAR(100),
  location_state VARCHAR(2),
  location_notes TEXT,

  -- Online (for virtual)
  meeting_link TEXT,

  -- Status: scheduled, completed, cancelled
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'cancelled')),

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Interview Participants (candidates invited to sessions)
CREATE TABLE interview_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,

  -- Participant Status
  -- pending: waiting for candidate response
  -- confirmed: candidate confirmed attendance
  -- reschedule_requested: candidate requested different time
  -- declined: candidate declined
  -- no_show: candidate did not attend
  -- attended: candidate attended the interview
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'reschedule_requested', 'declined', 'no_show', 'attended')),

  -- Reschedule handling
  reschedule_reason TEXT,

  -- Tracking
  invitation_sent_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(interview_session_id, candidate_id)
);

-- Indexes for efficient queries
CREATE INDEX idx_interview_sessions_company ON interview_sessions(company_id);
CREATE INDEX idx_interview_sessions_job ON interview_sessions(job_id);
CREATE INDEX idx_interview_sessions_batch ON interview_sessions(batch_id);
CREATE INDEX idx_interview_sessions_scheduled_at ON interview_sessions(scheduled_at);
CREATE INDEX idx_interview_participants_candidate ON interview_participants(candidate_id);
CREATE INDEX idx_interview_participants_application ON interview_participants(application_id);
CREATE INDEX idx_interview_participants_status ON interview_participants(status);

-- Enable RLS
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interview_sessions
CREATE POLICY "Companies can view their interview sessions"
  ON interview_sessions FOR SELECT
  USING (company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  ));

CREATE POLICY "Companies can insert interview sessions"
  ON interview_sessions FOR INSERT
  WITH CHECK (company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  ));

CREATE POLICY "Companies can update their interview sessions"
  ON interview_sessions FOR UPDATE
  USING (company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  ));

-- RLS Policies for interview_participants
CREATE POLICY "Candidates can view their interview participations"
  ON interview_participants FOR SELECT
  USING (candidate_id IN (
    SELECT id FROM candidates WHERE user_id = auth.uid()
  ));

CREATE POLICY "Candidates can update their participation status"
  ON interview_participants FOR UPDATE
  USING (candidate_id IN (
    SELECT id FROM candidates WHERE user_id = auth.uid()
  ));

CREATE POLICY "Companies can view participants in their sessions"
  ON interview_participants FOR SELECT
  USING (interview_session_id IN (
    SELECT id FROM interview_sessions WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Companies can insert participants"
  ON interview_participants FOR INSERT
  WITH CHECK (interview_session_id IN (
    SELECT id FROM interview_sessions WHERE company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  ));

-- Service role bypass for server-side operations
CREATE POLICY "Service role can do anything on interview_sessions"
  ON interview_sessions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can do anything on interview_participants"
  ON interview_participants FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_interview_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER interview_sessions_updated_at
  BEFORE UPDATE ON interview_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_interview_updated_at();

CREATE TRIGGER interview_participants_updated_at
  BEFORE UPDATE ON interview_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_interview_updated_at();
