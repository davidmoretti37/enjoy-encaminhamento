-- Make admin@agencianacional.com an admin user
-- Run this in Supabase SQL Editor

UPDATE public.users
SET role = 'admin'
WHERE id = 'db08abbf-cfe8-4473-a5d6-88454cdbb828';

-- Verify it worked
SELECT id, email, role, name
FROM public.users
WHERE id = 'db08abbf-cfe8-4473-a5d6-88454cdbb828';
