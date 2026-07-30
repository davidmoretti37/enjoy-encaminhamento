-- 137: Record a hire who was never a registered candidate.
--
-- Operator: "se o candidato não cadastrou, não conseguimos colocá-lo no
-- preenchimento da vaga."
--
-- closeAsFilled only accepted hiredCandidateId, a uuid pointing at a row in
-- candidates. Plenty of real placements are people who never signed up to the
-- platform — there is already a life-insurance payment on file for a "Maria Clara
-- da Silva" who exists nowhere in the candidates table. Those hires simply could
-- not be recorded, so the vaga either stayed open or was closed with no record of
-- who filled it.
--
-- A plain name is enough to close the loop. It is deliberately NOT a foreign key:
-- the whole point is that this person has no candidate row.

BEGIN;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hired_person_name text;

COMMENT ON COLUMN jobs.hired_person_name IS
  'Name of the person who filled the vaga when they are not a registered candidate. '
  'Mutually exclusive in practice with the selected application: if the hire is a '
  'candidate, their application is marked selected instead.';

COMMIT;
