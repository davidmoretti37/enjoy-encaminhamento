-- Migration: School Invitations System
-- Description: Add table for managing school invitation tokens
-- Author: Admin System
-- Date: 2025-01-11

-- Create invitation status enum
DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create school_invitations table
CREATE TABLE IF NOT EXISTS public.school_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  franchise_id UUID NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
  status invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES public.users(id),
  notes TEXT
);

-- Add indexes for performance
CREATE INDEX idx_school_invitations_token ON public.school_invitations(token);
CREATE INDEX idx_school_invitations_email ON public.school_invitations(email);
CREATE INDEX idx_school_invitations_franchise_id ON public.school_invitations(franchise_id);
CREATE INDEX idx_school_invitations_status ON public.school_invitations(status);
CREATE INDEX idx_school_invitations_created_by ON public.school_invitations(created_by);

-- Enable RLS
ALTER TABLE public.school_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Super admins can do everything
CREATE POLICY "Super admins have full access to invitations"
  ON public.school_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Franchises can view their own invitations
CREATE POLICY "Franchises can view their own invitations"
  ON public.school_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'affiliate'
      AND users.id IN (
        SELECT user_id FROM public.franchises WHERE franchises.id = school_invitations.franchise_id
      )
    )
  );

-- Public can read invitation by token (for validation during registration)
CREATE POLICY "Anyone can validate invitation token"
  ON public.school_invitations
  FOR SELECT
  USING (true);

-- Add comments for documentation
COMMENT ON TABLE public.school_invitations IS 'Stores one-time invitation tokens for school registration';
COMMENT ON COLUMN public.school_invitations.token IS 'Unique UUID token included in invitation link';
COMMENT ON COLUMN public.school_invitations.email IS 'Email address of the invited school owner';
COMMENT ON COLUMN public.school_invitations.franchise_id IS 'Franchise that this school will belong to';
COMMENT ON COLUMN public.school_invitations.status IS 'Current status of the invitation';
COMMENT ON COLUMN public.school_invitations.expires_at IS 'When this invitation expires (default 7 days)';
COMMENT ON COLUMN public.school_invitations.school_id IS 'School created after accepting invitation';
