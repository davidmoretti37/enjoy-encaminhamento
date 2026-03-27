-- Company user invitations: allows existing companies to invite new team members
CREATE TABLE IF NOT EXISTS company_user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin' or 'member'
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ
);

CREATE INDEX idx_company_user_invitations_token ON company_user_invitations(token);
CREATE INDEX idx_company_user_invitations_company ON company_user_invitations(company_id, status);

-- RLS
ALTER TABLE company_user_invitations ENABLE ROW LEVEL SECURITY;

-- Public can validate tokens
CREATE POLICY "Public can validate tokens" ON company_user_invitations
  FOR SELECT USING (true);

-- Company users can manage their invitations
CREATE POLICY "Company users can manage invitations" ON company_user_invitations
  FOR ALL USING (true) WITH CHECK (true);
