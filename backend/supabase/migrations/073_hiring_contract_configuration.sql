-- Add awaiting_configuration status and contract configuration fields to hiring_processes

-- Step 1: Drop and recreate status CHECK constraint to include new status
ALTER TABLE hiring_processes DROP CONSTRAINT IF EXISTS hiring_processes_status_check;
ALTER TABLE hiring_processes ADD CONSTRAINT hiring_processes_status_check
  CHECK (status IN ('awaiting_configuration', 'pending_signatures', 'pending_payment', 'active', 'completed', 'cancelled'));

-- Step 2: Add contract configuration columns
ALTER TABLE hiring_processes ADD COLUMN IF NOT EXISTS payment_day INTEGER CHECK (payment_day >= 1 AND payment_day <= 28);
ALTER TABLE hiring_processes ADD COLUMN IF NOT EXISTS contract_duration_months INTEGER CHECK (contract_duration_months > 0);

-- Step 3: Add notification tracking to payments for auto-reminders
ALTER TABLE payments ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;
