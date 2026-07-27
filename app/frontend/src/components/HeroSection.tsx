import { Button } from "@/components/ui/button";
import { Users, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { SITE } from "@/lib/site-config";
import BrandLogo from "@/components/BrandLogo";

const HERO_IMAGE =
  "https://mgx-backend-cdn.metadl.com/generate/images/986354/2026-05-14/oqqjhfqaagpa/hero-banner-food-lab.png";

export default function HeroSection() {
  const { t } = useI18n();

  return (
    <section
      id="home"
      className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-28"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={HERO_IMAGE}
          alt="Food science laboratory"
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="sync"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(208_100%_10%)]/92 via-[hsl(208_90%_14%)]/80 to-[hsl(208_70%_18%)]/55" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(47_23%_85%/0.12),transparent_55%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-2xl">
          <div className="mb-7 animate-[fadeIn_0.8s_ease-out]">
            <BrandLogo
              size="hero"
              className="rounded-lg shadow-2xl shadow-black/30 ring-1 ring-[hsl(47_23%_85%/0.25)]"
            />
          </div>

          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.22em] text-[hsl(47_23%_85%)] mb-3">
            {SITE.tagline}
          </p>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
            {t("hero.title")}
          </h1>

          <p className="text-lg sm:text-xl text-white/85 leading-relaxed mb-6 max-w-xl">
            {t("hero.subtitle")}
          </p>

          {/* Highlights */}
          <div className="flex flex-wrap gap-6 mb-8">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[hsl(47_30%_78%)]" />
              <span className="text-white/90 text-sm">{t("hero.stat.community")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[hsl(47_40%_70%)] animate-pulse" />
              <span className="text-white/70 text-sm">{t("hero.stat.active")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[hsl(208_60%_65%)]" />
              <span className="text-white/70 text-sm">{t("hero.stat.countries")}</span>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-[hsl(47_23%_85%)] hover:bg-[hsl(47_25%_90%)] text-[hsl(208_100%_14%)] font-semibold shadow-lg shadow-black/20"
            >
              <a
                href={SITE.linkedInGroup}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                {t("hero.cta")}
                <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="!bg-transparent border-[hsl(47_23%_85%/0.35)] text-white hover:!bg-white/10 hover:border-[hsl(47_23%_85%/0.55)]"
            >
              <a href="/pricing">{t("hero.cta2")}</a>
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
