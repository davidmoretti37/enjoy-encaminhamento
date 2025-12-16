import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types/database";
import { ENV } from "./_core/env";

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(ENV.supabaseUrl, ENV.supabaseAnonKey);

// Service role client for admin operations (use service role key if available)
export const supabaseAdmin = createClient<Database>(
  ENV.supabaseUrl,
  ENV.supabaseServiceRoleKey || ENV.supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
