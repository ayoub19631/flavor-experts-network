export const FEED_PREVIEW_CHARS = 420;

const HASHTAG_RE = /#[\p{L}\p{N}_-]+/gu;
const TECHNICAL_RE =
  /\b(\d+\s?(g|kg|mg|ml|ppm|%)|vanillin|propylene glycol|triacetin|ethyl maltol|diacetyl|furaneol|formula|prototype|laboratory|carrier system)\b/i;

export function extractHashtags(text: string): string[] {
  return text.match(HASHTAG_RE) || [];
}

export function uniqueHashtags(text: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const tag of extractHashtags(text)) {
    const key = tag.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

export function splitPostPresentation(text: string): { title: string | null; body: string } {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n");
  const first = (lines[0] || "").trim();
  const rest = lines.slice(1).join("\n").trim();
  const looksTitle =
    first.length >= 12 &&
    first.length <= 140 &&
    rest.length > 80 &&
    (lines[1] === "" || first.includes("|") || /[?!]/.test(first) || first === first.toUpperCase());
  if (looksTitle) return { title: first, body: rest };
  return { title: null, body: normalized };
}

export function shouldCollapsePost(text: string, limit = FEED_PREVIEW_CHARS): boolean {
  const lines = text.replace(/\r\n/g, "\n").split("\n").length;
  return text.trim().length > limit || lines > 7;
}

export function truncatePost(text: string, limit = FEED_PREVIEW_CHARS): string {
  const value = text.replace(/\r\n/g, "\n").trim();
  if (value.length <= limit) return value;

  const paragraphs = value.split(/\n{2,}/);
  if (paragraphs.length > 1 && paragraphs[0].length >= 40 && paragraphs[0].length <= limit) {
    return paragraphs[0].trim();
  }

  const slice = value.slice(0, limit);
  const paragraphBreak = slice.lastIndexOf("\n\n");
  if (paragraphBreak >= limit * 0.45) return slice.slice(0, paragraphBreak).trim();

  const lineBreak = slice.lastIndexOf("\n");
  if (lineBreak >= limit * 0.5) return slice.slice(0, lineBreak).trim();

  const sentenceBreak = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("。"),
  );
  if (sentenceBreak >= limit * 0.45) return slice.slice(0, sentenceBreak + 1).trim();

  const wordBreak = slice.lastIndexOf(" ");
  return (wordBreak > 80 ? slice.slice(0, wordBreak) : slice).trim();
}

export function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

export function looksTechnicalPost(text: string): boolean {
  return TECHNICAL_RE.test(text) && text.length > 280;
}

const SAVED_KEY = "fen-saved-posts";

export function loadSavedPostIds(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function persistSavedPostIds(ids: string[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
}
