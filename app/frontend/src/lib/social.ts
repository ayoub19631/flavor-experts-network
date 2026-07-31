import { supabase } from "./supabase";
import type { SocialPost } from "./types";

export async function enrichSocialPosts(posts: SocialPost[]): Promise<SocialPost[]> {
  if (posts.length === 0) return [];
  const ids = [...new Set(posts.map((p) => p.author_id))];

  const [{ data: profiles }, { data: directory }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id, full_name, avatar_url, role, company, account_type")
      .in("id", ids),
    // Public directory maps profiles → public member pages (no emails exposed).
    supabase
      .from("member_directory")
      .select("id, profile_id")
      .in("profile_id", ids),
  ]);

  const map = new Map((profiles || []).map((p) => [p.id, p]));
  const memberMap = new Map((directory || []).map((m) => [m.profile_id, m.id]));

  return posts.map((p) => {
    const author = map.get(p.author_id) || p.author;
    return {
      ...p,
      author: author
        ? { ...author, member_id: memberMap.get(p.author_id) ?? null }
        : author,
    };
  });
}

export async function fetchMyLikedPostIds(userId: string, postIds: string[]): Promise<Set<string>> {
  if (!userId || postIds.length === 0) return new Set();
  const { data } = await supabase
    .from("social_post_likes")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);
  return new Set((data || []).map((r) => r.post_id));
}
