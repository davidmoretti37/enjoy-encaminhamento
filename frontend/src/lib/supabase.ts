import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../backend/types/database";
import { FRONTEND_ENV } from "./env";

export const supabase = createClient<Database>(
  FRONTEND_ENV.supabaseUrl,
  FRONTEND_ENV.supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: sessionStorage, // Tab-isolated storage - allows different accounts in different tabs
    },
  }
);
