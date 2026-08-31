import { Link } from "react-router-dom";
import { Construction, LogIn, LogOut, Mail } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { SITE } from "@/lib/site-config";
import { isPlatformPrivateMode } from "@/lib/platform-access";

export default function UnderDevelopmentPage() {
  const { user, signOut, hasPlatformAccess } = useAuth();
  const { lang, setLang } = useI18n();
  const isAR = lang === "ar";

  usePageMeta({
    title: isAR ? "قيد التطوير" : "Under Development",
    description: isAR
      ? "منصة خبراء النكهات قيد التطوير حالياً. سيتم الإعلان عن الإطلاق قريباً."
      : "Flavor Experts Network is currently under development. Public launch coming soon.",
    path: "/",
    noIndex: true,
  });

  const copy = {
    badge: isAR ? "قيد التطوير" : "Under Development",
    title: isAR ? "نعمل على شيء مميز" : "Something great is brewing",
    body: isAR
      ? "منصة خبراء النكهات لا تزال قيد الإعداد. المحتوى والميزات غير متاحة للعامة حالياً."
      : "Flavor Experts Network is still being built. Public content and features are not available yet.",
    team: isAR
      ? "إذا كنت ضمن فريق المعاينة، سجّل الدخول للوصول الكامل."
      : "If you are on the preview team, sign in for full access.",
    login: isAR ? "دخول الفريق" : "Team sign in",
    contact: isAR ? "للاستفسارات:" : "Questions:",
    signedIn: isAR ? "مسجّل الدخول بدون صلاحية معاينة." : "Signed in without preview access.",
    signOut: isAR ? "تسجيل الخروج" : "Sign out",
    lang: isAR ? "English" : "العربية",
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[hsl(208_100%_10%)] via-[hsl(208_90%_14%)] to-[hsl(208_100%_8%)] px-4 py-10 text-[hsl(47_23%_92%)]"
      dir={isAR ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-lg text-center space-y-6">
        <div className="flex justify-center">
          <BrandLogo size="lg" className="shadow-2xl" />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(47_23%_85%/0.25)] bg-[hsl(47_23%_85%/0.08)] px-4 py-1.5 text-sm">
          <Construction className="h-4 w-4 text-[hsl(47_70%_70%)]" />
          <span>{copy.badge}</span>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{copy.title}</h1>
          <p className="text-[hsl(47_23%_85%/0.85)] leading-relaxed">{copy.body}</p>
          <p className="text-sm text-[hsl(47_23%_85%/0.7)]">{copy.team}</p>
        </div>

        {user && !hasPlatformAccess && isPlatformPrivateMode() && (
          <p className="text-sm text-amber-200/90 bg-amber-500/10 border border-amber-400/20 rounded-xl px-4 py-3">
            {copy.signedIn}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {!user ? (
            <Button
              asChild
              className="bg-[hsl(47_23%_85%)] text-[hsl(208_100%_10%)] hover:bg-[hsl(47_23%_90%)] gap-2 h-11 px-6"
            >
              <Link to="/auth?mode=login">
                <LogIn className="h-4 w-4" />
                {copy.login}
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              className="border-[hsl(47_23%_85%/0.35)] text-[hsl(47_23%_92%)] hover:bg-[hsl(47_23%_85%/0.08)] gap-2 h-11"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
              {copy.signOut}
            </Button>
          )}

          <Button
            variant="ghost"
            className="text-[hsl(47_23%_85%/0.8)] hover:text-[hsl(47_23%_92%)] hover:bg-[hsl(47_23%_85%/0.06)]"
            onClick={() => setLang(isAR ? "en" : "ar")}
          >
            {copy.lang}
          </Button>
        </div>

        {SITE.supportEmail ? (
          <div className="flex items-center justify-center gap-2 text-sm text-[hsl(47_23%_85%/0.65)] pt-2">
            <Mail className="h-4 w-4" />
            <span>{copy.contact}</span>
            <a
              href={`mailto:${SITE.supportEmail}`}
              className="underline underline-offset-4 hover:text-[hsl(47_23%_92%)] transition-colors"
            >
              {SITE.supportEmail}
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
