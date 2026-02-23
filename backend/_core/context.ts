import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Database } from "../types/database";
import { supabase, supabaseAdmin } from "../supabase";

type User = Database['public']['Tables']['users']['Row'];

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// Helper function for retry with exponential backoff
async function withRetry<T>(
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

      const delay = baseDelayMs * Math.pow(2, attempt); // 500, 1000, 2000, 4000, 8000
      console.log(`[Auth] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Extract JWT token from Authorization header or cookie
    const authHeader = opts.req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || opts.req.cookies?.['sb-access-token'];

    if (token) {
      // Verify the Supabase token with retry logic
      let authUser = null;
      let authError = null;

      try {
        const result = await withRetry(async () => {
          const res = await supabase.auth.getUser(token);
          if (res.error) throw res.error;
          return res;
        });
        authUser = result.data?.user;
      } catch (e: any) {
        authError = e;
        console.error('[Auth] Supabase auth error after retries:', e.message || e);
      }

      if (!authError && authUser) {
        // Get user profile from our users table using admin client to bypass RLS
        // Use maybeSingle() to handle case where user profile doesn't exist yet
        try {
          const { data: userProfile, error: profileError } = await withRetry(async () => {
            return await supabaseAdmin
              .from('users')
              .select('*')
              .eq('id', authUser.id)
              .maybeSingle();
          });

          if (profileError) {
            console.error('[Auth] Profile error:', profileError.message);
          }

          if (userProfile) {
            user = userProfile;
          } else {
            // User authenticated but no profile yet - create minimal user object from auth data
            // This can happen right after signup before the profile insert completes
            console.log('[Auth] No profile found for user, using auth data:', authUser.id);
            user = {
              id: authUser.id,
              email: authUser.email || '',
              name: authUser.user_metadata?.name || null,
              role: authUser.user_metadata?.role || null,
              agency_id: authUser.user_metadata?.agency_id || null,
              created_at: authUser.created_at,
              updated_at: null,
              last_signed_in: null,
              last_login: null,
              profile_photo_url: null,
            };
          }
        } catch (e: any) {
          console.error('[Auth] Profile fetch error after retries:', e.message || e);
        }
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    console.error('[Auth] Error in createContext:', error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
