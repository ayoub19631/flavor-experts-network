import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  ExternalLink,
  Globe,
  GraduationCap,
  Linkedin,
  Loader2,
  MapPin,
  FolderKanban,
  Sparkles,
  Star,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase, type Member } from "@/lib/supabase";
import { safeHttpUrl } from "@/lib/url";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { SITE } from "@/lib/site-config";
import {
  asEducation,
  asProjects,
  asWorkExperience,
} from "@/lib/profile-details";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const MEMBER_SELECT =
  "id, full_name, role, specialty, linkedin_url, joined_at, avatar_url, cover_url, is_featured, title, company, location, bio, member_type, years_experience, website, profile_id, skills, education, work_experience, projects";

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
        .from("member_directory")
        .select(MEMBER_SELECT)
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
    image: member?.avatar_url || member?.cover_url || SITE.ogImage,
  });

  const joinedLabel = member?.joined_at
    ? new Date(member.joined_at).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  const linkedinHref = safeHttpUrl(member?.linkedin_url);
  const websiteHref = safeHttpUrl(member?.website);
  const coverSrc = member?.cover_url?.trim() || "/brand/hero-flavor-lab.webp";

  const specialties = useMemo(
    () =>
      (member?.specialty || "")
        .split(/[|,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [member?.specialty],
  );
  const skills = useMemo(
    () => (member?.skills || []).map((s) => String(s).trim()).filter(Boolean),
    [member?.skills],
  );
  const education = useMemo(() => asEducation(member?.education), [member?.education]);
  const experience = useMemo(
    () => asWorkExperience(member?.work_experience),
    [member?.work_experience],
  );
  const projects = useMemo(() => asProjects(member?.projects), [member?.projects]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative pt-16">
        <div className="relative h-48 sm:h-64 md:h-72 overflow-hidden">
          <img
            src={coverSrc}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(208_100%_10%/0.35)] via-[hsl(208_100%_10%/0.45)] to-background" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 -mt-20 sm:-mt-24">
          <Link
            to="/members"
            className="inline-flex items-center gap-2 text-sm text-white/90 hover:text-white mb-4 sm:mb-6 transition-colors drop-shadow"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("profile.back")}
          </Link>

          {loading ? (
            <div className="flex justify-center py-28">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : notFound || !member ? (
            <div className="mt-8 rounded-2xl border border-border bg-card p-10 text-center">
              <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <h1 className="text-xl font-semibold mb-2">{t("profile.not_found")}</h1>
              <p className="text-muted-foreground mb-6">{t("profile.not_found.desc")}</p>
              <Button asChild>
                <Link to="/members">{t("profile.browse")}</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
              <div className="rounded-2xl border border-border/80 bg-card shadow-xl overflow-hidden">
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row gap-6 sm:items-end">
                    <div className="relative shrink-0 -mt-16 sm:-mt-20">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.full_name}
                          className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover ring-4 ring-card shadow-lg"
                        />
                      ) : (
                        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-gradient-to-br from-[hsl(208_100%_18%)] to-[hsl(208_70%_28%)] flex items-center justify-center ring-4 ring-card shadow-lg">
                          <span className="text-3xl font-bold text-[hsl(47_23%_85%)]">
                            {getInitials(member.full_name)}
                          </span>
                        </div>
                      )}
                      {member.is_featured && (
                        <span className="absolute -bottom-2 -end-2 inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-1 shadow">
                          <Star className="w-3 h-3 fill-current" />
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
                        {typeof member.years_experience === "number" &&
                          member.years_experience > 0 && (
                            <span className="inline-flex items-center gap-1.5">
                              <Briefcase className="w-3.5 h-3.5" />
                              {t("profile.experience").replace(
                                "{years}",
                                String(member.years_experience),
                              )}
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
                    {linkedinHref && (
                      <Button asChild size="sm" className="gap-1.5 bg-[#0a66c2] hover:bg-[#004182]">
                        <a href={linkedinHref} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="w-4 h-4" />
                          {t("members.linkedin")}
                        </a>
                      </Button>
                    )}
                    {websiteHref && (
                      <Button asChild size="sm" variant="outline" className="gap-1.5">
                        <a href={websiteHref} target="_blank" rel="noopener noreferrer">
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
                <div className="lg:col-span-2 space-y-5">
                  <section className="rounded-2xl border border-border bg-card p-6 sm:p-7">
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
                  </section>

                  <section className="rounded-2xl border border-border bg-card p-6 sm:p-7">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 inline-flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      {t("profile.work")}
                    </h2>
                    {experience.length ? (
                      <ul className="space-y-4">
                        {experience.map((item) => (
                          <li
                            key={`${item.title}-${item.company}-${item.period}`}
                            className="relative ps-4 border-s-2 border-primary/25"
                          >
                            <p className="font-semibold text-foreground">{item.title}</p>
                            {(item.company || item.period) && (
                              <p className="text-sm text-primary/90 mt-0.5">
                                {[item.company, item.period].filter(Boolean).join(" · ")}
                              </p>
                            )}
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                                {item.description}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("profile.work.empty")}</p>
                    )}
                  </section>

                  <section className="rounded-2xl border border-border bg-card p-6 sm:p-7">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 inline-flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      {t("profile.education")}
                    </h2>
                    {education.length ? (
                      <ul className="space-y-3">
                        {education.map((item) => (
                          <li key={`${item.school}-${item.degree}-${item.year}`}>
                            <p className="font-semibold text-foreground">{item.school}</p>
                            {(item.degree || item.year) && (
                              <p className="text-sm text-muted-foreground">
                                {[item.degree, item.year].filter(Boolean).join(" · ")}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("profile.education.empty")}</p>
                    )}
                  </section>

                  <section className="rounded-2xl border border-border bg-card p-6 sm:p-7">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 inline-flex items-center gap-2">
                      <FolderKanban className="w-4 h-4" />
                      {t("profile.projects")}
                    </h2>
                    {projects.length ? (
                      <ul className="space-y-4">
                        {projects.map((item) => {
                          const href = safeHttpUrl(item.url);
                          return (
                            <li key={`${item.name}-${item.url}`}>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-foreground">{item.name}</p>
                                {href && (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                  >
                                    {t("profile.project_link")}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("profile.projects.empty")}</p>
                    )}
                  </section>
                </div>

                <aside className="space-y-5">
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 inline-flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      {t("profile.focus")}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {specialties.map((tag) => (
                        <Badge key={tag} variant="secondary" className="font-normal">
                          {tag}
                        </Badge>
                      ))}
                      {!specialties.length && (
                        <p className="text-sm text-muted-foreground">{t("profile.focus.empty")}</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      {t("profile.skills")}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <Badge
                          key={skill}
                          className="bg-primary/10 text-primary border-0 font-normal"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {!skills.length && (
                        <p className="text-sm text-muted-foreground">{t("profile.skills.empty")}</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-card p-6 overflow-hidden relative">
                    <img
                      src="/brand/section-market.webp"
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
                </aside>
              </div>
            </div>
          )}
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
