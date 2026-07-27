import { cn } from "@/lib/utils";

/** Prefer webp when present; SVG is the reliable fallback shipped in public/brand. */
const LOGO_FULL = "/brand/logo.svg";
const LOGO_NAV = "/brand/logo.svg";
const LOGO_TINY = "/brand/logo.svg";

type BrandLogoProps = {
  className?: string;
  /** Visual size presets for common placements */
  size?: "sm" | "md" | "lg" | "hero";
  alt?: string;
};

const sizeClass: Record<NonNullable<BrandLogoProps["size"]>, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-14 w-14",
  hero: "h-20 w-20 sm:h-24 sm:w-24",
};

function srcForSize(size: NonNullable<BrandLogoProps["size"]>) {
  if (size === "hero" || size === "lg") return LOGO_FULL;
  if (size === "md") return LOGO_NAV;
  return LOGO_TINY;
}

export default function BrandLogo({
  className,
  size = "md",
  alt = "Flavor Expertise & Science",
}: BrandLogoProps) {
  return (
    <img
      src={srcForSize(size)}
      alt={alt}
      width={size === "hero" ? 96 : size === "lg" ? 56 : size === "md" ? 44 : 36}
      height={size === "hero" ? 96 : size === "lg" ? 56 : size === "md" ? 44 : 36}
      decoding="async"
      className={cn(
        "object-cover rounded-md shadow-sm ring-1 ring-primary/15",
        sizeClass[size],
        className,
      )}
    />
  );
}

export { LOGO_FULL as LOGO_SRC, LOGO_NAV, LOGO_TINY, LOGO_FULL };
