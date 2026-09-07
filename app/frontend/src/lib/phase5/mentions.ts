export type MentionCandidate = {
  profile_id: string;
  full_name: string;
  title?: string | null;
  company?: string | null;
};

export type MentionToken = {
  profileId: string;
  displayName: string;
};

export const MENTION_ENTITY_TYPES = ["post", "comment", "forum_topic", "forum_reply"] as const;
export type MentionEntityType = (typeof MENTION_ENTITY_TYPES)[number];

const MENTION_TOKEN = /@\[([^\]]+)\]\(([0-9a-f-]{36})\)/gi;
const AT_QUERY = /(^|[\s([{])@([^\s@[]{0,40})$/;

export function extractMentionIds(text: string): string[] {
  const ids = new Set<string>();
  for (const match of text.matchAll(new RegExp(MENTION_TOKEN.source, "gi"))) {
    if (match[2]) ids.add(match[2]);
  }
  return [...ids];
}

export function mentionCaretQuery(text: string, caret: number): { query: string; start: number } | null {
  const before = text.slice(0, caret);
  const match = before.match(AT_QUERY);
  if (!match) return null;
  return { query: match[2] || "", start: caret - (match[2]?.length || 0) - 1 };
}

export function insertMentionToken(text: string, caret: number, mention: MentionCandidate): { text: string; caret: number } {
  const found = mentionCaretQuery(text, caret);
  if (!found) return { text, caret };
  const token = `@[${mention.full_name}](${mention.profile_id}) `;
  const next = `${text.slice(0, found.start)}${token}${text.slice(caret)}`;
  return { text: next, caret: found.start + token.length };
}

export function renderMentionSegments(text: string): Array<
  | { type: "text"; value: string }
  | { type: "mention"; value: string; profileId: string }
> {
  const segments: Array<{ type: "text"; value: string } | { type: "mention"; value: string; profileId: string }> = [];
  let last = 0;
  const re = new RegExp(MENTION_TOKEN.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) segments.push({ type: "text", value: text.slice(last, match.index) });
    segments.push({ type: "mention", value: match[1], profileId: match[2] });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ type: "text", value: text.slice(last) });
  return segments;
}

export function isAllowedVerificationFile(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const mime = file.type.toLowerCase();
  if (file.size > 10 * 1024 * 1024) return { ok: false, reason: "too_large" as const };
  if (["svg", "html", "htm", "js", "exe", "msi", "bat", "cmd", "sh"].includes(ext)) {
    return { ok: false, reason: "invalid" as const };
  }
  const mimeOk = ["application/pdf", "image/jpeg", "image/png"].includes(mime);
  const extOk = ["pdf", "jpg", "jpeg", "png"].includes(ext);
  if (!mimeOk || !extOk) return { ok: false, reason: "invalid" as const };
  return { ok: true as const, ext: ext === "jpeg" ? "jpg" : ext, mime };
}

export function sanitizeUploadName(name: string) {
  const base = name.split(/[/\\]/).pop() || "document";
  return (base.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^\.+/, "") || "document").slice(0, 80);
}

export function mentionIdempotencyKey(entityType: MentionEntityType, entityId: string, mentionedUserId: string) {
  return `mention:${entityType}:${entityId}:${mentionedUserId}`;
}
