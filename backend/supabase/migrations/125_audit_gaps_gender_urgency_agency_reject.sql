-- =====================================================================
-- 125_audit_gaps_gender_urgency_agency_reject.sql
-- =====================================================================
-- Full-platform audit fixes that need schema:
--  #19/#20 — the "Gênero" and "Urgência" selections in Adicionar Empresa were
--           silently dropped (no columns to store them).
--  #25     — rejecting an agency application: give it a real 'rejected' status
--           and persist the rejection reason (was mapped to 'suspended' + dropped).
-- All additive / IF NOT EXISTS.
-- =====================================================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS gender_preference TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS urgency TEXT;

ALTER TYPE school_status ADD VALUE IF NOT EXISTS 'rejected';

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
