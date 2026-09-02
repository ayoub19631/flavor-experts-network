import type { Member } from "@/lib/types";

export type CompanyListing = {
  slug: string;
  name: string;
  location?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  website?: string | null;
  role?: string | null;
  member_count: number;
  profile_path: string;
  is_company_account: boolean;
};

export function companySlug(name: string): string {
  return name.trim().toLowerCase();
}

export function companyPath(name: string): string {
  return `/companies/${encodeURIComponent(companySlug(name))}`;
}

export function slugsEqual(left?: string | null, right?: string | null): boolean {
  return decodeSlug(left) === decodeSlug(right) && Boolean(decodeSlug(left));
}

function decodeSlug(value?: string | null): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value).trim().toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

export function employerName(member: Pick<Member, "member_type" | "company" | "full_name">): string | null {
  const name = (member.member_type === "company" ? (member.company || member.full_name) : member.company)?.trim();
  return name || null;
}

/** Public directory of accounts that registered as a company — not workplaces typed on individual profiles. */
export function buildCompanyDirectory(members: Member[]): CompanyListing[] {
  const groups = new Map<string, CompanyListing>();

  for (const member of members) {
    if (member.member_type !== "company") continue;
    const name = (member.company || member.full_name)?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        slug: companySlug(name),
        name,
        location: member.location,
        avatar_url: member.avatar_url,
        cover_url: member.cover_url,
        website: member.website,
        role: member.role || member.title || null,
        member_count: 1,
        profile_path: companyPath(name),
        is_company_account: true,
      });
      continue;
    }
    existing.member_count += 1;
    if (!existing.avatar_url && member.avatar_url) existing.avatar_url = member.avatar_url;
    if (!existing.location && member.location) existing.location = member.location;
    if (!existing.website && member.website) existing.website = member.website;
    if (!existing.role) existing.role = member.role || member.title || null;
  }

  for (const listing of groups.values()) {
    listing.member_count = members.filter(
      (member) => employerName(member)?.toLowerCase() === listing.name.toLowerCase(),
    ).length;
  }

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}
