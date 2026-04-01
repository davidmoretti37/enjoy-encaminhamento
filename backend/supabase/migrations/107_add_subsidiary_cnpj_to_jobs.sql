-- Add subsidiary CNPJ fields to jobs table
-- Allows companies with multiple CNPJs (franchises) to tag each job with the correct legal entity
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS subsidiary_cnpj TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS subsidiary_name TEXT;
