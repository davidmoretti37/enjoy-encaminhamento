import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Database } from "../types/database";
import { supabase } from "../supabase";
import { createClient } from '@supabase/supabase-js';

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

      if (authError) {
        console.error('[Auth] Supabase auth error:', authError.message);
      }

      if (!authError && authUser) {
        // Create a Supabase client with the user's token to bypass RLS
        const userSupabase = createClient(
          process.env.SUPABASE_URL || 'https://jpdqxjaosattvzjjumxz.supabase.co',
          process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZHF4amFvc2F0dHZ6amp1bXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTQ4MDIsImV4cCI6MjA3ODM3MDgwMn0.7Vqa9BJSaXmtr1Vf85lfsdwUECbY4DdL8fi6gX9zB-E',
          {
            global: {
              headers: {
                Authorization: `Bearer ${token}`
              }
            }
          }
        );

        // Get user profile from our users table using the user's token
        const { data: userProfile, error: profileError } = await userSupabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError) {
          console.error('[Auth] Profile error:', profileError.message);
        }

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
