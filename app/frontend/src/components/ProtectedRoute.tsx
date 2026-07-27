import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import BrandLogo from "@/components/BrandLogo";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerified?: boolean;
}

export default function ProtectedRoute({
  children,
  requireEmailVerified = true,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth?mode=login");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(208_100%_10%)]">
        <div className="text-center">
          <BrandLogo size="lg" className="mx-auto mb-4 animate-pulse" />
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[hsl(47_23%_85%)] mx-auto mb-3" />
          <p className="text-sm text-[hsl(47_23%_85%/0.75)]">{t("protected.loading")}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (requireEmailVerified && !user.email_confirmed_at) {
    const storedEmail = localStorage.getItem("fen-verify-email") || user.email || "";

    const handleResend = async () => {
      if (storedEmail) {
        await supabase.auth.resend({ type: "signup", email: storedEmail });
      }
      navigate(`/verify-email?email=${encodeURIComponent(storedEmail)}`);
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
        <div className="w-full max-w-md text-center">
          <BrandLogo size="lg" className="mx-auto mb-6" />

          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-5 border-4 border-amber-200 dark:border-amber-800">
            <Mail className="w-10 h-10 text-amber-500" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">{t("protected.verify.title")}</h1>
          <p className="text-muted-foreground text-sm mb-2 leading-relaxed">
            {t("protected.verify.desc")}
          </p>
          {user.email && (
            <p className="text-sm font-medium text-primary bg-primary/5 border border-primary/20 rounded-lg py-2 px-4 inline-block mb-6">
              {user.email}
            </p>
          )}

          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-xl p-3 mb-6 text-left">
            <ShieldCheck className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {t("protected.verify.notice")}
            </p>
          </div>

          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 mb-3 h-11"
            onClick={handleResend}
          >
            <Mail className="w-4 h-4" />
            {t("protected.verify.cta")}
          </Button>
          <Button variant="ghost" className="w-full text-sm text-muted-foreground" onClick={() => navigate("/")}>
            {t("protected.verify.back")}
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
