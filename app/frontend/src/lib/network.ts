import { supabase } from "./supabase";
import type { ReactionType } from "./types";

export const REACTIONS: { type: ReactionType; en: string; ar: string; icon: string }[] = [
  { type: "like", en: "Like", ar: "إعجاب", icon: "👍" },
  { type: "celebrate", en: "Celebrate", ar: "تهنئة", icon: "🎉" },
  { type: "support", en: "Support", ar: "دعم", icon: "💪" },
  { type: "insightful", en: "Insightful", ar: "ملهم", icon: "💡" },
  { type: "curious", en: "Curious", ar: "مهتم", icon: "🤔" },
];

export async function fetchMyReactions(userId: string, postIds: string[]) {
  const map = new Map<string, ReactionType>();
  if (!userId || postIds.length === 0) return map;
  const { data } = await supabase
    .from("social_post_likes")
    .select("post_id, reaction")
    .eq("user_id", userId)
    .in("post_id", postIds);
  (data || []).forEach((row: { post_id: string; reaction: ReactionType }) => {
    map.set(row.post_id, row.reaction || "like");
  });
  return map;
}

export async function setPostReaction(
  userId: string,
  postId: string,
  reaction: ReactionType | null,
  current?: ReactionType | null,
): Promise<{ error?: string }> {
  if (!reaction || current === reaction) {
    const { error } = await supabase
      .from("social_post_likes")
      .delete()
      .eq("user_id", userId)
      .eq("post_id", postId);
    return error ? { error: error.message } : {};
  }
  if (current) {
    const { error } = await supabase
      .from("social_post_likes")
      .update({ reaction })
      .eq("user_id", userId)
      .eq("post_id", postId);
    return error ? { error: error.message } : {};
  }
  const { error } = await supabase.from("social_post_likes").insert({
    user_id: userId,
    post_id: postId,
    reaction,
  });
  return error ? { error: error.message } : {};
}

export async function fetchSavedPostIds(userId: string): Promise<string[]> {
  const { data } = await supabase.from("social_post_saves").select("post_id").eq("user_id", userId);
  return (data || []).map((row: { post_id: string }) => row.post_id);
}

export async function setPostSaved(userId: string, postId: string, saved: boolean) {
  if (saved) {
    const { error } = await supabase.from("social_post_saves").insert({ user_id: userId, post_id: postId });
    return error && !error.message.includes("duplicate") ? { error: error.message } : {};
  }
  const { error } = await supabase
    .from("social_post_saves")
    .delete()
    .eq("user_id", userId)
    .eq("post_id", postId);
  return error ? { error: error.message } : {};
}

export async function fetchNetworkAuthorIds(userId: string): Promise<string[]> {
  const [{ data: connections }, { data: follows }] = await Promise.all([
    supabase
      .from("member_connections")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
    supabase.from("member_follows").select("following_id").eq("follower_id", userId),
  ]);
  const ids = new Set<string>([userId]);
  (connections || []).forEach((row: { requester_id: string; addressee_id: string }) => {
    ids.add(row.requester_id === userId ? row.addressee_id : row.requester_id);
  });
  (follows || []).forEach((row: { following_id: string }) => ids.add(row.following_id));
  return [...ids];
}

export async function isFollowing(followerId: string, followingId: string) {
  const { data } = await supabase
    .from("member_follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return !!data;
}

export async function toggleFollow(followerId: string, followingId: string, following: boolean) {
  if (following) {
    const { error } = await supabase
      .from("member_follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
    return error ? { error: error.message } : {};
  }
  const { error } = await supabase
    .from("member_follows")
    .insert({ follower_id: followerId, following_id: followingId });
  return error ? { error: error.message } : {};
}

export async function fetchFollowerCount(profileId: string) {
  const { count } = await supabase
    .from("member_follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profileId);
  return count || 0;
}

export async function fetchEndorsements(profileId: string) {
  const { data } = await supabase
    .from("skill_endorsements")
    .select("skill, endorser_id")
    .eq("profile_id", profileId);
  const counts = new Map<string, { count: number; mine: boolean; endorsers: string[] }>();
  (data || []).forEach((row: { skill: string; endorser_id: string }) => {
    const current = counts.get(row.skill) || { count: 0, mine: false, endorsers: [] };
    current.count += 1;
    current.endorsers.push(row.endorser_id);
    counts.set(row.skill, current);
  });
  return counts;
}

export async function toggleEndorsement(endorserId: string, profileId: string, skill: string, endorsed: boolean) {
  if (endorsed) {
    const { error } = await supabase
      .from("skill_endorsements")
      .delete()
      .eq("endorser_id", endorserId)
      .eq("profile_id", profileId)
      .eq("skill", skill);
    return error ? { error: error.message } : {};
  }
  const { error } = await supabase.from("skill_endorsements").insert({
    endorser_id: endorserId,
    profile_id: profileId,
    skill,
  });
  return error ? { error: error.message } : {};
}

export async function recordProfileView(viewerId: string, viewedProfileId: string) {
  if (!viewerId || !viewedProfileId || viewerId === viewedProfileId) return;
  const key = `fen-viewed-${viewedProfileId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  await supabase.from("profile_views").insert({
    viewer_id: viewerId,
    viewed_profile_id: viewedProfileId,
  });
}

export async function fetchProfileViewCount(profileId: string) {
  const { count } = await supabase
    .from("profile_views")
    .select("*", { count: "exact", head: true })
    .eq("viewed_profile_id", profileId);
  return count || 0;
}

export async function fetchAcceptedRecommendations(subjectId: string) {
  const { data } = await supabase
    .from("member_recommendations")
    .select("id, author_id, relationship, body, status, created_at")
    .eq("subject_id", subjectId)
    .eq("status", "accepted")
    .order("created_at", { ascending: false });
  return data || [];
}

export async function submitRecommendation(authorId: string, subjectId: string, body: string, relationship: string) {
  const { error } = await supabase.from("member_recommendations").insert({
    author_id: authorId,
    subject_id: subjectId,
    body: body.trim(),
    relationship,
    status: "pending",
  });
  return error ? { error: error.message } : {};
}

export async function respondRecommendation(id: string, status: "accepted" | "hidden") {
  const { error } = await supabase
    .from("member_recommendations")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  return error ? { error: error.message } : {};
}
