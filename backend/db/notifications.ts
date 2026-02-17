// @ts-nocheck
// Notification database operations
import { supabaseAdmin } from "../supabase";
import type { Notification } from "./types";

export async function getNotificationsByUserId(userId: string): Promise<Notification[]> {
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];
  return data || [];
}

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) return 0;
  return count || 0;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
}

export async function createNotification(notification: {
  user_id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  related_to_type?: string;
  related_to_id?: string;
}): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .insert({
      user_id: notification.user_id,
      title: notification.title,
      message: notification.message,
      type: notification.type || 'info',
      related_to_type: notification.related_to_type || null,
      related_to_id: notification.related_to_id || null,
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
