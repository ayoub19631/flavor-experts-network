/** Shared profile completion scoring for dashboard + post-auth CTAs. */

export type ProfileCompletionInput = {
  full_name?: string | null;
  role?: string | null;
  company?: string | null;
  location?: string | null;
  bio?: string | null;
  specialty?: string | null;
  cover_url?: string | null;
  linkedin_url?: string | null;
  skills?: string[] | null;
  skills_text?: string | null;
};

export function profileCompletionFields(profile: ProfileCompletionInput) {
  return [
    !!profile.full_name?.trim(),
    !!profile.role?.trim(),
    !!profile.company?.trim(),
    !!profile.location?.trim(),
    !!profile.bio?.trim(),
    !!profile.specialty?.trim(),
    !!profile.cover_url?.trim(),
    (profile.skills?.length ?? 0) > 0 || !!profile.skills_text?.trim(),
    !!profile.linkedin_url?.trim(),
  ];
}

export function profileCompletionPercent(profile: ProfileCompletionInput): number {
  const fields = profileCompletionFields(profile);
  if (fields.length === 0) return 0;
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

export function isProfileIncomplete(profile: ProfileCompletionInput, threshold = 100): boolean {
  return profileCompletionPercent(profile) < threshold;
}
