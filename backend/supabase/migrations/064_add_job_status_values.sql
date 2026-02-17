-- Add new job status values for recruitment progress tracking
-- These values are used to track the batch/recruitment progress

DO $$ BEGIN
    -- Add pending_review if it doesn't exist
    ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'pending_review';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'searching';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'candidates_found';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'in_selection';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'list_sent';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'paused';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- FIX EXISTING JOBS BASED ON BATCH STATUS
-- =====================================================

-- Update jobs that have a SENT batch (status: sent, unlocked, meeting_scheduled, completed)
-- These should be at step 4: Lista enviada
UPDATE jobs
SET status = 'list_sent'
WHERE id IN (
    SELECT DISTINCT job_id
    FROM candidate_batches
    WHERE status IN ('sent', 'unlocked', 'meeting_scheduled', 'completed')
)
AND status NOT IN ('list_sent', 'filled');

-- Update jobs that have a DRAFT batch but no sent batch
-- These should be at step 3: Pré-seleção em andamento
UPDATE jobs
SET status = 'in_selection'
WHERE id IN (
    SELECT DISTINCT job_id
    FROM candidate_batches
    WHERE status = 'draft'
)
AND id NOT IN (
    SELECT DISTINCT job_id
    FROM candidate_batches
    WHERE status IN ('sent', 'unlocked', 'meeting_scheduled', 'completed')
)
AND status NOT IN ('in_selection', 'list_sent', 'filled');
