import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import HomeLiveSections from "@/components/HomeLiveSections";
import ContactSection from "@/components/ContactSection";
import SocialMediaLinks from "@/components/SocialMediaLinks";
import FooterSection from "@/components/FooterSection";
import SeoJsonLd, { breadcrumbJsonLd, organizationJsonLd, websiteJsonLd } from "@/components/SeoJsonLd";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useI18n } from "@/lib/i18n";

export default function Index() {
  const { lang, t } = useI18n();
  usePageMeta({
    title: lang === "ar" ? "شبكة صناعة النكهات المهنية" : "Professional Flavor Industry Network",
    description:
      lang === "ar"
        ? "شبكة مهنية عالمية تربط خبراء النكهات وعلماء الأغذية ومتخصصي البحث والتطوير والشركات والموردين وصناعة النكهات."
        : "A global professional network connecting flavorists, food scientists, R&D professionals, companies, suppliers, and the flavor industry.",
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
      <SocialMediaLinks variant="follow" />
      <HomeLiveSections />
      <ContactSection />
      <FooterSection />
    </div>
  );
}