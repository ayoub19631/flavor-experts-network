import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  isOAuthConfiguredError,
  signInWithOAuthProvider,
  type OAuthIntent,
  type OAuthProvider,
} from "@/lib/oauth";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

interface SocialAuthButtonsProps {
  mode: "login" | "signup";
  intent?: OAuthIntent;
  onError?: (message: string) => void;
  layout?: "stack" | "grid";
  className?: string;
  disabled?: boolean;
}

function oauthEnabled(): boolean {
  const flag = String(import.meta.env.VITE_OAUTH_ENABLED ?? "true").toLowerCase();
  if (flag === "false" || flag === "0") return false;
  if (String(import.meta.env.VITE_GOOGLE_OAUTH || "").toLowerCase() === "false") return false;
  return true;
}

export default function SocialAuthButtons({
  mode,
  intent,
  onError,
  layout = "stack",
  className = "",
  disabled = false,
}: SocialAuthButtonsProps) {
  const { t } = useI18n();
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);

  if (!oauthEnabled()) return null;

  const resolvedIntent: OAuthIntent = intent ?? (mode === "signup" ? "signup" : "login");

  const handleOAuth = async (provider: OAuthProvider) => {
    setLoadingProvider(provider);
    onError?.("");

    try {
      const { error } = await signInWithOAuthProvider(provider, resolvedIntent);
      if (error) {
        setLoadingProvider(null);
        onError?.(
          isOAuthConfiguredError(error.message)
            ? t("auth.oauth_not_configured")
            : t("auth.oauth_failed").replace("{provider}", "Google"),
        );
      }
    } catch {
      setLoadingProvider(null);
      onError?.(t("auth.oauth_failed").replace("{provider}", "Google"));
    }
  };

  const googleLabel = mode === "login" ? t("auth.google_login") : t("auth.google_signup");
  const containerClass = layout === "grid" ? `grid grid-cols-1 gap-3 ${className}` : `space-y-3 ${className}`;

  return (
    <div className={containerClass}>
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2.5 h-11 bg-background hover:bg-muted/60 border-border shadow-sm font-medium"
        onClick={() => handleOAuth("google")}
        disabled={disabled || loadingProvider !== null}
      >
        {loadingProvider === "google" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <GoogleIcon className="w-4 h-4" />
        )}
        {loadingProvider === "google" ? t("auth.oauth_redirecting") : googleLabel}
      </Button>
    </div>
  );
}

export function SocialAuthDivider() {
  const { t } = useI18n();
  if (!oauthEnabled()) return null;
  return (
    <div className="relative my-5">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wide">
        <span className="bg-card px-3 text-muted-foreground">{t("auth.or_email")}</span>
      </div>
    </div>
  );
}
