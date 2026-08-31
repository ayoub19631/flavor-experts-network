import { supabase } from "./supabase";
import type { SocialPost, SocialPostComment } from "./types";

export async function enrichSocialPosts(posts: SocialPost[]): Promise<SocialPost[]> {
  if (posts.length === 0) return [];
  const ids = [...new Set(posts.map((p) => p.author_id))];

  const [{ data: profiles }, { data: directory }] = await Promise.all([
    supabase
      .from("public_author_profiles")
      .select("id, full_name, avatar_url, role, company, account_type")
      .in("id", ids),
    supabase
      .from("member_directory")
      .select("id, profile_id")
      .in("profile_id", ids),
  ]);

  const map = new Map((profiles || []).map((p) => [p.id, p]));
  const memberMap = new Map((directory || []).map((m) => [m.profile_id, m.id]));

  const originalsNeeded = [...new Set(posts.map((p) => p.repost_of_id).filter(Boolean))] as string[];
  const originals = new Map<string, SocialPost>();
  if (originalsNeeded.length > 0) {
    const { data } = await supabase.from("social_posts").select("*").in("id", originalsNeeded);
    const extraAuthors = [...new Set(((data as SocialPost[]) || []).map((row) => row.author_id))];
    const { data: extraProfiles } = extraAuthors.length
      ? await supabase
          .from("public_author_profiles")
          .select("id, full_name, avatar_url, role, company, account_type")
          .in("id", extraAuthors)
      : { data: [] };
    const extraMap = new Map((extraProfiles || []).map((p) => [p.id, p]));
    ((data as SocialPost[]) || []).forEach((row) => {
      originals.set(row.id, {
        ...row,
        author: extraMap.get(row.author_id) || row.author,
      });
    });
  }

  return posts.map((p) => {
    const author = map.get(p.author_id) || p.author;
    return {
      ...p,
      comments_count: p.comments_count ?? 0,
      author: author
        ? { ...author, member_id: memberMap.get(p.author_id) ?? null }
        : author,
      original: p.repost_of_id ? originals.get(p.repost_of_id) || null : null,
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

export async function enrichComments(
  comments: SocialPostComment[],
): Promise<SocialPostComment[]> {
  if (comments.length === 0) return [];
  const ids = [...new Set(comments.map((c) => c.author_id))];
  const { data: profiles } = await supabase
    .from("public_author_profiles")
    .select("id, full_name, avatar_url")
    .in("id", ids);
  const map = new Map((profiles || []).map((p) => [p.id, p]));
  return comments.map((c) => ({
    ...c,
    author: map.get(c.author_id) || c.author,
  }));
}

export async function uploadCommunityImage(file: File): Promise<{ url?: string; error?: string }> {
  if (!file.type.startsWith("image/")) {
    return { error: "Please choose an image (JPEG, PNG, WebP)" };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { error: "Image must be under 8MB" };
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `community/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("platform-uploads")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: error.message };
  const { data } = supabase.storage.from("platform-uploads").getPublicUrl(path);
  return { url: data.publicUrl };
}
