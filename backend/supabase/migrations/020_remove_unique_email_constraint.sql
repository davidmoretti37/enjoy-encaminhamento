-- =====================================================
-- Remove unique constraint on email to allow multiple invitations
-- =====================================================

-- Drop the unique constraint on email
ALTER TABLE public.affiliate_invitations
  DROP CONSTRAINT IF EXISTS affiliate_invitations_email_key;

-- Keep the index for performance but remove uniqueness
DROP INDEX IF EXISTS idx_affiliate_invitations_email;
CREATE INDEX IF NOT EXISTS idx_affiliate_invitations_email ON public.affiliate_invitations(email);

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
