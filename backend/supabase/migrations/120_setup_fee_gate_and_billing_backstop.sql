-- =====================================================================
-- 120_setup_fee_gate_and_billing_backstop.sql
-- =====================================================================
-- Two money-correctness fixes surfaced by adversarial review of the CLT/PJ
-- setup-fee gate + estágio reconciliation work:
--
-- (1) STRANDING (HIGH): after the gate was made real (signing no longer force-
--     activates CLT/PJ), confirmCLTPayment became the ONLY activator. But a company
--     can pay BEFORE the candidate's final signature (the API + UI both allow paying
--     while pending_signatures). In that ordering nobody activates the hire: the
--     signature only moves it to pending_payment, and confirmCLTPayment already ran.
--     Fix: a per-hire setup_fee_paid flag + a trigger that, on the final CLT/PJ
--     signature, activates directly when the fee is already paid (else awaits payment).
--     This makes BOTH orderings converge to 'active' with the fee collected.
--
-- (2) INERT DOUBLE-BILL BACKSTOP (MEDIUM): migration 118's unique index keys on
--     contract_id, which is NEVER populated — so estágio monthly-fee rows (the exact
--     recurring billing it claims to guard) are excluded and the marker CAS is the
--     sole defense. Add hiring_process_id to payments + a unique index that actually
--     covers monthly-fee rows, so a released-marker retry can never double-bill.
-- =====================================================================

-- ---- (1) setup-fee gate state -------------------------------------------------
ALTER TABLE hiring_processes ADD COLUMN IF NOT EXISTS setup_fee_paid boolean NOT NULL DEFAULT false;

-- Backfill: any CLT/PJ hire already past the gate (active/paid/completed) was paid.
UPDATE hiring_processes
   SET setup_fee_paid = true
 WHERE hiring_type IN ('clt', 'pj')
   AND status IN ('active', 'paid', 'completed')
   AND setup_fee_paid = false;

-- ---- (2) per-hire payment attribution + real double-bill backstop --------------
ALTER TABLE payments ADD COLUMN IF NOT EXISTS hiring_process_id uuid REFERENCES hiring_processes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_payments_hiring_process ON payments (hiring_process_id);

-- One row per (hire, payment_type, period). Covers estágio monthly-fee (unlike 118's
-- contract_id key). A retry that re-inserts the same schedule hits this and the
-- all-or-nothing batch insert rolls back → zero duplicate charges.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_payments_hp_type_period
  ON payments (hiring_process_id, payment_type, billing_period)
  WHERE hiring_process_id IS NOT NULL AND billing_period IS NOT NULL;

-- Transition backfill: in-flight CLT/PJ hires created before payments carried
-- hiring_process_id have a pending setup-fee with a NULL link. After deploy,
-- confirmCLTPayment matches the setup-fee by hiring_process_id — so tag the existing
-- pending row now, otherwise it would create a second (paid) row and leave this one
-- as a stale "pending" charge. Only backfill when the company has exactly ONE
-- non-terminal CLT/PJ hire (unambiguous — no risk of mis-attributing).
UPDATE payments p
   SET hiring_process_id = hp.id
  FROM hiring_processes hp
 WHERE p.hiring_process_id IS NULL
   AND p.payment_type = 'setup-fee'
   AND p.company_id = hp.company_id
   AND hp.hiring_type IN ('clt', 'pj')
   AND hp.status IN ('pending_signatures', 'pending_payment')
   AND (SELECT count(*) FROM hiring_processes h2
         WHERE h2.company_id = p.company_id
           AND h2.hiring_type IN ('clt', 'pj')
           AND h2.status IN ('pending_signatures', 'pending_payment')) = 1;

-- ---- (1) trigger: activate on final CLT/PJ signature when fee already paid ------
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

  -- CLT / PJ: require BOTH company AND candidate signature. On the final signature:
  --   * setup fee already paid (pay-first) → activate now (gate closed);
  --   * not yet paid (sign-first)          → pending_payment, await confirmCLTPayment.
  IF (NEW.hiring_type = 'clt' OR NEW.hiring_type = 'pj')
     AND NEW.company_signed = true
     AND NEW.candidate_signed = true
     AND NEW.status = 'pending_signatures' THEN
    IF NEW.setup_fee_paid = true THEN
      NEW.status = 'active';
    ELSE
      NEW.status = 'pending_payment';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
