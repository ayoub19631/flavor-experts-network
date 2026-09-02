export const PLATFORM_ROLES = [
  "super_admin",
  "platform_admin",
  "content_editor",
  "community_moderator",
  "research_editor",
  "jobs_moderator",
  "support_agent",
  "verified_professional",
  "verified_company",
  "member",
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const SENSITIVE_ROLES: PlatformRole[] = ["super_admin", "platform_admin"];

export function canGrantRole(actorRoles: PlatformRole[], targetRole: PlatformRole): boolean {
  if (SENSITIVE_ROLES.includes(targetRole)) return actorRoles.includes("super_admin");
  return actorRoles.includes("super_admin") || actorRoles.includes("platform_admin");
}

export function canSelfAssign(role: PlatformRole): boolean {
  return !SENSITIVE_ROLES.includes(role) && role === "member";
}

export function hasCapability(roles: PlatformRole[], capability: string, isAdminFlag = false): boolean {
  const effective = isAdminFlag ? Array.from(new Set([...roles, "platform_admin" as const])) : roles;
  switch (capability) {
    case "admin":
      return effective.includes("super_admin") || effective.includes("platform_admin");
    case "moderate_community":
      return hasCapability(effective, "admin") || effective.includes("community_moderator");
    case "moderate_jobs":
      return hasCapability(effective, "admin") || effective.includes("jobs_moderator");
    case "edit_content":
      return hasCapability(effective, "admin") || effective.includes("content_editor") || effective.includes("research_editor");
    case "grant_admin":
      return effective.includes("super_admin");
    default:
      return false;
  }
}
