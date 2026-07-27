import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import NewsSection from "@/components/NewsSection";
import ResourcesSection from "@/components/ResourcesSection";
import PartnersSection from "@/components/PartnersSection";
import ContactSection from "@/components/ContactSection";
import FooterSection from "@/components/FooterSection";
import DatabaseStatus from "@/components/DatabaseStatus";

export default function Index() {
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
      <DatabaseStatus />
    </div>
  );
}