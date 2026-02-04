-- Migration 058: Create admin_agency_context table
-- This table stores the super admin's currently selected agency for scoped views.
-- Migration 048 tried to rename admin_school_context -> admin_agency_context,
-- but the original table was never created in any prior migration.

DROP TABLE IF EXISTS public.admin_agency_context;

CREATE TABLE public.admin_agency_context (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_agency_context_admin ON public.admin_agency_context(admin_id);

ALTER TABLE public.admin_agency_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage own context"
  ON public.admin_agency_context
  FOR ALL
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());
