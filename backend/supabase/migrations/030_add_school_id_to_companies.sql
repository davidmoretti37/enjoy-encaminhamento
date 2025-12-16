-- Migration: Add school_id to companies table
-- Description: Track which school imported/owns a company
-- Run this in Supabase SQL Editor

-- Add school_id column to companies
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id);

-- Create index for school_id lookups
CREATE INDEX IF NOT EXISTS idx_companies_school_id ON companies(school_id);

-- Comment
COMMENT ON COLUMN companies.school_id IS 'The school that imported or owns this company';
