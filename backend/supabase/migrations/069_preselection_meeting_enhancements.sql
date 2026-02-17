-- Pre-selection Meeting Enhancements
-- Allows agencies to schedule multiple meeting types (online/in-person, group/individual)
-- for candidates within a batch during pre-selection

-- 1. Make application_id nullable on interview_participants
-- Pre-selection candidates may not have formal applications yet
ALTER TABLE interview_participants
  ALTER COLUMN application_id DROP NOT NULL;

-- 2. Add session_format to interview_sessions
-- 'group' = one session with multiple participants
-- 'individual' = one session per candidate
ALTER TABLE interview_sessions
  ADD COLUMN session_format VARCHAR(20) DEFAULT 'group'
    CHECK (session_format IN ('group', 'individual'));

-- 3. Add agency access RLS policies for interview_sessions via batch
-- Agencies need to create and view sessions for their batches
CREATE POLICY "Agencies can view interview sessions for their batches"
  ON interview_sessions FOR SELECT
  USING (batch_id IN (
    SELECT cb.id FROM candidate_batches cb
    JOIN agencies a ON a.id = cb.agency_id
    WHERE a.user_id = auth.uid()
  ));

CREATE POLICY "Agencies can insert interview sessions for their batches"
  ON interview_sessions FOR INSERT
  WITH CHECK (batch_id IN (
    SELECT cb.id FROM candidate_batches cb
    JOIN agencies a ON a.id = cb.agency_id
    WHERE a.user_id = auth.uid()
  ));

CREATE POLICY "Agencies can update interview sessions for their batches"
  ON interview_sessions FOR UPDATE
  USING (batch_id IN (
    SELECT cb.id FROM candidate_batches cb
    JOIN agencies a ON a.id = cb.agency_id
    WHERE a.user_id = auth.uid()
  ));

-- 4. Add agency access RLS policies for interview_participants via batch
CREATE POLICY "Agencies can view participants in their batch sessions"
  ON interview_participants FOR SELECT
  USING (interview_session_id IN (
    SELECT iss.id FROM interview_sessions iss
    WHERE iss.batch_id IN (
      SELECT cb.id FROM candidate_batches cb
      JOIN agencies a ON a.id = cb.agency_id
      WHERE a.user_id = auth.uid()
    )
  ));

CREATE POLICY "Agencies can insert participants in their batch sessions"
  ON interview_participants FOR INSERT
  WITH CHECK (interview_session_id IN (
    SELECT iss.id FROM interview_sessions iss
    WHERE iss.batch_id IN (
      SELECT cb.id FROM candidate_batches cb
      JOIN agencies a ON a.id = cb.agency_id
      WHERE a.user_id = auth.uid()
    )
  ));
