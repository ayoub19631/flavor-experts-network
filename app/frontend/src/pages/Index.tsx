import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import HomeLiveSections from "@/components/HomeLiveSections";
import NewsSection from "@/components/NewsSection";
import ResourcesSection from "@/components/ResourcesSection";
import PartnersSection from "@/components/PartnersSection";
import ContactSection from "@/components/ContactSection";
import FooterSection from "@/components/FooterSection";
import SeoJsonLd, { breadcrumbJsonLd, organizationJsonLd, websiteJsonLd } from "@/components/SeoJsonLd";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useI18n } from "@/lib/i18n";

export default function Index() {
  const { lang, t } = useI18n();
  usePageMeta({
    title: lang === "ar" ? "تعلّم علم النكهات" : "Learn Flavor Science",
    description:
      lang === "ar"
        ? "تعلّم علم النكهات، وابنِ تركيبات أفضل، وتواصل عالمياً مع شبكة خبراء النكهات."
        : "Learn flavor science. Build better formulations. Connect globally with Flavor Experts Network.",
    path: "/",
    locale: lang,
  });
  return (
    <div className="min-h-screen bg-background">
      <SeoJsonLd
        data={[
          organizationJsonLd(),
          websiteJsonLd(),
          breadcrumbJsonLd([
            { name: t("nav.home"), path: "/" },
          ]),
        ]}
      />
      <Navbar />
      <HeroSection />
      <AboutSection />
      <HomeLiveSections />
      <NewsSection />
      <ResourcesSection />
      <PartnersSection />
      <ContactSection />
      <FooterSection />
    </div>
  );
}