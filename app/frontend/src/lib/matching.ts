/** Lightweight talent / skill matching helpers (client-side). */

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function tokenizeSkills(skills?: string[] | null, specialty?: string | null): string[] {
  const fromSkills = (skills || []).map((s) => normalizeToken(String(s))).filter(Boolean);
  const fromSpecialty = (specialty || "")
    .split(/[|,;/]/)
    .map(normalizeToken)
    .filter(Boolean);
  return [...new Set([...fromSkills, ...fromSpecialty])];
}

export function skillOverlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let hits = 0;
  for (const token of a) {
    if (setB.has(token)) hits += 1;
  }
  return hits;
}

export function rankBySkillOverlap<T>(
  items: T[],
  getSkills: (item: T) => string[],
  referenceSkills: string[],
  opts?: { exclude?: (item: T) => boolean; limit?: number },
): Array<T & { matchScore: number }> {
  const ref = referenceSkills.map(normalizeToken).filter(Boolean);
  if (ref.length === 0) return [];

  return items
    .filter((item) => !(opts?.exclude?.(item)))
    .map((item) => ({
      ...item,
      matchScore: skillOverlapScore(ref, getSkills(item)),
    }))
    .filter((item) => item.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, opts?.limit ?? 6);
}
