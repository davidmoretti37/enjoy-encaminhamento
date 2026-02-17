-- Add payment information fields to agencies table
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS pix_key TEXT;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS pix_key_type VARCHAR(20);
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS payment_instructions TEXT;
