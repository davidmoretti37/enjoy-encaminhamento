import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Database } from "../types/database";
import { supabase } from "../supabase";

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
      // Verify the Supabase token
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

      if (!authError && authUser) {
        // Get user profile from our users table
        const { data: userProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (userProfile) {
          user = userProfile;
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
