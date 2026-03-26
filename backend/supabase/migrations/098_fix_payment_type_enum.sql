-- Add missing payment_type enum values
-- These were added via CHECK constraint only in migrations 031 and 057
-- but the underlying Postgres enum type was never altered
ALTER TYPE payment_type ADD VALUE IF NOT EXISTS 'batch-unlock';
ALTER TYPE payment_type ADD VALUE IF NOT EXISTS 'insurance-fee';
