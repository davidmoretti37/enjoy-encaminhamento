-- Drop triggers that reference dropped/renamed tables (schools → agencies)
-- These fire on every INSERT into jobs and payments, crashing all creation
DROP TRIGGER IF EXISTS trigger_set_job_franchise_id ON public.jobs;
DROP TRIGGER IF EXISTS trigger_set_payment_franchise_id ON public.payments;

-- Drop the broken functions
DROP FUNCTION IF EXISTS set_job_franchise_id();
DROP FUNCTION IF EXISTS set_payment_franchise_id();
