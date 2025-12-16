-- Migration: Add school_id to candidates table
-- This allows candidates to be linked to schools for AI matching

-- Add school_id column to candidates
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

-- Create index for faster lookups during matching
CREATE INDEX IF NOT EXISTS idx_candidates_school_id ON public.candidates(school_id);
