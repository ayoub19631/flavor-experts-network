import { supabase } from "./supabase";

export type ConnectionStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface MemberConnection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: ConnectionStatus;
  message?: string | null;
  created_at: string;
}

/** Resolve auth user id from a member_directory row (profile_id or linked user). */
export async function resolveMemberUserId(member: {
  id: string;
  profile_id?: string | null;
}): Promise<string | null> {
  if (member.profile_id) return member.profile_id;
  const { data } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", member.id)
    .maybeSingle();
  return data?.id ?? null;
}

export async function getConnectionBetween(
  userId: string,
  otherUserId: string,
): Promise<MemberConnection | null> {
  const { data } = await supabase
    .from("member_connections")
    .select("id, requester_id, addressee_id, status, message, created_at")
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${userId})`,
    )
    .maybeSingle();
  return (data as MemberConnection) || null;
}

export async function sendConnectionRequest(
  requesterId: string,
  addresseeId: string,
  message?: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("member_connections").insert({
    requester_id: requesterId,
    addressee_id: addresseeId,
    status: "pending",
    message: message?.trim() || null,
  });
  return error ? { error: error.message } : {};
}

export async function respondToConnection(
  connectionId: string,
  status: "accepted" | "declined" | "cancelled",
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("member_connections")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", connectionId);
  return error ? { error: error.message } : {};
}

export async function listPendingIncoming(userId: string): Promise<MemberConnection[]> {
  const { data } = await supabase
    .from("member_connections")
    .select("id, requester_id, addressee_id, status, message, created_at")
    .eq("addressee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return (data as MemberConnection[]) || [];
}

export async function listAcceptedConnections(userId: string): Promise<MemberConnection[]> {
  const { data } = await supabase
    .from("member_connections")
    .select("id, requester_id, addressee_id, status, message, created_at")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(24);
  return (data as MemberConnection[]) || [];
}

export function peerUserId(connection: MemberConnection, userId: string): string {
  return connection.requester_id === userId ? connection.addressee_id : connection.requester_id;
}

export async function fetchProfileNames(userIds: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data } = await supabase
    .from("public_author_profiles")
    .select("id, full_name")
    .in("id", unique);
  const map: Record<string, string> = {};
  (data || []).forEach((p: { id: string; full_name: string }) => {
    map[p.id] = p.full_name;
  });
  return map;
}

/** Map auth profile ids → public member_directory ids for profile links. */
export async function fetchMemberIdsByProfileIds(
  profileIds: string[],
): Promise<Record<string, string>> {
  const unique = [...new Set(profileIds.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data } = await supabase
    .from("member_directory")
    .select("id, profile_id")
    .in("profile_id", unique);
  const map: Record<string, string> = {};
  (data || []).forEach((m: { id: string; profile_id: string | null }) => {
    if (m.profile_id) map[m.profile_id] = m.id;
  });
  return map;
}
