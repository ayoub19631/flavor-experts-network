/** Helpers for professional profile JSON / list fields. */

export interface EducationItem {
  school: string;
  degree?: string;
  year?: string;
}

export interface WorkExperienceItem {
  title: string;
  company?: string;
  period?: string;
  description?: string;
}

export interface ProjectItem {
  name: string;
  description?: string;
  url?: string;
}

export function parsePipeLines<T extends Record<string, string>>(
  text: string,
  keys: (keyof T)[],
): T[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      const item = {} as T;
      keys.forEach((key, i) => {
        item[key] = (parts[i] || "") as T[keyof T];
      });
      return item;
    })
    .filter((item) => Boolean(Object.values(item).some((v) => String(v || "").trim())));
}

export function formatPipeLines(
  items: Array<Record<string, string | undefined>> | null | undefined,
  keys: string[],
): string {
  if (!items?.length) return "";
  return items
    .map((item) => keys.map((k) => String(item[k] || "").trim()).join(" | "))
    .join("\n");
}

export function parseSkills(text: string): string[] {
  return text
    .split(/[,|\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);
}

export function formatSkills(skills: string[] | null | undefined): string {
  return (skills || []).filter(Boolean).join(", ");
}

export function asEducation(value: unknown): EducationItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => ({
      school: String((row as EducationItem)?.school || "").trim(),
      degree: String((row as EducationItem)?.degree || "").trim() || undefined,
      year: String((row as EducationItem)?.year || "").trim() || undefined,
    }))
    .filter((row) => row.school);
}

export function asWorkExperience(value: unknown): WorkExperienceItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => ({
      title: String((row as WorkExperienceItem)?.title || "").trim(),
      company: String((row as WorkExperienceItem)?.company || "").trim() || undefined,
      period: String((row as WorkExperienceItem)?.period || "").trim() || undefined,
      description: String((row as WorkExperienceItem)?.description || "").trim() || undefined,
    }))
    .filter((row) => row.title);
}

export function asProjects(value: unknown): ProjectItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => ({
      name: String((row as ProjectItem)?.name || "").trim(),
      description: String((row as ProjectItem)?.description || "").trim() || undefined,
      url: String((row as ProjectItem)?.url || "").trim() || undefined,
    }))
    .filter((row) => row.name);
}
