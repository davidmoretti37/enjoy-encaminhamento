-- Migration: Create company_invitations table
-- Purpose: Allow agencies to invite imported companies to access the platform

-- Create company_invitations table
CREATE TABLE IF NOT EXISTS company_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token UUID DEFAULT gen_random_uuid() UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_company_invitations_token ON company_invitations(token);
CREATE INDEX IF NOT EXISTS idx_company_invitations_company_id ON company_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invitations_status ON company_invitations(status);

-- Enable RLS
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "admins_all_access" ON company_invitations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Agencies can manage invitations for their companies
CREATE POLICY "agencies_manage_own_invitations" ON company_invitations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN agencies a ON a.user_id = u.id
      JOIN companies c ON c.agency_id = a.id
      WHERE u.id = auth.uid()
      AND u.role = 'agency'
      AND c.id = company_invitations.company_id
    )
  );

-- Policy: Public can read and update their own invitation (by token, for accepting)
CREATE POLICY "public_accept_invitation" ON company_invitations
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON company_invitations TO authenticated;
GRANT SELECT ON company_invitations TO anon;
