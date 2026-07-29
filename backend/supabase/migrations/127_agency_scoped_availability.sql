-- 127: Make scheduling availability belong to the AGENCY, not to whichever
-- user happened to configure it.
--
-- WHY
-- `admin_availability` rows are keyed on `admin_id`. In practice that meant a
-- branch's opening hours were visible only to the single user who entered them:
-- all 12 rows on prod belong to `uberlandia@anecrh.com.br`. The head (`admin`)
-- account and the Ipatinga login had ZERO rows, so `getAvailableSlots` returned
-- an empty list for them on every date — the time picker showed nothing and the
-- whole hiring funnel stopped behind it (no meeting -> no session -> candidate
-- never leaves "pendente").
--
-- The application code now scopes availability by `agency_id` when an agency
-- context is known (see backend/db/scheduling.ts `scopeToAgency`). This
-- migration makes the DATA match that model.
--
-- NOTE ON SEEDING: this migration deliberately does NOT invent opening hours
-- for Ipatinga. The frontend now falls back to the standard 08:00-19:00 grid
-- when an agency has no availability configured, so scheduling works whether or
-- not hours are set. Real hours should be entered by the team in
-- Agenda -> Configurações da Agenda.

BEGIN;

-- 0) PRE-EXISTING BUG, must be fixed before anything below can run.
--    `admin_availability` carries the trigger `update_admin_availability_updated_at`,
--    which assigns NEW.updated_at — but the table has no such column. Every
--    UPDATE against this table therefore fails with:
--      42703: record "new" has no field "updated_at"
--    Adding the column the trigger already expects repairs it (and unblocks
--    editing availability from the UI, which has the same problem).
ALTER TABLE admin_availability
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 1) Backfill agency_id on availability rows that predate agency scoping
--    (migration 095's backfill never took effect on prod: 6 rows still NULL).
--    Only fill combinations the agency does not already have, so we do not
--    resurrect duplicates that were since re-entered.
UPDATE admin_availability aa
SET    agency_id = a.id
FROM   agencies a
WHERE  aa.admin_id = a.user_id
  AND  aa.agency_id IS NULL
  AND  NOT EXISTS (
         SELECT 1 FROM admin_availability x
         WHERE  x.agency_id     = a.id
           AND  x.day_of_week   IS NOT DISTINCT FROM aa.day_of_week
           AND  x.specific_date IS NOT DISTINCT FROM aa.specific_date
           AND  x.start_time    = aa.start_time
           AND  x.end_time      = aa.end_time
           AND  x.is_blocked    = aa.is_blocked
       );

-- 2) Anything still NULL after that is a duplicate of an agency-scoped row.
--    Drop it rather than leave an unreachable row behind.
DELETE FROM admin_availability aa
USING  agencies a
WHERE  aa.admin_id = a.user_id
  AND  aa.agency_id IS NULL;

-- 3) De-duplicate identical availability windows within an agency.
--    Prod has at least one: Uberlândia carries day_of_week = 1 twice, which
--    produced duplicate entries in the picker.
DELETE FROM admin_availability a
USING  admin_availability b
WHERE  a.ctid > b.ctid
  AND  a.agency_id     IS NOT DISTINCT FROM b.agency_id
  AND  a.admin_id      = b.admin_id
  AND  a.day_of_week   IS NOT DISTINCT FROM b.day_of_week
  AND  a.specific_date IS NOT DISTINCT FROM b.specific_date
  AND  a.start_time    = b.start_time
  AND  a.end_time      = b.end_time
  AND  a.is_blocked    = b.is_blocked;

-- 4) Backfill agency_id on scheduled meetings so the busy check and the agency
--    calendar see them. 22 Ipatinga meetings currently have agency_id = NULL
--    (createMeetingForCompany never set it).
UPDATE scheduled_meetings sm
SET    agency_id = a.id
FROM   agencies a
WHERE  sm.admin_id = a.user_id
  AND  sm.agency_id IS NULL;

-- 5) Same for admin_settings (meeting duration), so a branch's slot length is
--    shared rather than per-user.
UPDATE admin_settings s
SET    agency_id = a.id
FROM   agencies a
WHERE  s.admin_id = a.user_id
  AND  s.agency_id IS NULL;

-- 6) Stop duplicates coming back. Partial index: only recurring (day_of_week)
--    rows that are agency-scoped. One-off `specific_date` blocks are exempt.
CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_availability_agency_day
  ON admin_availability (agency_id, day_of_week, start_time, end_time, is_blocked)
  WHERE day_of_week IS NOT NULL AND agency_id IS NOT NULL;

COMMIT;
