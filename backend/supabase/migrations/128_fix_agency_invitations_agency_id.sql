-- 128: Rename agency_invitations.school_id -> agency_id.
--
-- WHY
-- Migration 048 renamed the `schools` table to `agencies` and the
-- `school_invitations` table to `agency_invitations`, but left this column
-- named `school_id`. Every code path has written `agency_id` ever since:
--   backend/db/affiliates.ts  (accept flow: status/accepted_at/agency_id)
--   backend/routers/invitation.ts:158
-- and one reads it:
--   backend/routers/auth.ts:87  (agencyInvitation.agency_id -> always undefined)
--
-- PostgREST rejects the unknown column, but the accept flow never destructured
-- the result, so the error was swallowed. Consequences on prod:
--   * All 12 agency_invitations rows are still status='pending' with
--     accepted_at = NULL, even though two of them (ipatinga@, uberlandia@)
--     demonstrably completed and created their agencies back in February.
--   * Because status never flips, an invite token stays usable for its whole
--     7-day window. Re-using it takes the "already registered" branch, reuses
--     the same user id, and inserts a SECOND agencies row with that user_id —
--     after which getAgencyByUserId's .single() errors and that agency user is
--     locked out of the entire product.
--
-- The 12 existing tokens have all expired (expires_at < now()), so there is no
-- live replay window today; this fixes it for every future invitation.
--
-- No TypeScript references `school_id` (verified by grep), so the rename is safe.

BEGIN;

-- Renaming a column carries its foreign key with it, so the existing
-- `school_invitations_school_id_fkey` (FK -> agencies(id) ON DELETE SET NULL)
-- stays valid and correct. Rename it too, purely so the name matches reality.
ALTER TABLE public.agency_invitations RENAME COLUMN school_id TO agency_id;

ALTER TABLE public.agency_invitations
  RENAME CONSTRAINT school_invitations_school_id_fkey TO agency_invitations_agency_id_fkey;

-- Backfill the two invitations that really were accepted, so their tokens stop
-- being replayable and the history is honest. Matched by email against the
-- agency that account owns.
UPDATE public.agency_invitations inv
SET    status      = 'accepted',
       accepted_at = COALESCE(inv.accepted_at, a.created_at),
       agency_id   = a.id
FROM   public.agencies a
JOIN   public.users u ON u.id = a.user_id
WHERE  lower(u.email) = lower(inv.email)
  AND  inv.status = 'pending';

-- Anything still pending and long past its expiry is dead; mark it so it cannot
-- be presented as a live invite.
UPDATE public.agency_invitations
SET    status = 'expired'
WHERE  status = 'pending'
  AND  expires_at < now();

COMMIT;
