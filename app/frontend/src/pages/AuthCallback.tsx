import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { FlaskConical, CheckCircle, KeyRound, LogIn, Mail, Sparkles } from "lucide-react";
import { isEmailVerified, rememberPendingVerificationEmail } from "@/lib/auth-utils";
import {
  consumeOAuthIntent,
  getOAuthProviderLabel,
  syncOAuthUserProfile,
} from "@/lib/oauth";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import BrandLogo from "@/components/BrandLogo";

type CallbackState =
  | "loading"
  | "email_confirmed"
  | "password_recovery"
  | "signed_in"
  | "verify_required"
  | "oauth_success";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<CallbackState>("loading");
  const { lang } = useI18n();
  usePageMeta({
    title: "Signing you in",
    description: "Completing authentication.",
    path: "/auth/callback",
    noIndex: true,
  });
  const isAR = lang === "ar";

  useEffect(() => {
    const urlError = searchParams.get("error") || searchParams.get("error_description");
    if (urlError) {
      navigate(`/auth/error?msg=${encodeURIComponent(urlError)}`);
      return;
    }

    let handled = false;
    let cancelled = false;

    async function finalizeSession(
      session: NonNullable<
        Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]
      >,
    ) {
      if (handled || cancelled) return;
      handled = true;

      const user = session.user;
      const provider = user.app_metadata?.provider as string | undefined;
      const isOAuth =
        provider === "google" || provider === "linkedin" || provider === "linkedin_oidc";
      const intent = consumeOAuthIntent();

      if (user.user_metadata) {
        await syncOAuthUserProfile(user.id, user.user_metadata, user.email);
      }

      if (intent === "company") {
        await supabase
          .from("user_profiles")
          .update({
            account_type: "company",
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      }

      const hash = window.location.hash;
      const isEmailConfirm = hash.includes("type=signup") || hash.includes("type=email");

      if (isEmailConfirm || isEmailVerified(user)) {
        setState(isOAuth ? "oauth_success" : "email_confirmed");
        toast.success(
          isOAuth
            ? isAR
              ? `مرحباً! تم تسجيل الدخول عبر ${getOAuthProviderLabel(provider)}.`
              : `Welcome! Signed in with ${getOAuthProviderLabel(provider)}.`
            : isAR
              ? "تم تأكيد البريد بنجاح!"
              : "Email verified successfully!",
        );
        setTimeout(() => navigate(isEmailConfirm ? "/email-verified" : "/dashboard"), 1200);
        return;
      }

      if (!isEmailVerified(user)) {
        if (user.email) rememberPendingVerificationEmail(user.email);
        setState("verify_required");
        setTimeout(
          () => navigate(`/verify-email?email=${encodeURIComponent(user.email || "")}`),
          1200,
        );
        return;
      }

      setState(isOAuth ? "oauth_success" : "signed_in");
      toast.success(
        isOAuth
          ? isAR
            ? `مرحباً بعودتك عبر ${getOAuthProviderLabel(provider)}!`
            : `Welcome back via ${getOAuthProviderLabel(provider)}!`
          : isAR
            ? "مرحباً بعودتك!"
            : "Welcome back!",
      );
      setTimeout(() => navigate("/dashboard"), 1200);
    }

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        handled = true;
        setState("password_recovery");
        setTimeout(() => navigate("/auth?mode=new-password"), 1500);
        return;
      }

      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        await finalizeSession(session);
      }
    });

    (async () => {
      // Edge OAuth may redirect here with token_hash instead of a session hash.
      const tokenHash = searchParams.get("token_hash");
      const otpType = searchParams.get("type");
      if (tokenHash && otpType) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType as "magiclink" | "email" | "signup" | "recovery" | "invite",
        });
        if (cancelled) return;
        if (error || !data.session) {
          navigate(
            `/auth/error?msg=${encodeURIComponent(error?.message || "Could not complete sign in.")}`,
          );
          return;
        }
        await finalizeSession(data.session);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) await finalizeSession(session);
    })();

    const timer = setTimeout(async () => {
      if (handled || cancelled) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await finalizeSession(session);
      } else {
        navigate("/auth?mode=login");
      }
    }, 8000);

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate, searchParams, isAR]);

  const stateConfig: Record<
    CallbackState,
    { icon: React.ReactNode; title: string; desc: string; color: string }
  > = {
    loading: {
      icon: (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
      ),
      title: isAR ? "جاري المعالجة..." : "Processing...",
      desc: isAR
        ? "يرجى الانتظار حتى نكمل تسجيل الدخول."
        : "Please wait while we complete your sign in.",
      color: "text-muted-foreground",
    },
    email_confirmed: {
      icon: <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />,
      title: isAR ? "تم تأكيد البريد!" : "Email Verified!",
      desc: isAR ? "تم تأكيد بريدك. جاري التحويل..." : "Your email has been confirmed. Redirecting...",
      color: "text-emerald-600",
    },
    oauth_success: {
      icon: <Sparkles className="w-10 h-10 text-primary mx-auto" />,
      title: isAR ? "تم تسجيل الدخول بنجاح!" : "Signed In Successfully!",
      desc: isAR ? "جاري إعداد حسابك..." : "Setting up your account...",
      color: "text-primary",
    },
    verify_required: {
      icon: <Mail className="w-10 h-10 text-amber-500 mx-auto" />,
      title: isAR ? "أكد بريدك الإلكتروني" : "Verify Your Email",
      desc: isAR
        ? "يرجى تأكيد بريدك للمتابعة..."
        : "Please confirm your email to continue...",
      color: "text-amber-600",
    },
    password_recovery: {
      icon: <KeyRound className="w-10 h-10 text-amber-500 mx-auto" />,
      title: isAR ? "إعادة تعيين كلمة المرور" : "Reset Password",
      desc: isAR
        ? "جاري التحويل لإعادة التعيين..."
        : "Redirecting to password reset...",
      color: "text-amber-600",
    },
    signed_in: {
      icon: <LogIn className="w-10 h-10 text-primary mx-auto" />,
      title: isAR ? "تم تسجيل الدخول!" : "Signed In!",
      desc: isAR ? "جاري التحويل إلى لوحتك..." : "Redirecting to your dashboard...",
      color: "text-primary",
    },
  };

  const cfg = stateConfig[state];

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background"
      dir={isAR ? "rtl" : "ltr"}
    >
      <div className="text-center max-w-sm mx-auto px-4">
        <BrandLogo size="lg" className="mx-auto mb-6 shadow-lg" />
        <div className="mb-4">{cfg.icon}</div>
        <h2 className={`text-xl font-bold mb-2 ${cfg.color}`}>{cfg.title}</h2>
        <p className="text-sm text-muted-foreground">{cfg.desc}</p>
      </div>
    </div>
  );
}
