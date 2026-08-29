import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { TERMS_VERSION, getTermsSections } from "@/lib/terms-policy";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const EXEMPT = new Set([
  "/auth",
  "/auth/callback",
  "/auth/error",
  "/verify-email",
  "/email-verified",
  "/terms",
  "/privacy",
]);

export default function TermsAcceptanceGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, acceptPlatformTerms } = useAuth();
  const { lang, t } = useI18n();
  const { pathname } = useLocation();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const needsAccept =
    !!user &&
    !loading &&
    !!profile &&
    profile.terms_version !== TERMS_VERSION &&
    !EXEMPT.has(pathname);

  if (!needsAccept) return <>{children}</>;

  const sections = getTermsSections(lang);

  const accept = async () => {
    if (!checked) return;
    setSaving(true);
    await acceptPlatformTerms();
    setSaving(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] bg-background/80 backdrop-blur-sm" />
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col">
          <div className="px-6 py-5 border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">{t("terms.gate_title")}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t("terms.gate_desc")}</p>
              </div>
              <LanguageSwitcher compact />
            </div>
          </div>
          <div className="px-6 py-4 overflow-y-auto space-y-4 text-sm">
            {sections.map((section) => (
              <section key={section.title}>
                <h3 className="font-semibold text-foreground mb-1">{section.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{section.body}</p>
              </section>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-border space-y-3">
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} className="mt-0.5" />
              <span>{t("auth.accept_terms_label")}</span>
            </label>
            <Button className="w-full" disabled={!checked || saving} onClick={() => void accept()}>
              {t("terms.accept")}
            </Button>
          </div>
        </div>
      </div>
      {children}
    </>
  );
}
