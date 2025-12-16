-- Migration 032: Add work_schedule, salary_min, salary_max columns to jobs table
-- These columns are expected by the frontend but were missing

-- Add work_schedule column (storing the formatted schedule like "08:00-17:00")
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS work_schedule VARCHAR(100);

-- Add salary_min and salary_max columns (in reais, not cents)
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_min NUMERIC(10,2);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_max NUMERIC(10,2);

-- Add requirements column for job requirements text
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS requirements TEXT;

-- Add location column if it doesn't exist
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- Comment the columns
COMMENT ON COLUMN public.jobs.work_schedule IS 'Work schedule (e.g., "08:00 às 17:00")';
COMMENT ON COLUMN public.jobs.salary_min IS 'Minimum salary in BRL';
COMMENT ON COLUMN public.jobs.salary_max IS 'Maximum salary in BRL';
COMMENT ON COLUMN public.jobs.requirements IS 'Job requirements text';
