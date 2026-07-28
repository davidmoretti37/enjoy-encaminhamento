-- =====================================================================
-- 121_add_clt_fee_payment_type.sql
-- =====================================================================
-- ANEC report item #16: the payment "Tipo" list needs a "Taxa CLT" option
-- (distinct from the estágio "Taxa de Setup"). Add the enum value so
-- payments of type CLT fee can be recorded.
-- =====================================================================
ALTER TYPE payment_type ADD VALUE IF NOT EXISTS 'clt-fee';
