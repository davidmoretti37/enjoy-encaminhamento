-- =====================================================
-- JOBS TABLE ENHANCEMENTS FOR ADMIN
-- =====================================================
-- Purpose: Add admin management columns to existing jobs table
-- Jobs table already exists from migration 001
-- =====================================================

-- Add missing columns if they don't exist
DO $$ BEGIN
    -- Add created_by if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'jobs' AND column_name = 'created_by') THEN
        ALTER TABLE public.jobs ADD COLUMN created_by UUID REFERENCES public.users(id);
    END IF;

    -- Add filled_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'jobs' AND column_name = 'filled_at') THEN
        ALTER TABLE public.jobs ADD COLUMN filled_at TIMESTAMPTZ;
    END IF;

    -- Add closed_by if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'jobs' AND column_name = 'closed_by') THEN
        ALTER TABLE public.jobs ADD COLUMN closed_by UUID REFERENCES public.users(id);
    END IF;

    -- Add close_reason if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'jobs' AND column_name = 'close_reason') THEN
        ALTER TABLE public.jobs ADD COLUMN close_reason TEXT;
    END IF;

    -- Add views counter if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'jobs' AND column_name = 'views') THEN
        ALTER TABLE public.jobs ADD COLUMN views INTEGER DEFAULT 0;
    END IF;

    -- Add applications counter if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'jobs' AND column_name = 'applications') THEN
        ALTER TABLE public.jobs ADD COLUMN applications INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create additional indexes if they don't exist
DO $$ BEGIN
    -- Index on created_by
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_jobs_created_by') THEN
        CREATE INDEX idx_jobs_created_by ON public.jobs(created_by);
    END IF;

    -- Index on company_id (might already exist)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_jobs_company_id') THEN
        CREATE INDEX idx_jobs_company_id ON public.jobs(company_id);
    END IF;
END $$;

-- Update RLS policies for admin access
-- Drop existing admin policies if they exist and recreate them
DROP POLICY IF EXISTS "Admins can view all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can delete jobs" ON public.jobs;

-- Super admins and admins can view all jobs
CREATE POLICY "Admins can view all jobs"
  ON public.jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

-- Admins can update any job
CREATE POLICY "Admins can update jobs"
  ON public.jobs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );

-- Admins can delete any job
CREATE POLICY "Admins can delete jobs"
  ON public.jobs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
    )
  );
