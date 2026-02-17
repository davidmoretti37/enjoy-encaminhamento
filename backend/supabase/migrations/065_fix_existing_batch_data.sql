-- Fix existing data for batches that were sent but didn't update job/application status

-- 1. Update jobs that have unlocked batches to "list_sent" status
UPDATE jobs
SET status = 'list_sent'
WHERE id IN (
    SELECT DISTINCT job_id
    FROM candidate_batches
    WHERE unlocked = true
    AND status IN ('unlocked', 'meeting_scheduled', 'completed')
)
AND status NOT IN ('list_sent', 'filled');

-- 2. Update applications for candidates in unlocked batches to "screening" status
UPDATE applications
SET
    status = 'screening',
    reviewed_at = COALESCE(reviewed_at, NOW())
WHERE (job_id, candidate_id) IN (
    SELECT cb.job_id, unnest(cb.candidate_ids) as candidate_id
    FROM candidate_batches cb
    WHERE cb.unlocked = true
    AND cb.status IN ('unlocked', 'meeting_scheduled', 'completed')
)
AND status = 'applied';
