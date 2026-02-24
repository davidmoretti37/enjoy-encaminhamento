-- Add contract_files JSONB column for multiple document uploads
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS contract_files JSONB DEFAULT '[]'::jsonb;

-- Add pending_contract_signing flag (code already references this column)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS pending_contract_signing BOOLEAN DEFAULT false;
