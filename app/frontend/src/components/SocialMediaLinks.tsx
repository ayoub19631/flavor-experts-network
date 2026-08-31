import { Instagram, Facebook, Youtube, Linkedin, Users, Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { configuredSocialLinks, type SocialNetwork } from "@/lib/social-links";

const ICONS: Record<SocialNetwork, typeof Linkedin> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  linkedinPage: Linkedin,
  linkedinGroup: Users,
  website: Globe,
};

type SocialMediaLinksProps = {
  variant?: "footer" | "contact" | "follow";
};

export default function SocialMediaLinks({ variant = "footer" }: SocialMediaLinksProps) {
  const { t } = useI18n();
  const links = configuredSocialLinks();

  if (variant === "follow") {
    return (
      <section id="follow" className="py-16 border-t border-border bg-secondary/30 dark:bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{t("social.follow_title")}</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">{t("social.follow_desc")}</p>
          <ul className="mt-8 flex flex-wrap justify-center gap-3">
            {links.map((link) => {
              const Icon = ICONS[link.id];
              return (
                <li key={link.id}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t(link.ariaKey)}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-medium text-foreground shadow-sm hover:border-primary/40 hover:bg-primary/5 dark:bg-card dark:hover:bg-primary/10 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    {t(link.labelKey)}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    );
  }

  if (variant === "contact") {
    return (
      <div className="space-y-3">
        <h4 className="font-semibold text-foreground">{t("social.follow_title")}</h4>
        <p className="text-sm text-muted-foreground">{t("social.follow_desc")}</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {links.map((link) => {
            const Icon = ICONS[link.id];
            return (
              <li key={link.id}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(link.ariaKey)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground hover:border-primary/40 hover:text-primary dark:bg-card transition-colors w-full"
                >
                  <Icon className="w-4 h-4 shrink-0 text-primary" aria-hidden="true" />
                  {t(link.labelKey)}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <h4 className="font-semibold mb-3">{t("social.follow_title")}</h4>
      <p className="text-xs text-[hsl(47_23%_85%/0.6)] mb-3">{t("social.follow_desc")}</p>
      <ul className="grid grid-cols-2 gap-2">
        {links.map((link) => {
          const Icon = ICONS[link.id];
          return (
            <li key={link.id}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t(link.ariaKey)}
                title={t(link.labelKey)}
                className="flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-2 text-xs hover:bg-white/20 transition-colors"
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{t(link.labelKey)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
