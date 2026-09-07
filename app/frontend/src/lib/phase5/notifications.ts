import { supabase } from "@/lib/supabase";
import { isMissingRelation, isPhase5WorkflowsEnabled } from "./flags";
import type { AppNotification } from "@/lib/phase4/notifications";
import {
  deleteNotification as deleteLegacy,
  listNotifications as listLegacy,
  markAllNotificationsRead as markAllLegacy,
  markNotificationRead as markOneLegacy,
} from "@/lib/phase4/notifications";

export type { AppNotification };

export async function listMyNotifications(limit = 20, before?: string) {
  if (!isPhase5WorkflowsEnabled()) return listLegacy(limit);
  const { data, error } = await supabase.rpc("list_my_notifications", {
    p_limit: limit,
    p_before: before || null,
  });
  if (error) {
    if (isMissingRelation(error.message)) return listLegacy(limit);
    return { data: [] as AppNotification[], error: error.message };
  }
  return { data: (data as AppNotification[]) || [], error: null };
}

export async function unreadNotificationCount() {
  if (!isPhase5WorkflowsEnabled()) {
    const { data } = await listLegacy(40);
    return { count: data.filter((row) => !row.is_read).length, error: null };
  }
  const { data, error } = await supabase.rpc("unread_notification_count");
  if (error) {
    if (isMissingRelation(error.message)) {
      const fallback = await listLegacy(40);
      return { count: fallback.data.filter((row) => !row.is_read).length, error: null };
    }
    return { count: 0, error: error.message };
  }
  return { count: Number(data || 0), error: null };
}

export async function markMyNotificationRead(id: string) {
  const { error } = await supabase.rpc("mark_notification_read", { p_id: id });
  if (error && isMissingRelation(error.message)) return markOneLegacy(id);
  return { error: error?.message || null };
}

export async function markAllMyNotificationsRead(userId?: string) {
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error && isMissingRelation(error.message) && userId) return markAllLegacy(userId);
  return { error: error?.message || null };
}

export async function removeMyNotification(id: string) {
  return deleteLegacy(id);
}
