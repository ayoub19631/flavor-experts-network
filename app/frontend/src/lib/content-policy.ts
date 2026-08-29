/** Client-side guard for the educational-only community policy. */
const BANNED_PATTERNS: RegExp[] = [
  /إباح|اباحي|porn|xxx|onlyfans|nude|nudity|sex tape/i,
  /انتخاب|حملة انتخاب|حزب سياسي|مرشح رئاسي|\belection\b|\bpolitical party\b|\bcampaign rally\b/i,
  /قاصر|استغلال اطفال|child porn|child sexual|\bcsam\b/i,
  /\b(kids?|children|child|toddler|infant|minor)\b.{0,40}\b(sex|nude|porn|abuse)\b/i,
];

export function violatesEducationalPolicy(text: string): boolean {
  const value = (text || "").trim();
  if (!value) return false;
  return BANNED_PATTERNS.some((pattern) => pattern.test(value));
}
