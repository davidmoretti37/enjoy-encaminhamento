// Notification database operations
// Use the admin client so server-side writes are not blocked by RLS
// (the `notifications` table has no INSERT policy for end-users).
import { supabaseAdmin as supabase } from "../supabase";
import type { Notification } from "./types";

export async function getNotificationsByUserId(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];
  return data || [];
}

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) return 0;
  return count || 0;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
}

export async function createNotification(params: {
  user_id: string;
  title: string;
  message: string;
  type: string;
  related_to_type?: string;
  related_to_id?: string;
}): Promise<string> {
  const { data, error } = await (supabase as any)
    .from("notifications")
    .insert({
      user_id: params.user_id,
      title: params.title,
      message: params.message,
      type: params.type,
      related_to_type: params.related_to_type,
      related_to_id: params.related_to_id,
      is_read: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Database] Failed to create notification:", error);
    throw error;
  }

  return data.id;
}
