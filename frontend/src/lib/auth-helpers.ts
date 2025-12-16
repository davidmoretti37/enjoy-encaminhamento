/**
 * Supabase Authentication Helpers
 *
 * These helper functions integrate Supabase Auth with the existing
 * tRPC/React Query setup.
 */

import type { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { FRONTEND_ENV } from "./env";

// Get API URL for direct fetch calls (tRPC client not available here)
const API_URL = FRONTEND_ENV.apiUrl || "http://localhost:5001";

interface SignUpMetadata {
  name?: string;
  role?: "company" | "candidate";
  school_id?: string;
}

interface AuthData {
  user: User | null;
  session: Session | null;
}

/**
 * Sign up a new user with email and password
 */
export async function signUp(
  email: string,
  password: string,
  metadata?: SignUpMetadata
): Promise<AuthData> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });

  if (error) throw error;

  // After successful signup, create user profile via backend API (bypasses RLS)
  if (data.user) {
    try {
      const response = await fetch(`${API_URL}/api/trpc/auth.createProfile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          json: {
            userId: data.user.id,
            email: data.user.email,
            name: metadata?.name,
            role: metadata?.role || "candidate",
            school_id: metadata?.school_id || null,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to create user profile:", errorData);
      }
    } catch (profileError) {
      console.error("Failed to create user profile:", profileError);
      // Auth user is created, profile creation can be retried
    }
  }

  return data;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<AuthData> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * Sign in with OAuth provider (Google, GitHub, etc.)
 */
export async function signInWithOAuth(
  provider: "google" | "github" | "facebook"
): Promise<{ provider: string; url: string | null }> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

/**
 * Reset password (send reset email)
 */
export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) throw error;
}

/**
 * Update password (after receiving reset email)
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}

/**
 * Listen for auth state changes
 * Returns an unsubscribe function
 */
export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return () => subscription.unsubscribe();
}

/**
 * Get the current auth token for tRPC requests
 */
export async function getAuthToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}
