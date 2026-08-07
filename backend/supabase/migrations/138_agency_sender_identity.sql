-- Per-agency sender identity for outgoing candidate email.
--
-- Until now the FROM address came from a single global SMTP_* env var, which in
-- production was the founder's personal gmail. Candidates received official ANEC
-- correspondence from a personal address, and every reply landed in his inbox
-- instead of the operator's — a candidate confirmed an interview and the operator
-- running that interview never saw it.
--
-- Mail still sends from the verified ANEC mailbox, because you cannot send as an
-- address you do not control without failing SPF/DKIM. What each agency controls
-- is how it is presented and where replies go:
--
--   From:     <display name> <the verified ANEC address>
--   Reply-To: <that agency's own address>
--
-- No credentials are stored. Both columns are optional; NULL falls back to the
-- previous global behaviour, so nothing breaks for agencies that never set them.

ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS sender_display_name TEXT,
  ADD COLUMN IF NOT EXISTS reply_to_email TEXT;

COMMENT ON COLUMN agencies.sender_display_name IS
  'Name candidates see as the sender, e.g. "ANEC São Mateus". The address itself stays the verified ANEC mailbox.';
COMMENT ON COLUMN agencies.reply_to_email IS
  'Where candidate replies go. Set per agency so replies reach the operator running that unit.';

-- Reject a malformed address at the database rather than discovering it when a
-- candidate reply silently bounces.
ALTER TABLE agencies
  DROP CONSTRAINT IF EXISTS agencies_reply_to_email_format;
ALTER TABLE agencies
  ADD CONSTRAINT agencies_reply_to_email_format
  CHECK (reply_to_email IS NULL OR reply_to_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
