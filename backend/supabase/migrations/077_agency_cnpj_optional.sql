-- Make CNPJ optional on agencies table (was NOT NULL UNIQUE from original companies schema)
ALTER TABLE agencies ALTER COLUMN cnpj DROP NOT NULL;

-- Drop the unique constraint on cnpj (inherited from original companies table)
-- Find and drop any unique index/constraint on cnpj
DO $$
DECLARE
  idx_name TEXT;
BEGIN
  -- Drop unique indexes on agencies.cnpj
  FOR idx_name IN
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'agencies' AND indexdef LIKE '%cnpj%' AND indexdef LIKE '%UNIQUE%'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', idx_name);
  END LOOP;

  -- Also try constraint names that might exist
  FOR idx_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'agencies'::regclass AND contype = 'u'
    AND EXISTS (
      SELECT 1 FROM unnest(conkey) k
      JOIN pg_attribute a ON a.attrelid = conrelid AND a.attnum = k
      WHERE a.attname = 'cnpj'
    )
  LOOP
    EXECUTE format('ALTER TABLE agencies DROP CONSTRAINT IF EXISTS %I', idx_name);
  END LOOP;
END $$;
