import { cn } from "@/lib/utils";
import { SITE } from "@/lib/site-config";

const LOGO_HERO = "/brand/flavor-expertise-science.png";
const LOGO_FULL = "/brand/logo-512.webp";
const LOGO_NAV = "/brand/logo-128.webp";
const LOGO_TINY = "/brand/logo-64.webp";

type BrandLogoProps = {
  className?: string;
  /** Visual size presets for common placements */
  size?: "sm" | "md" | "lg" | "hero";
  alt?: string;
};

const sizeClass: Record<NonNullable<BrandLogoProps["size"]>, string> = {
  sm: "h-9 w-auto max-w-[120px]",
  md: "h-11 w-auto max-w-[140px]",
  lg: "h-16 w-auto max-w-[200px]",
  hero: "h-24 sm:h-28 w-auto max-w-[min(90vw,420px)]",
};

function srcForSize(size: NonNullable<BrandLogoProps["size"]>) {
  if (size === "hero") return LOGO_HERO;
  if (size === "lg") return LOGO_FULL;
  if (size === "md") return LOGO_NAV;
  return LOGO_TINY;
}

export default function BrandLogo({
  className,
  size = "md",
  alt = SITE.tagline,
}: BrandLogoProps) {
  return (
    <img
      src={srcForSize(size)}
      alt={alt}
      decoding="async"
      className={cn("object-contain", sizeClass[size], className)}
    />
  );
}

export { LOGO_FULL as LOGO_SRC, LOGO_NAV, LOGO_TINY, LOGO_HERO };
