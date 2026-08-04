import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { PLATFORM_ALWAYS_FREE } from "@/lib/site-config";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";

/** Kept for legacy links; platform is fully free. */
export default function PricingPage() {
  const { lang } = useI18n();

  usePageMeta({
    title: lang === "ar" ? "عضوية مجانية" : "Free Membership",
    description:
      lang === "ar"
        ? "المنصة مجانية بالكامل للأفراد والشركات."
        : "The platform is fully free for individuals and companies.",
    path: "/pricing",
  });

  if (PLATFORM_ALWAYS_FREE) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-24">
        <Card className="border-primary/20">
          <CardContent className="p-8 text-center space-y-4">
            <Badge className="bg-primary/10 text-primary border-0 gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {lang === "ar" ? "مجاني بالكامل" : "Fully free"}
            </Badge>
            <h1 className="text-3xl font-bold">
              {lang === "ar" ? "لا توجد اشتراكات مدفوعة" : "No paid subscriptions"}
            </h1>
            <p className="text-muted-foreground">
              {lang === "ar"
                ? "كل الميزات متاحة مجاناً للأفراد والشركات."
                : "All features are free for individuals and companies."}
            </p>
            <ul className="text-sm text-start max-w-md mx-auto space-y-2">
              {[
                lang === "ar" ? "وظائف وموارد ومجتمع" : "Jobs, resources, and community",
                lang === "ar" ? "حسابات شركات مجانية" : "Free company accounts",
                lang === "ar" ? "بدون بطاقة أو فوترة" : "No card or billing required",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
            <Button asChild>
              <Link to="/auth?mode=signup">
                {lang === "ar" ? "إنشاء حساب مجاني" : "Create free account"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <FooterSection />
    </div>
  );
}
