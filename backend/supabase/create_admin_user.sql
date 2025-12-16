-- Create admin user profile in public.users table
-- Run this in Supabase SQL Editor

-- First, check if user exists in auth.users
SELECT id, email, created_at
FROM auth.users
WHERE id = 'db08abbf-cfe8-4473-a5d6-88454cdbb828';

-- If the above returns a row, insert into public.users
INSERT INTO public.users (id, email, role, name, created_at, updated_at, last_signed_in)
VALUES (
  'db08abbf-cfe8-4473-a5d6-88454cdbb828',
  'admin@agencianacional.com',
  'admin',
  'Admin User',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (id)
DO UPDATE SET
  role = 'admin',
  updated_at = NOW();

-- Verify it worked
SELECT id, email, role, name, created_at
FROM public.users
WHERE id = 'db08abbf-cfe8-4473-a5d6-88454cdbb828';
