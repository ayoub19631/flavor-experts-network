import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Search,
  Users,
  Linkedin,
  Star,
  Loader2,
  MapPin,
  Building2,
  Sparkles,
} from "lucide-react";
import { supabase, type Member } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { usePageMeta } from "@/hooks/use-page-meta";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { rankBySkillOverlap, tokenizeSkills } from "@/lib/matching";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "from-blue-500 to-blue-700",
  "from-emerald-500 to-emerald-700",
  "from-purple-500 to-purple-700",
  "from-amber-500 to-amber-700",
  "from-rose-500 to-rose-700",
  "from-teal-500 to-teal-700",
  "from-indigo-500 to-indigo-700",
  "from-orange-500 to-orange-700",
];

export default function MembersPage() {
  const { t, lang } = useI18n();
  const { user, profile } = useAuth();
  usePageMeta({ title: t("members.title"), description: t("members.desc"), path: "/members" });
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from("member_directory")
          .select(
            "id, full_name, role, specialty, linkedin_url, joined_at, avatar_url, cover_url, is_featured, title, company, location, bio, member_type, years_experience, website, profile_id, skills",
          )
          .order("is_featured", { ascending: false })
          .order("joined_at", { ascending: false });
        if (error || !data) {
          setMembers([]);
        } else {
          setMembers(data as Member[]);
        }
      } catch {
        setMembers([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const specialties = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      (m.specialty || "")
        .split(/[|,]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => set.add(s));
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [members]);

  const locations = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      const loc = (m.location || "").trim();
      if (loc) set.add(loc);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [members]);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (m.full_name || "").toLowerCase().includes(q) ||
      (m.role || "").toLowerCase().includes(q) ||
      (m.specialty || "").toLowerCase().includes(q) ||
      (m.company || "").toLowerCase().includes(q) ||
      (m.location || "").toLowerCase().includes(q) ||
      (m.skills || []).some((s) => String(s).toLowerCase().includes(q));

    const memberSpecs = (m.specialty || "")
      .split(/[|,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const matchesSpecialty =
      specialtyFilter === "all" || memberSpecs.includes(specialtyFilter);
    const matchesLocation =
      locationFilter === "all" || (m.location || "").trim() === locationFilter;
    const matchesFeatured = !featuredOnly || m.is_featured;
    const matchesType =
      typeFilter === "all" ||
      (m.member_type || "individual") === typeFilter;

    return matchesSearch && matchesSpecialty && matchesLocation && matchesFeatured && matchesType;
  });

  const hasFilters =
    search.trim() !== "" ||
    specialtyFilter !== "all" ||
    locationFilter !== "all" ||
    typeFilter !== "all" ||
    featuredOnly;

  const recommended = useMemo(() => {
    if (!user) return [];
    const mySkills = tokenizeSkills(profile?.skills, profile?.specialty || profile?.role);
    return rankBySkillOverlap(
      members,
      (m) => tokenizeSkills(m.skills, m.specialty),
      mySkills,
      {
        exclude: (m) => m.profile_id === user.id || m.id === user.id,
        limit: 4,
      },
    );
  }, [user, profile?.skills, profile?.specialty, profile?.role, members]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative pt-28 pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <img src="/brand/section-community.webp" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(208_100%_10%/0.82)] via-[hsl(208_100%_10%/0.88)] to-background" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("general.back")}
          </Link>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[hsl(47_23%_85%)]" />
                </div>
                <Badge className="bg-white/10 text-[hsl(47_23%_85%)] border-0 px-3 py-1">
                  {t("members.badge")}
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                {t("members.title")}
              </h1>
              <p className="text-white/75 max-w-xl">
                {t("members.desc")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-6 border-b border-border sticky top-16 bg-background/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("members.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder={t("members.filter.specialty")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("members.filter.all")}</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder={t("members.filter.location")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("members.filter.all")}</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder={t("members.filter.type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("members.filter.all")}</SelectItem>
                <SelectItem value="individual">{t("members.filter.type.individual")}</SelectItem>
                <SelectItem value="company">{t("members.filter.type.company")}</SelectItem>
                <SelectItem value="expert">{t("members.filter.type.expert")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={featuredOnly ? "default" : "outline"}
                className="h-10 flex-1 gap-1.5"
                onClick={() => setFeaturedOnly((v) => !v)}
              >
                <Star className={`w-3.5 h-3.5 ${featuredOnly ? "fill-current" : ""}`} />
                {t("members.filter.featured")}
              </Button>
              {hasFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 px-3"
                  onClick={() => {
                    setSearch("");
                    setSpecialtyFilter("all");
                    setLocationFilter("all");
                    setTypeFilter("all");
                    setFeaturedOnly(false);
                  }}
                >
                  {t("members.filter.clear")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-foreground mb-1">{t("members.empty")}</p>
              <p className="text-sm">{t("members.empty.desc")}</p>
              <Button asChild className="mt-6">
                <Link to="/auth">{t("profile.cta.join")}</Link>
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground space-y-4">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{t("members.none")}{search ? ` "${search}"` : ""}</p>
              {hasFilters && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setSpecialtyFilter("all");
                    setLocationFilter("all");
                    setTypeFilter("all");
                    setFeaturedOnly(false);
                  }}
                >
                  {t("members.filter.clear")}
                </Button>
              )}
            </div>
          ) : (
            <>
              {recommended.length > 0 && !hasFilters && (
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("members.recommended")}
                    </h2>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {recommended.map((m) => (
                      <Link
                        key={`rec-${m.id}`}
                        to={`/members/${m.id}`}
                        className="rounded-xl border border-primary/20 bg-primary/5 p-4 hover:border-primary/40 transition-colors"
                      >
                        <p className="font-medium text-sm truncate">{m.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">{m.role || m.specialty}</p>
                        <Badge className="mt-3 bg-primary/10 text-primary border-0 text-[10px]">
                          {m.matchScore} {t("profile.match")}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-sm text-muted-foreground mb-6">
                {t("members.showing")} {filtered.length}{" "}
                {filtered.length !== 1 ? t("members.members") : t("members.member")}
                {search && ` — "${search}"`}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filtered.map((member, i) => {
                  const specialty = (member.specialty || "")
                    .split(/[|,]/)
                    .map((s) => s.trim())
                    .filter(Boolean)[0];
                  return (
                    <Link
                      key={member.id}
                      to={`/members/${member.id}`}
                      className="group rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-200 overflow-hidden block"
                    >
                      <div className="p-5">
                        <div className="flex items-start gap-3 mb-3">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.full_name}
                              className="w-12 h-12 rounded-xl object-cover flex-shrink-0 shadow-md"
                            />
                          ) : (
                            <div
                              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center flex-shrink-0 shadow-md`}
                            >
                              <span className="text-sm font-bold text-white">
                                {getInitials(member.full_name)}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                                {member.full_name}
                              </h3>
                              {member.is_featured && (
                                <Star className="w-3.5 h-3.5 text-primary flex-shrink-0 fill-primary" />
                              )}
                            </div>
                            <p className="text-xs text-primary font-medium truncate">
                              {member.title || member.role}
                            </p>
                            {member.company && (
                              <p className="text-xs text-muted-foreground truncate inline-flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3" />
                                {member.company}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {specialty && (
                            <Badge variant="secondary" className="text-xs font-normal">
                              {specialty}
                            </Badge>
                          )}
                          {member.location && (
                            <Badge variant="outline" className="text-xs font-normal text-muted-foreground gap-1">
                              <MapPin className="w-3 h-3" />
                              {member.location}
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 min-h-[2.5rem]">
                          {member.bio?.trim() ||
                            `${t("members.joined")} ${new Date(member.joined_at).toLocaleDateString(
                              lang === "ar" ? "ar-SA" : "en-US",
                              { month: "short", year: "numeric" },
                            )}`}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-primary group-hover:underline">
                            {t("members.view_profile")}
                          </span>
                          {member.linkedin_url && (
                            <span className="inline-flex items-center gap-1 text-xs text-[#0a66c2]">
                              <Linkedin className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
