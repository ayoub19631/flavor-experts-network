import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import NewsSection from "@/components/NewsSection";
import ResourcesSection from "@/components/ResourcesSection";
import PartnersSection from "@/components/PartnersSection";
import ContactSection from "@/components/ContactSection";
import FooterSection from "@/components/FooterSection";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useI18n } from "@/lib/i18n";

export default function Index() {
  const { lang } = useI18n();
  usePageMeta({
    title: "",
    description:
      lang === "ar"
        ? "الشبكة المهنية الأولى لخبراء النكهات والعطور — تواصل، تعلّم، واكتشف الفرص."
        : "The professional network for flavor & fragrance experts — connect, learn, and discover opportunities.",
    path: "/",
  });
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <AboutSection />
      <NewsSection />
      <ResourcesSection />
      <PartnersSection />
      <ContactSection />
      <FooterSection />
    </div>
  );
}