import { createClient } from "@supabase/supabase-js";
import { E2E_ENV } from "./env";

// Service-role client. ONLY for tests against a non-prod Supabase project.
export const admin = createClient(
  E2E_ENV.supabaseUrl,
  E2E_ENV.supabaseServiceRoleKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
