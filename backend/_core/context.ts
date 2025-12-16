import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Database } from "../types/database";
import { supabase, supabaseAdmin } from "../supabase";

type User = Database['public']['Tables']['users']['Row'];

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

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

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await supabase.auth.getUser(token);
          authUser = result.data?.user;
          authError = result.error;
          if (!authError) break;
        } catch (e: any) {
          authError = e;
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
          }
        }
      }

      if (authError) {
        console.error('[Auth] Supabase auth error:', authError.message || authError);
      }

      if (!authError && authUser) {
        // Get user profile from our users table using admin client to bypass RLS
        // Use maybeSingle() to handle case where user profile doesn't exist yet
        const { data: userProfile, error: profileError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

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
            school_id: authUser.user_metadata?.school_id || null,
            created_at: authUser.created_at,
            updated_at: null,
            last_signed_in: null,
            last_login: null,
            profile_photo_url: null,
          };
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
