-- Backfill agency_id on admin_availability, admin_settings, and scheduled_meetings
-- for agency-role users whose records were saved without agency_id due to the
-- outreach router using getAdminAgencyContext() instead of looking up agencies.user_id.

-- Fix admin_availability: set agency_id from agencies.user_id where missing
UPDATE admin_availability aa
SET agency_id = a.id
FROM agencies a
WHERE aa.admin_id = a.user_id
  AND aa.agency_id IS NULL;

-- Fix admin_settings: set agency_id from agencies.user_id where missing
UPDATE admin_settings ast
SET agency_id = a.id
FROM agencies a
WHERE ast.admin_id = a.user_id
  AND ast.agency_id IS NULL;

-- Fix scheduled_meetings: set agency_id from agencies.user_id where missing
UPDATE scheduled_meetings sm
SET agency_id = a.id
FROM agencies a
WHERE sm.admin_id = a.user_id
  AND sm.agency_id IS NULL;

-- Also fix users.agency_id for agency-role users who have it NULL
UPDATE users u
SET agency_id = a.id
FROM agencies a
WHERE u.id = a.user_id
  AND u.role = 'agency'
  AND u.agency_id IS NULL;
