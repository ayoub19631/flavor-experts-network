export const PUBLIC_SITE_ORIGIN = "https://flavorexpertsnetwork.com";

/** Official public profiles. Single source of truth for the public site. */
export const SOCIAL_LINKS = {
  instagram: "https://www.instagram.com/flavorexpertsnetwork/",
  facebook: "https://www.facebook.com/people/Flavor-Experts-Network/61577220872546/",
  youtube: "https://www.youtube.com/@FlavorExpertsNetwork",
  linkedinPage: "https://www.linkedin.com/company/135148577/",
  linkedinGroup: "https://www.linkedin.com/groups/8367742/",
  website: "https://www.flavorexpertsnetwork.com/",
} as const;

export type SocialNetwork = keyof typeof SOCIAL_LINKS;

export type SocialLink = {
  id: SocialNetwork;
  href: string;
  labelKey: string;
  ariaKey: string;
};

const KNOWN_HOST_HINTS: Record<SocialNetwork, string[]> = {
  instagram: ["instagram.com"],
  facebook: ["facebook.com", "fb.com"],
  youtube: ["youtube.com", "youtu.be"],
  linkedinPage: ["linkedin.com"],
  linkedinGroup: ["linkedin.com"],
  website: ["flavorexpertsnetwork.com"],
};

const LABEL_KEYS: Record<SocialNetwork, { labelKey: string; ariaKey: string }> = {
  instagram: { labelKey: "social.instagram", ariaKey: "social.aria.instagram" },
  facebook: { labelKey: "social.facebook", ariaKey: "social.aria.facebook" },
  youtube: { labelKey: "social.youtube", ariaKey: "social.aria.youtube" },
  linkedinPage: { labelKey: "social.linkedin_page", ariaKey: "social.aria.linkedin_page" },
  linkedinGroup: { labelKey: "social.linkedin_group", ariaKey: "social.aria.linkedin_group" },
  website: { labelKey: "social.website", ariaKey: "social.aria.website" },
};

export function isPublicHttpsUrl(value: string | undefined | null): boolean {
  const trimmed = (value || "").trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return (
      url.protocol === "https:" &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password &&
      !trimmed.toLowerCase().startsWith("javascript:")
    );
  } catch {
    return false;
  }
}

export function resolveSocialHref(network: SocialNetwork, ...candidates: Array<string | undefined>): string {
  const hints = KNOWN_HOST_HINTS[network];
  for (const candidate of candidates) {
    const trimmed = (candidate || "").trim();
    if (!isPublicHttpsUrl(trimmed)) continue;
    const host = new URL(trimmed).hostname.toLowerCase();
    if (hints.some((hint) => host === hint || host.endsWith(`.${hint}`))) {
      return trimmed;
    }
  }
  return "";
}

function envOverride(network: SocialNetwork): string | undefined {
  const env = import.meta.env;
  switch (network) {
    case "instagram":
      return env.VITE_SOCIAL_INSTAGRAM;
    case "facebook":
      return env.VITE_SOCIAL_FACEBOOK;
    case "youtube":
      return env.VITE_SOCIAL_YOUTUBE;
    case "linkedinPage":
      return env.VITE_SOCIAL_LINKEDIN_PAGE;
    case "linkedinGroup":
      return env.VITE_SOCIAL_LINKEDIN_GROUP;
    case "website":
      return undefined;
  }
}

export function configuredSocialLinks(): SocialLink[] {
  return (Object.keys(SOCIAL_LINKS) as SocialNetwork[]).map((id) => {
    const href = resolveSocialHref(id, envOverride(id), SOCIAL_LINKS[id]);
    return { id, href, ...LABEL_KEYS[id] };
  }).filter((link) => link.href);
}

export function socialSameAs(): string[] {
  return configuredSocialLinks()
    .map((link) => link.href)
    .filter((href) => !/\/admin(?:\/|$)/i.test(href));
}
