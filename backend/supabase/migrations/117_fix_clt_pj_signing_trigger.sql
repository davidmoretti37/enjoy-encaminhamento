-- =====================================================================
-- 117_fix_clt_pj_signing_trigger.sql   (SIGN-7)
-- =====================================================================
--
-- The check_hiring_signatures_complete() trigger (from 067) advanced a CLT
-- hire to 'pending_payment' on the COMPANY signature alone — the candidate
-- signature was not required — and it did not handle the 'pj' hiring type at
-- all (added later in 106). A never-merged fix (old repo 107) required both
-- signatures; this ports that intent onto 067's intermediate-status model.
--
-- This is a strict TIGHTENING: it only adds the candidate_signed requirement
-- (and pj coverage), so it can never advance a process earlier than before —
-- it can only prevent premature advancement. The application layer already
-- enforces both-signatures for CLT/PJ activation; this trigger is the DB-level
-- backstop kept consistent with it.
-- =====================================================================

CREATE OR REPLACE FUNCTION check_hiring_signatures_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Estágio: all four signatures → active
  IF NEW.hiring_type = 'estagio'
     AND NEW.company_signed = true
     AND NEW.candidate_signed = true
     AND NEW.parent_signed = true
     AND NEW.school_signed = true
     AND NEW.status = 'pending_signatures' THEN
    NEW.status = 'active';
  END IF;

  -- CLT / PJ: require BOTH the company AND the candidate signature before
  -- advancing. (Previously CLT advanced on company_signed alone, and pj was
  -- not handled.)
  IF (NEW.hiring_type = 'clt' OR NEW.hiring_type = 'pj')
     AND NEW.company_signed = true
     AND NEW.candidate_signed = true
     AND NEW.status = 'pending_signatures' THEN
    NEW.status = 'pending_payment';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
