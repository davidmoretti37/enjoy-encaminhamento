// User database operations
import { supabase, supabaseAdmin } from "../supabase";
import type { User, InsertUser } from "./types";

export async function getUserById(id: string): Promise<User | undefined> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Failed to get user:", error);
    return undefined;
  }

  return data || undefined;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  const { error } = await supabaseAdmin
    .from("users")
    .upsert(user, { onConflict: "id" });

  if (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

// Create user profile during signup - uses admin client to bypass RLS
export async function createUserProfile(profile: {
  id: string;
  email: string;
  name: string | null;
  role: "company" | "candidate";
  agency_id: string | null;
}): Promise<{ error: any }> {
  const { error } = await supabaseAdmin.from("users").insert({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    agency_id: profile.agency_id,
  });

  return { error };
}
