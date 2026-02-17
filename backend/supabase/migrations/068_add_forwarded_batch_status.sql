-- Add "forwarded" to candidate_batches status check constraint.
-- "forwarded" means the agency has reviewed the AI matches and explicitly
-- forwarded the batch to the company (unlocked, visible on company portal).

-- Drop the old constraint and recreate with the new value
ALTER TABLE candidate_batches
  DROP CONSTRAINT IF EXISTS candidate_batches_status_check;

ALTER TABLE candidate_batches
  ADD CONSTRAINT candidate_batches_status_check
  CHECK (status IN (
    'draft',
    'sent',
    'forwarded',
    'unlocked',
    'meeting_scheduled',
    'completed',
    'cancelled'
  ));

-- Fix any batches stuck at "sent" that should have been forwarded
UPDATE candidate_batches
SET
  status = 'forwarded',
  unlocked = true,
  unlocked_at = COALESCE(unlocked_at, NOW())
WHERE status = 'sent'
  AND unlocked = false;
