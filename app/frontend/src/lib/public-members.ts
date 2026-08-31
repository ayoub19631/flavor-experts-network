const TEST_NAME_PATTERN =
  /(\+companyqa|ayobe895\+|qaautomation|\btest account\b|\bqa user\b|companyqa\d+)/i;

export function isHiddenTestMember(member: {
  full_name?: string | null;
  company?: string | null;
  bio?: string | null;
  website?: string | null;
  is_test_account?: boolean | null;
  is_active?: boolean | null;
}): boolean {
  if (member.is_test_account) return true;
  if (member.is_active === false) return true;
  const haystack = [member.full_name, member.company, member.bio, member.website]
    .filter(Boolean)
    .join(" ");
  return TEST_NAME_PATTERN.test(haystack);
}

export function filterPublicMembers<T extends {
  full_name?: string | null;
  company?: string | null;
  bio?: string | null;
  website?: string | null;
  is_test_account?: boolean | null;
  is_active?: boolean | null;
}>(members: T[]): T[] {
  return members.filter((member) => !isHiddenTestMember(member) && Boolean(member.full_name?.trim()));
}
