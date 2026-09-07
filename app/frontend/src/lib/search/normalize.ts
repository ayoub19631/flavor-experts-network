const DIACRITICS = ["ـ", "ً", "ٌ", "ٍ", "َ", "ُ", "ِ", "ّ", "ْ"];

export function normalizeSearchText(input: string): string {
  let text = input;
  for (const mark of DIACRITICS) text = text.split(mark).join("");
  return text
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .toLowerCase()
    .trim();
}

export function searchQueryIsSensitive(query: string): boolean {
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(query) || /\d{6,}/.test(query);
}

export function isUsableSearchQuery(query: string): boolean {
  const trimmed = query.trim();
  return trimmed.length >= 2 && trimmed.length <= 200 && !searchQueryIsSensitive(trimmed);
}
