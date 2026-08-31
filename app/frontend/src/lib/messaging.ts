import { supabase } from "./supabase";

export interface ConversationPreview {
  id: string;
  updated_at: string;
  peer_id: string;
  peer_name: string;
  peer_avatar?: string | null;
  last_body?: string;
  unread: boolean;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export async function startConversation(otherUserId: string): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase.rpc("start_conversation", { p_other: otherUserId });
  if (error) return { error: error.message };
  return { id: data as string };
}

export async function listConversations(userId: string): Promise<ConversationPreview[]> {
  const { data: memberships } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);
  const ids = (memberships || []).map((m: { conversation_id: string }) => m.conversation_id);
  if (ids.length === 0) return [];

  const [{ data: convos }, { data: members }, { data: latest }] = await Promise.all([
    supabase.from("conversations").select("id, updated_at").in("id", ids).order("updated_at", { ascending: false }),
    supabase.from("conversation_members").select("conversation_id, user_id").in("conversation_id", ids),
    supabase
      .from("conversation_messages")
      .select("conversation_id, body, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false }),
  ]);

  const lastByConv = new Map<string, { body: string; created_at: string }>();
  (latest || []).forEach((row: { conversation_id: string; body: string; created_at: string }) => {
    if (!lastByConv.has(row.conversation_id)) lastByConv.set(row.conversation_id, row);
  });

  const peerIds = (members || [])
    .filter((m: { user_id: string }) => m.user_id !== userId)
    .map((m: { user_id: string; conversation_id: string }) => m.user_id);
  const { data: profiles } = await supabase
    .from("public_author_profiles")
    .select("id, full_name, avatar_url")
    .in("id", [...new Set(peerIds)]);
  const profileMap = new Map((profiles || []).map((p: { id: string }) => [p.id, p]));
  const readMap = new Map(
    (memberships || []).map((m: { conversation_id: string; last_read_at: string | null }) => [
      m.conversation_id,
      m.last_read_at,
    ]),
  );

  return (convos || []).map((c: { id: string; updated_at: string }) => {
    const peer = (members || []).find(
      (m: { conversation_id: string; user_id: string }) => m.conversation_id === c.id && m.user_id !== userId,
    );
    const profile = peer ? profileMap.get(peer.user_id) : null;
    const last = lastByConv.get(c.id);
    const lastRead = readMap.get(c.id);
    return {
      id: c.id,
      updated_at: c.updated_at,
      peer_id: peer?.user_id || "",
      peer_name: (profile as { full_name?: string } | undefined)?.full_name || "Member",
      peer_avatar: (profile as { avatar_url?: string } | undefined)?.avatar_url || null,
      last_body: last?.body,
      unread: !!(last && (!lastRead || last.created_at > lastRead)),
    };
  });
}

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from("conversation_messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(120);
  return (data as ChatMessage[]) || [];
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const { error } = await supabase.from("conversation_messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    body: body.trim(),
  });
  return error ? { error: error.message } : {};
}

export async function markConversationRead(conversationId: string, userId: string) {
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

export async function unreadMessageCount(userId: string) {
  const rows = await listConversations(userId);
  return rows.filter((r) => r.unread).length;
}
