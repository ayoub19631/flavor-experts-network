import { useState } from "react";
import { Linkedin, Mail, Globe, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import BrandLogo from "@/components/BrandLogo";
import { SITE } from "@/lib/site-config";
import { toast } from "sonner";

export default function FooterSection() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNewsletter = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    if ((formData.get("website_url") as string)?.trim()) {
      setLoading(false);
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail) {
      toast.error(t("newsletter.error.email"));
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error(t("newsletter.error.invalid"));
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("submit-public-form", {
        body: {
          form: "newsletter",
          email: trimmedEmail,
          name: trimmedName || undefined,
          website_url: "",
        },
      });

      if (error || data?.error) {
        toast.error(data?.error || error?.message || t("newsletter.error.submit"));
        setLoading(false);
        return;
      }

      toast.success(t("newsletter.success"));
      setEmail("");
      setName("");
      (e.target as HTMLFormElement).reset();
    } catch {
      toast.error(t("newsletter.error.submit"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-[hsl(208_100%_14%)] text-[hsl(47_23%_88%)] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <BrandLogo size="md" className="ring-[hsl(47_23%_85%/0.25)]" />
              <div className="leading-tight">
                <span className="text-lg font-bold block">{SITE.name}</span>
                <span className="text-xs uppercase tracking-[0.14em] text-[hsl(47_23%_85%/0.7)]">
                  {SITE.tagline}
                </span>
              </div>
            </div>
            <p className="text-sm text-[hsl(47_23%_85%/0.7)] max-w-sm leading-relaxed mb-6">
              {t("footer.desc")}
            </p>

            {/* Newsletter */}
            <div className="max-w-sm">
              <h4 className="font-semibold mb-2 text-sm">{t("newsletter.title")}</h4>
              <p className="text-xs text-[hsl(47_23%_85%/0.6)] mb-3">{t("newsletter.desc")}</p>
              <form onSubmit={handleNewsletter} className="space-y-2">
                <input
                  type="text"
                  name="website_url"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute -left-[9999px] h-0 w-0 opacity-0"
                />
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("newsletter.name_placeholder")}
                  disabled={loading}
                  className="bg-white/10 border-white/20 text-[hsl(47_23%_88%)] placeholder:text-[hsl(47_23%_85%/0.5)]"
                />
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("newsletter.email_placeholder")}
                    required
                    disabled={loading}
                    className="bg-white/10 border-white/20 text-[hsl(47_23%_88%)] placeholder:text-[hsl(47_23%_85%/0.5)]"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={loading}
                    className="flex-shrink-0 bg-primary hover:bg-primary/90"
                    title={t("newsletter.submit")}
                    aria-label={t("newsletter.submit")}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.quick_links")}</h4>
            <ul className="space-y-2 text-sm text-[hsl(47_23%_85%/0.7)]">
              <li>
                <a href="/#about" className="hover:text-[hsl(47_30%_90%)] transition-colors">
                  {t("nav.about")}
                </a>
              </li>
              <li>
                <a href="/#news" className="hover:text-[hsl(47_30%_90%)] transition-colors">
                  {t("nav.news")}
                </a>
              </li>
              <li>
                <a href="/market" className="hover:text-[hsl(47_30%_90%)] transition-colors">
                  {t("nav.market")}
                </a>
              </li>
              <li>
                <a href="/#resources" className="hover:text-[hsl(47_30%_90%)] transition-colors">
                  {t("nav.resources")}
                </a>
              </li>
              <li>
                <a href="/members" className="hover:text-[hsl(47_30%_90%)] transition-colors">
                  {t("nav.members")}
                </a>
              </li>
              <li>
                <a href="/jobs" className="hover:text-[hsl(47_30%_90%)] transition-colors">
                  {t("nav.jobs")}
                </a>
              </li>
              <li>
                <a href="/community" className="hover:text-[hsl(47_30%_90%)] transition-colors">
                  {t("nav.community")}
                </a>
              </li>
              <li>
                <a href="/forum" className="hover:text-[hsl(47_30%_90%)] transition-colors">
                  {t("nav.forum")}
                </a>
              </li>
              <li>
                <a href="/courses" className="hover:text-[hsl(47_30%_90%)] transition-colors">
                  {t("nav.courses")}
                </a>
              </li>
              <li>
                <a href="/consultations" className="hover:text-[hsl(47_30%_90%)] transition-colors">
                  {t("nav.consultations")}
                </a>
              </li>
              <li>
                <a href="/blog" className="hover:text-[hsl(47_30%_90%)] transition-colors">
                  {t("nav.blog")}
                </a>
              </li>
              <li>
                <a href="/enterprise" className="hover:text-[hsl(47_30%_90%)] transition-colors">
                  {t("footer.enterprise")}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & Connect */}
          <div>
            <h4 className="font-semibold mb-4">{t("footer.legal")}</h4>
            <ul className="space-y-2 text-sm text-[hsl(47_23%_85%/0.7)]">
              <li>
                <a href="/terms" className="hover:text-[hsl(47_30%_90%)] transition-colors">
                  {t("footer.terms")}
                </a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-[hsl(47_30%_90%)] transition-colors">
                  {t("footer.privacy")}
                </a>
              </li>
            </ul>
            <h4 className="font-semibold mt-6 mb-3">{t("footer.connect")}</h4>
            <div className="flex items-center gap-3">
              <a
                href="https://www.linkedin.com/groups/13155714/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label={t("contact.linkedin")}
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href={`mailto:${SITE.supportEmail}`}
                className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label={SITE.supportEmail}
              >
                <Mail className="w-4 h-4" />
              </a>
              <a
                href="https://flavorexpertsnetwork.com"
                className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label={SITE.name}
              >
                <Globe className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-6 border-t border-white/10 text-center text-sm text-[hsl(47_23%_85%/0.5)]">
          <p>
            © {new Date().getFullYear()} {SITE.name}. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
