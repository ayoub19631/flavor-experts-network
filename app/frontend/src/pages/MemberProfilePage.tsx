import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Globe,
  Linkedin,
  Loader2,
  MapPin,
  Star,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase, type Member } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { SITE } from "@/lib/site-config";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useI18n();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("members")
        .select(
          "id, full_name, role, specialty, linkedin_url, joined_at, avatar_url, is_featured, title, company, location, bio, member_type, years_experience, website",
        )
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setMember(null);
      } else {
        setMember(data as Member);
        setNotFound(false);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const title = member
    ? `${member.full_name} — ${member.role || t("profile.member")}`
    : t("profile.title");
  const description =
    member?.bio?.trim() ||
    [member?.role, member?.company, member?.location].filter(Boolean).join(" · ") ||
    t("profile.desc");

  usePageMeta({
    title,
    description,
    path: id ? `/members/${id}` : "/members",
    image: member?.avatar_url || SITE.ogImage,
  });

  const joinedLabel = member?.joined_at
    ? new Date(member.joined_at).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative pt-20">
        <div className="absolute inset-x-0 top-0 h-56 sm:h-64 overflow-hidden">
          <img
            src="/brand/hero-flavor-lab.png"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(208_100%_10%/0.55)] via-[hsl(208_100%_10%/0.72)] to-background" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <Link
            to="/members"
            className="inline-flex items-center gap-2 text-sm text-white/85 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("profile.back")}
          </Link>

          {loading ? (
            <div className="flex justify-center py-28">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : notFound || !member ? (
            <div className="mt-16 rounded-2xl border border-border bg-card p-10 text-center">
              <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <h1 className="text-xl font-semibold mb-2">{t("profile.not_found")}</h1>
              <p className="text-muted-foreground mb-6">{t("profile.not_found.desc")}</p>
              <Button asChild>
                <Link to="/members">{t("profile.browse")}</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-10 space-y-6 animate-[fadeIn_0.5s_ease-out]">
              <div className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur shadow-xl overflow-hidden">
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row gap-6 sm:items-end">
                    <div className="relative shrink-0">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.full_name}
                          className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover ring-4 ring-background shadow-lg"
                        />
                      ) : (
                        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-[hsl(208_100%_18%)] to-[hsl(208_70%_28%)] flex items-center justify-center ring-4 ring-background shadow-lg">
                          <span className="text-3xl font-bold text-[hsl(47_23%_85%)]">
                            {getInitials(member.full_name)}
                          </span>
                        </div>
                      )}
                      {member.is_featured && (
                        <span className="absolute -bottom-2 -end-2 inline-flex items-center gap-1 rounded-full bg-amber-500 text-white text-[10px] font-semibold px-2 py-1 shadow">
                          <Star className="w-3 h-3 fill-white" />
                          {t("profile.featured")}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                          {member.full_name}
                        </h1>
                        {member.member_type === "company" && (
                          <Badge variant="secondary">{t("profile.type.company")}</Badge>
                        )}
                        {member.member_type === "expert" && (
                          <Badge className="bg-primary/10 text-primary border-0">
                            {t("profile.type.expert")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-base sm:text-lg text-primary font-medium">
                        {member.title || member.role}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                        {member.company && (
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" />
                            {member.company}
                          </span>
                        )}
                        {member.location && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            {member.location}
                          </span>
                        )}
                        {joinedLabel && (
                          <span>
                            {t("members.joined")} {joinedLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {member.linkedin_url && (
                      <Button asChild size="sm" className="gap-1.5 bg-[#0a66c2] hover:bg-[#004182]">
                        <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="w-4 h-4" />
                          {t("members.linkedin")}
                        </a>
                      </Button>
                    )}
                    {member.website && (
                      <Button asChild size="sm" variant="outline" className="gap-1.5">
                        <a href={member.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="w-4 h-4" />
                          {t("profile.website")}
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      </Button>
                    )}
                    <Button asChild size="sm" variant="outline">
                      <Link to="/community">{t("profile.community")}</Link>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 sm:p-7">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    {t("profile.about")}
                  </h2>
                  {member.bio?.trim() ? (
                    <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {member.bio}
                    </p>
                  ) : (
                    <p className="text-muted-foreground leading-relaxed">
                      {t("profile.about.empty")}
                    </p>
                  )}
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      {t("profile.focus")}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {(member.specialty || "")
                        .split(/[|,]/)
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .map((tag) => (
                          <Badge key={tag} variant="secondary" className="font-normal">
                            {tag}
                          </Badge>
                        ))}
                      {!member.specialty?.trim() && (
                        <p className="text-sm text-muted-foreground">{t("profile.focus.empty")}</p>
                      )}
                    </div>
                    {typeof member.years_experience === "number" && member.years_experience > 0 && (
                      <p className="mt-4 text-sm text-muted-foreground">
                        {t("profile.experience").replace(
                          "{years}",
                          String(member.years_experience),
                        )}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-6 overflow-hidden relative">
                    <img
                      src="/brand/section-market.jpg"
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-20"
                    />
                    <div className="relative">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        {SITE.name}
                      </h2>
                      <p className="text-sm text-foreground/85 leading-relaxed mb-4">
                        {t("profile.cta.desc")}
                      </p>
                      <Button asChild size="sm" className="w-full">
                        <Link to="/auth">{t("profile.cta.join")}</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
