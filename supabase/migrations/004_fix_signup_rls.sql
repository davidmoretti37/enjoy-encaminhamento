-- =====================================================
-- FIX SIGNUP RLS POLICY
-- =====================================================
-- Purpose: Allow users to create their own profile during signup
-- Issue: Current RLS blocks INSERT into public.users during signup
-- =====================================================

-- Drop existing INSERT policies on users table
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

-- Also ensure users can read their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- Fix: Enable email confirmations to be optional in dev
-- =====================================================

-- Note: To disable email confirmation in development:
-- 1. Go to: https://app.supabase.com/project/jpdqxjaosattvzjjumxz/auth/settings
-- 2. Under "Email Auth" → Uncheck "Enable email confirmations"
-- 3. This allows instant signup without waiting for email

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
