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

export function formatPipeLines(items: unknown, keys: string[]): string {
  if (!Array.isArray(items) || !items.length) return "";
  return items
    .map((raw) => {
      const item = (raw || {}) as Record<string, unknown>;
      return keys.map((k) => String(item[k] ?? "").trim()).join(" | ");
    })
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

export type ProfileEditDraft = {
  full_name?: string;
  role?: string;
  company?: string;
  location?: string;
  bio?: string;
  linkedin_url?: string;
  website_url?: string;
  phone?: string;
  avatar_url?: string;
  cover_url?: string;
  specialty?: string;
  years_experience?: number | null;
  skills?: string[];
  skills_text?: string;
  education_text?: string;
  work_text?: string;
  projects_text?: string;
};

export type ProfileSavePayload = {
  full_name: string;
  role: string;
  company: string;
  location: string;
  bio: string;
  linkedin_url: string;
  website_url: string;
  phone: string;
  avatar_url: string;
  cover_url: string;
  specialty: string;
  years_experience: number | null;
  skills: string[];
  education: EducationItem[];
  work_experience: WorkExperienceItem[];
  projects: ProjectItem[];
};

export function clampYearsExperience(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === "" || Number.isNaN(Number(value))) {
    return null;
  }
  return Math.max(0, Math.min(80, Math.round(Number(value))));
}

export function buildProfileSavePayload(editData: ProfileEditDraft): ProfileSavePayload | { error: "full_name_required" } {
  if (!editData.full_name?.trim()) return { error: "full_name_required" };
  const skills = parseSkills(editData.skills_text || formatSkills(editData.skills));
  return {
    full_name: editData.full_name.trim(),
    role: (editData.role || "").trim(),
    company: (editData.company || "").trim(),
    location: (editData.location || "").trim(),
    bio: (editData.bio || "").trim(),
    linkedin_url: (editData.linkedin_url || "").trim(),
    website_url: (editData.website_url || "").trim(),
    phone: (editData.phone || "").trim(),
    avatar_url: (editData.avatar_url || "").trim(),
    cover_url: (editData.cover_url || "").trim(),
    specialty: (editData.specialty || "").trim(),
    years_experience: clampYearsExperience(editData.years_experience),
    skills,
    education: asEducation(parsePipeLines<{ school: string; degree: string; year: string }>(
      editData.education_text || "",
      ["school", "degree", "year"],
    )),
    work_experience: asWorkExperience(parsePipeLines<{
      title: string;
      company: string;
      period: string;
      description: string;
    }>(editData.work_text || "", ["title", "company", "period", "description"])),
    projects: asProjects(parsePipeLines<{ name: string; description: string; url: string }>(
      editData.projects_text || "",
      ["name", "description", "url"],
    )),
  };
}

export function profileViewFromPayload(payload: ProfileSavePayload) {
  return {
    ...payload,
    skills_text: formatSkills(payload.skills),
    education_text: formatPipeLines(payload.education, ["school", "degree", "year"]),
    work_text: formatPipeLines(payload.work_experience, ["title", "company", "period", "description"]),
    projects_text: formatPipeLines(payload.projects, ["name", "description", "url"]),
  };
}
