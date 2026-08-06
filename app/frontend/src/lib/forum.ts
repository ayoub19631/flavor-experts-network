import { supabase } from "./supabase";
import type { ForumAuthor, ForumReply, ForumTopic } from "./types";

export async function fetchAuthorsMap(
  authorIds: string[],
): Promise<Map<string, ForumAuthor>> {
  const unique = [...new Set(authorIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data } = await supabase
    .from("public_author_profiles")
    .select("id, full_name, avatar_url")
    .in("id", unique);

  return new Map(
    (data || []).map((p) => [
      p.id,
      { full_name: p.full_name, avatar_url: p.avatar_url },
    ]),
  );
}

export function attachAuthorsToTopics(
  topics: ForumTopic[],
  authors: Map<string, ForumAuthor>,
): ForumTopic[] {
  return topics.map((topic) => ({
    ...topic,
    author: authors.get(topic.author_id) ?? topic.author,
  }));
}

export function attachAuthorsToReplies(
  replies: ForumReply[],
  authors: Map<string, ForumAuthor>,
): ForumReply[] {
  return replies.map((reply) => ({
    ...reply,
    author: authors.get(reply.author_id) ?? reply.author,
  }));
}

export async function enrichTopicsWithAuthors(
  topics: ForumTopic[],
): Promise<ForumTopic[]> {
  const authors = await fetchAuthorsMap(topics.map((t) => t.author_id));
  return attachAuthorsToTopics(topics, authors);
}

export async function enrichRepliesWithAuthors(
  replies: ForumReply[],
): Promise<ForumReply[]> {
  const authors = await fetchAuthorsMap(replies.map((r) => r.author_id));
  return attachAuthorsToReplies(replies, authors);
}
