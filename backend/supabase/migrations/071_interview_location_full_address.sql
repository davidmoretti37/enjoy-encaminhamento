-- Migration 071: Add full address fields for interview location
-- Adds CEP, neighborhood, number, and complement for in-person interview locations

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS interview_location_cep VARCHAR(9),
  ADD COLUMN IF NOT EXISTS interview_location_neighborhood VARCHAR(100),
  ADD COLUMN IF NOT EXISTS interview_location_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS interview_location_complement VARCHAR(100);
