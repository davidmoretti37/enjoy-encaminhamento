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

// Retry wrapper for Supabase calls with exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelayMs: number = 500
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      const isNetworkError = e?.cause?.code === 'ECONNRESET' ||
                             e?.code === 'ECONNRESET' ||
                             e?.message?.includes('fetch failed') ||
                             e?.message?.includes('ECONNRESET');

      if (!isNetworkError || attempt === maxRetries - 1) {
        throw e;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      console.log(`[Supabase] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}
