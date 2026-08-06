import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, FlaskConical, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { isEmailVerified } from "@/lib/auth-utils";

const REDIRECT_SECONDS = 5;

export default function EmailVerifiedPage() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  usePageMeta({
    title: "Email verified",
    description: "Your email address has been confirmed.",
    path: "/email-verified",
    noIndex: true,
  });
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (!user) {
      navigate("/auth?mode=login");
      return;
    }
    if (!isEmailVerified(user)) {
      navigate(`/verify-email?email=${encodeURIComponent(user.email || "")}`);
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user || !isEmailVerified(user)) return;
    if (countdown <= 0) {
      navigate("/dashboard?tab=profile");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [user, countdown, navigate]);

  const FEATURES = lang === "ar"
    ? [
        "الوصول إلى مجتمع متخصصي النكهات",
        "موارد تعليمية وبحثية مجانية بالكامل",
        "أخبار الصناعة ورؤى السوق",
        "وظائف وفرص تواصل مهني مع الشركات",
      ]
    : [
        "Access to the flavor professional community",
        "Fully free educational resources & research",
        "Industry news and market insights",
        "Jobs and professional networking with companies",
      ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border border-border shadow-2xl overflow-hidden">
          {/* Top success bar */}
          <div className="h-2 bg-gradient-to-r from-emerald-400 via-emerald-500 to-primary" />
          <CardContent className="p-8">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
                <FlaskConical className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">Flavor Experts</span>
            </div>

            {/* Success Icon with animation */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                {/* Outer glow ring */}
                <div className="absolute inset-0 rounded-full bg-emerald-400/20 scale-125 animate-pulse" />
                <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center relative z-10">
                  <CheckCircle className="w-14 h-14 text-emerald-500" />
                </div>
                {/* Sparkles */}
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-amber-400 animate-bounce" />
                <Sparkles className="absolute -bottom-1 -left-3 w-5 h-5 text-primary animate-bounce" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">Email Verified!</h1>
              <p className="text-sm text-muted-foreground">
                Welcome to <span className="font-semibold text-foreground">Flavor Experts Network</span>
                {user?.email && (
                  <>, <span className="text-primary">{user.email}</span></>
                )}!
              </p>
            </div>

            {/* What you now have access to */}
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-6">
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-3">
                Your account is now active
              </p>
              <ul className="space-y-2">
                {FEATURES.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Countdown redirect */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-4">
              <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                <span className="font-bold text-primary text-xs">{countdown}</span>
              </div>
              Redirecting to your dashboard in {countdown} second{countdown !== 1 ? "s" : ""}...
            </div>

            {/* CTA Buttons */}
            <div className="space-y-2">
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 gap-2"
                onClick={() => navigate("/dashboard?tab=profile")}
              >
                {lang === "ar" ? "أكمل ملفك المهني" : "Complete your professional profile"}
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                className="w-full h-10"
                onClick={() => navigate("/dashboard")}
              >
                {lang === "ar" ? "الذهاب للوحة التحكم" : "Go to Dashboard"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
