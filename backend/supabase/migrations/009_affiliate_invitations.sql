-- =====================================================
-- AFFILIATE INVITATIONS MIGRATION
-- =====================================================

-- Create invitation tokens table
CREATE TABLE IF NOT EXISTS public.affiliate_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(320) NOT NULL UNIQUE,
  token VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  region VARCHAR(100),
  commission_rate INTEGER DEFAULT 30,
  created_by UUID NOT NULL REFERENCES public.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  claimed_at TIMESTAMPTZ,
  claimed_by UUID REFERENCES public.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.affiliate_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only super admins can manage invitations
CREATE POLICY "Super admins can view invitations" ON public.affiliate_invitations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Super admins can create invitations" ON public.affiliate_invitations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Super admins can update invitations" ON public.affiliate_invitations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_affiliate_invitations_token ON public.affiliate_invitations(token);
CREATE INDEX IF NOT EXISTS idx_affiliate_invitations_email ON public.affiliate_invitations(email);
CREATE INDEX IF NOT EXISTS idx_affiliate_invitations_created_by ON public.affiliate_invitations(created_by);

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
