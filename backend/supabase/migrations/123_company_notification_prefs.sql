-- =====================================================================
-- 123_company_notification_prefs.sql
-- =====================================================================
-- ANEC report item #22: the company's notification preferences were not
-- persisted (updateNotificationPrefs threw NOT_IMPLEMENTED). Store them as a
-- jsonb blob on the company so toggles survive a reload.
-- =====================================================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS notification_prefs jsonb;
