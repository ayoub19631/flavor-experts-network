import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { SITE } from "@/lib/site-config";
import BrandLogo from "@/components/BrandLogo";

export default function HeroSection() {
  const { t } = useI18n();

  return (
    <section
      id="home"
      className="relative min-h-[92vh] flex items-center justify-center overflow-hidden pt-24"
    >
      {/* Full-bleed brand photograph */}
      <div className="absolute inset-0">
        <img
          src="/brand/hero-flavor-lab.webp"
          alt=""
          className="h-full w-full object-cover scale-105 animate-[fadeIn_1.2s_ease-out]"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-[hsl(208_100%_8%/0.72)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(208_100%_8%/0.92)] via-[hsl(208_100%_10%/0.78)] to-[hsl(208_80%_16%/0.45)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(47_23%_85%/0.12),transparent_50%)]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="max-w-2xl">
          <div className="mb-7 animate-[fadeIn_0.7s_ease-out]">
            <BrandLogo size="hero" className="drop-shadow-2xl brightness-110" />
          </div>

          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.22em] text-[hsl(47_23%_85%)] mb-3 animate-[fadeIn_0.9s_ease-out]">
            {SITE.tagline}
          </p>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 animate-[fadeIn_1s_ease-out]">
            {t("hero.title")}
          </h1>

          <p className="text-lg sm:text-xl text-white/85 leading-relaxed mb-8 max-w-xl animate-[fadeIn_1.1s_ease-out]">
            {t("hero.subtitle")}
          </p>

          <div className="flex flex-wrap gap-3 animate-[fadeIn_1.2s_ease-out]">
            <Button
              asChild
              size="lg"
              className="bg-[hsl(47_23%_85%)] hover:bg-[hsl(47_25%_90%)] text-[hsl(208_100%_14%)] font-semibold shadow-lg shadow-black/25"
            >
              <Link to="/auth" className="flex items-center gap-2">
                {t("hero.cta.join")}
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="!bg-transparent border-[hsl(47_23%_85%/0.4)] text-white hover:!bg-white/10 hover:border-[hsl(47_23%_85%/0.6)]"
            >
              <a
                href={SITE.linkedInGroup}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("hero.cta")}
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
