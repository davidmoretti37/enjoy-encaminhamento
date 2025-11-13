-- =====================================================
-- REMOVE FRANCHISES TABLE (REDUNDANT)
-- =====================================================

-- Drop the franchises table and related objects
-- This table is redundant - we use affiliates (franchise owners) and schools instead

-- Drop the table (this will cascade and drop foreign keys)
DROP TABLE IF EXISTS public.franchises CASCADE;

-- Drop any related views if they exist
DROP VIEW IF EXISTS public.franchise_revenue_summary CASCADE;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================

-- Note: The franchise system now consists of:
-- 1. affiliates table = Franchise owners (manage schools in their city)
-- 2. schools table = Educational institutions (linked to affiliates via affiliate_id)
