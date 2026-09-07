import { supabase } from "@/lib/supabase";
import { isMissingRelation } from "./flags";

export type ModerationReport = {
  id: string;
  reporter_id: string;
  entity_type: string;
  entity_id: string;
  reason: string;
  details?: string | null;
  status: string;
  priority?: string;
  created_at: string;
};

export type TrashRow = {
  entity_type: string;
  entity_id: string;
  owner_id?: string | null;
  deleted_by?: string | null;
  reason?: string | null;
  deleted_at?: string | null;
};

export async function listModerationQueue(filters: {
  status?: string;
  entityType?: string;
  reason?: string;
  priority?: string;
  from?: string;
  offset?: number;
}) {
  const { data, error } = await supabase.rpc("list_moderation_queue", {
    p_status: filters.status || null,
    p_entity_type: filters.entityType || null,
    p_reason: filters.reason || null,
    p_priority: filters.priority || null,
    p_from: filters.from || null,
    p_to: null,
    p_limit: 20,
    p_offset: filters.offset || 0,
  });
  if (error && isMissingRelation(error.message)) {
    const fallback = await supabase.from("content_reports").select("*").order("created_at", { ascending: false }).limit(20);
    return { data: (fallback.data as ModerationReport[]) || [], error: fallback.error?.message || null };
  }
  return { data: (data as ModerationReport[]) || [], error: error?.message || null };
}

export async function applyModeration(input: {
  reportId?: string | null;
  action: "dismiss" | "hide" | "restore" | "under_review" | "warn";
  reason: string;
  entityType?: string;
  entityId?: string;
}) {
  const { error } = await supabase.rpc("apply_moderation_action", {
    p_report_id: input.reportId || null,
    p_action: input.action,
    p_reason: input.reason,
    p_entity_type: input.entityType || null,
    p_entity_id: input.entityId || null,
  });
  return { error: error?.message || null };
}

export async function listTrash(offset = 0) {
  const { data, error } = await supabase.rpc("list_moderation_trash", {
    p_limit: 20,
    p_offset: offset,
  });
  return { data: (data as TrashRow[]) || [], error: error?.message || null };
}
