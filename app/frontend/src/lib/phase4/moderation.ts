import { supabase } from "@/lib/supabase";

export type ReportableType =
  | "post"
  | "comment"
  | "member"
  | "message"
  | "forum_topic"
  | "forum_reply"
  | "job"
  | "company"
  | "publication";

export async function reportContent(input: {
  entityType: ReportableType;
  entityId: string;
  reason: string;
  details?: string;
}) {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) return { error: "Sign in required." };
  const { error } = await supabase.from("content_reports").insert({
    reporter_id: userId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    reason: input.reason,
    details: input.details || null,
    status: "open",
  });
  return { error: error?.message || null };
}

export async function blockMember(userId: string) {
  const { data: session } = await supabase.auth.getUser();
  const me = session.user?.id;
  if (!me) return { error: "Sign in required." };
  const { error } = await supabase.from("member_blocks").insert({ blocker_id: me, blocked_id: userId });
  return { error: error?.message || null };
}

export async function muteMember(userId: string) {
  const { data: session } = await supabase.auth.getUser();
  const me = session.user?.id;
  if (!me) return { error: "Sign in required." };
  const { error } = await supabase.from("member_mutes").insert({ muter_id: me, muted_id: userId });
  return { error: error?.message || null };
}

export async function fetchMyBlocks() {
  const { data } = await supabase.from("member_blocks").select("blocked_id");
  return new Set((data || []).map((row) => row.blocked_id as string));
}

export async function fetchMyMutes() {
  const { data } = await supabase.from("member_mutes").select("muted_id");
  return new Set((data || []).map((row) => row.muted_id as string));
}

export async function softDeleteEntity(table: string, id: string, reason: string) {
  const { data: session } = await supabase.auth.getUser();
  const { error } = await supabase
    .from(table)
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: session.user?.id || null,
      deletion_reason: reason,
    })
    .eq("id", id);
  if (!error) {
    await supabase.rpc("write_audit_log", {
      p_action: "soft_delete",
      p_entity_type: table,
      p_entity_id: id,
      p_old: null,
      p_new: null,
      p_reason: reason,
    });
  }
  return { error: error?.message || null };
}

export async function restoreEntity(table: string, id: string, reason: string) {
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: null, deleted_by: null, deletion_reason: null })
    .eq("id", id);
  if (!error) {
    await supabase.rpc("write_audit_log", {
      p_action: "restore",
      p_entity_type: table,
      p_entity_id: id,
      p_old: null,
      p_new: null,
      p_reason: reason,
    });
  }
  return { error: error?.message || null };
}
