import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Database } from "../types/database";
import { supabase, supabaseAdmin } from "../supabase";

type User = Database['public']['Tables']['users']['Row'];

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// ============ Auth Cache ============
// Cache auth results in memory to avoid calling Supabase on every request
const authCache = new Map<string, { user: User; expiresAt: number }>();
const AUTH_CACHE_TTL_MS = 60_000; // 1 minute

function getCachedUser(token: string): User | null {
  const cached = authCache.get(token);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.user;
  }
  if (cached) authCache.delete(token);
  return null;
}

function setCachedUser(token: string, user: User) {
  authCache.set(token, { user, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });
  // Evict old entries periodically
  if (authCache.size > 500) {
    const now = Date.now();
    for (const [key, val] of authCache) {
      if (now >= val.expiresAt) authCache.delete(key);
    }
  }
}

// ============ Circuit Breaker ============
// Stop hammering Supabase when it's unreachable
let circuitOpen = false;
let circuitOpenUntil = 0;
const CIRCUIT_COOLDOWN_MS = 15_000; // 15 seconds

function isCircuitOpen(): boolean {
  if (!circuitOpen) return false;
  if (Date.now() >= circuitOpenUntil) {
    circuitOpen = false;
    console.log('[Auth] Circuit breaker reset - retrying Supabase');
    return false;
  }
  return true;
}

function tripCircuit() {
  circuitOpen = true;
  circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
  console.warn('[Auth] Circuit breaker tripped - skipping Supabase auth for 15s');
}

// ============ Retry (reduced) ============
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 500
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      const isNetworkError = e?.cause?.code === 'ECONNRESET' ||
                             e?.cause?.code === 'ETIMEDOUT' ||
                             e?.code === 'ECONNRESET' ||
                             e?.code === 'ETIMEDOUT' ||
                             e?.message?.includes('fetch failed');

      if (!isNetworkError || attempt === maxRetries - 1) {
        throw e;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      console.log(`[Auth] Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
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
    const authHeader = opts.req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || opts.req.cookies?.['sb-access-token'];

    if (token) {
      // 1. Check cache first
      const cached = getCachedUser(token);
      if (cached) {
        return { req: opts.req, res: opts.res, user: cached };
      }

      // 2. If circuit breaker is open, skip Supabase entirely
      if (isCircuitOpen()) {
        return { req: opts.req, res: opts.res, user: null };
      }

      // 3. Verify with Supabase (reduced retries)
      let authUser = null;
      try {
        const result = await withRetry(async () => {
          const res = await supabase.auth.getUser(token);
          if (res.error) throw res.error;
          return res;
        });
        authUser = result.data?.user;
      } catch (e: any) {
        const isNetworkError = e?.message?.includes('fetch failed') ||
                               e?.cause?.code === 'ECONNRESET' ||
                               e?.cause?.code === 'ETIMEDOUT';
        if (isNetworkError) {
          tripCircuit();
        } else {
          console.error('[Auth] Auth error:', e.message || e);
        }
      }

      if (authUser) {
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
            setCachedUser(token, user);
          } else {
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
            setCachedUser(token, user);
          }
        } catch (e: any) {
          const isNetworkError = e?.message?.includes('fetch failed') ||
                                 e?.cause?.code === 'ECONNRESET' ||
                                 e?.cause?.code === 'ETIMEDOUT';
          if (isNetworkError) {
            tripCircuit();
          } else {
            console.error('[Auth] Profile fetch error:', e.message || e);
          }
        }
      }
    }
  } catch (error) {
    console.error('[Auth] Error in createContext:', error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
