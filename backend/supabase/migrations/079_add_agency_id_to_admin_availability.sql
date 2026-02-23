-- Add agency_id column to admin_availability table
-- This column was expected by the code but never added in the original migration (023)
ALTER TABLE admin_availability ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_admin_availability_agency_id ON admin_availability(agency_id);

-- Add agency_id column to admin_settings table
-- Same issue: code references it but column was never added
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_admin_settings_agency_id ON admin_settings(agency_id);
