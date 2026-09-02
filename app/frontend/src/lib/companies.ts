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
  return encodeURIComponent(name.trim().toLowerCase());
}

export function buildCompanyDirectory(members: Member[]): CompanyListing[] {
  const groups = new Map<string, CompanyListing>();

  for (const member of members) {
    const isCompanyAccount = member.member_type === "company";
    const name = (isCompanyAccount ? (member.company || member.full_name) : member.company)?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        slug: companySlug(name),
        name,
        location: member.location,
        avatar_url: isCompanyAccount ? member.avatar_url : null,
        cover_url: member.cover_url,
        website: member.website,
        role: isCompanyAccount ? member.role || member.title : null,
        member_count: 1,
        profile_path: isCompanyAccount ? `/members/${member.id}` : `/companies/${companySlug(name)}`,
        is_company_account: isCompanyAccount,
      });
      continue;
    }
    existing.member_count += 1;
    if (isCompanyAccount) {
      existing.is_company_account = true;
      existing.profile_path = `/members/${member.id}`;
      existing.avatar_url = member.avatar_url || existing.avatar_url;
      existing.website = member.website || existing.website;
      existing.role = member.role || member.title || existing.role;
    }
    if (!existing.location && member.location) existing.location = member.location;
  }

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}
