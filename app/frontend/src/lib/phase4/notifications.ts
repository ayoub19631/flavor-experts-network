import { supabase } from "@/lib/supabase";

export type AppNotification = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
  actor_id?: string | null;
};

export async function listNotifications(limit = 40) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, title, body, type, link, is_read, created_at, actor_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  return { data: (data as AppNotification[]) || [], error: error?.message || null };
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  return { error: error?.message || null };
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
  return { error: error?.message || null };
}

export async function deleteNotification(id: string) {
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  return { error: error?.message || null };
}

export async function upsertNotificationPreferences(userId: string, values: { in_app?: boolean; email?: boolean; digest?: string }) {
  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: userId,
    ...values,
    updated_at: new Date().toISOString(),
  });
  return { error: error?.message || null };
}
