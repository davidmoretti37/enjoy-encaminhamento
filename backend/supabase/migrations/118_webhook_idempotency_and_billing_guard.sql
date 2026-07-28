-- =====================================================================
-- 118_webhook_idempotency_and_billing_guard.sql   (SIGN-9 / SIGN-10 / Area 4)
-- =====================================================================
--
-- 1. webhook_events: dedup table so a replayed / duplicated Autentique webhook
--    POST is a true no-op (the handler INSERTs the event id first and bails if
--    it already existed). Previously the event id was only logged.
--
-- 2. Partial unique index on payments(contract_id, payment_type, billing_period)
--    for rows with a billing_period — a DB-level backstop against double-billing
--    the recurring estágio monthly fee (up to 12 rows) if a signature-completion
--    handler ever runs twice. Rows without a billing_period (one-off fees) are
--    unaffected. Complements the code-level idempotency in
--    handleEstagioSignaturesComplete.
-- =====================================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id text PRIMARY KEY,
  source text NOT NULL DEFAULT 'autentique',
  event_type text,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Guard against duplicate recurring charges for the same contract + period.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_payments_contract_type_period
  ON payments (contract_id, payment_type, billing_period)
  WHERE billing_period IS NOT NULL AND contract_id IS NOT NULL;

-- 3. Atomic per-signer signed_at update. The webhook previously read the whole
--    signers JSONB array, mutated one element in JS, and wrote it back — so two
--    near-simultaneous signature.accepted events for different signers on the
--    same document could clobber each other (lost update). This single-statement
--    UPDATE sets signed_at only for the matching signer that has not yet signed.
CREATE OR REPLACE FUNCTION mark_autentique_signer_signed(
  p_autentique_document_id text,
  p_signer_public_id text,
  p_signer_email text,
  p_signed_at text
) RETURNS void AS $$
  UPDATE autentique_documents
  SET signers = (
    SELECT jsonb_agg(
      CASE
        WHEN (elem->>'signed_at') IS NULL
             AND (
               (p_signer_public_id IS NOT NULL AND elem->>'autentique_signer_id' = p_signer_public_id)
               OR (p_signer_email IS NOT NULL AND elem->>'email' = p_signer_email)
             )
        THEN jsonb_set(elem, '{signed_at}', to_jsonb(p_signed_at))
        ELSE elem
      END
    )
    FROM jsonb_array_elements(signers) elem
  )
  WHERE autentique_document_id = p_autentique_document_id;
$$ LANGUAGE sql;
