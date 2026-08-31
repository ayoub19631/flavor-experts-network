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
  UserPlus,
  Check,
  Clock,
  MessageSquare,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase, type Member } from "@/lib/supabase";
import { safeHttpUrl } from "@/lib/url";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { usePageMeta } from "@/hooks/use-page-meta";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { SITE } from "@/lib/site-config";
import {
  asEducation,
  asProjects,
  asWorkExperience,
} from "@/lib/profile-details";
import {
  getConnectionBetween,
  resolveMemberUserId,
  respondToConnection,
  sendConnectionRequest,
  type MemberConnection,
} from "@/lib/connections";
import { rankBySkillOverlap, tokenizeSkills } from "@/lib/matching";
import type { JobListing, SocialPost } from "@/lib/types";
import {
  fetchAcceptedRecommendations,
  fetchEndorsements,
  fetchFollowerCount,
  fetchProfileViewCount,
  isFollowing,
  recordProfileView,
  submitRecommendation,
  toggleEndorsement,
  toggleFollow,
} from "@/lib/network";
import { toast } from "sonner";

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
  const { user } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [similar, setSimilar] = useState<Array<Member & { matchScore: number }>>([]);
  const [companyJobs, setCompanyJobs] = useState<JobListing[]>([]);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [connection, setConnection] = useState<MemberConnection | null>(null);
  const [connectBusy, setConnectBusy] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [views, setViews] = useState(0);
  const [activity, setActivity] = useState<SocialPost[]>([]);
  const [endorsements, setEndorsements] = useState<Map<string, { count: number; mine: boolean }>>(new Map());
  const [recs, setRecs] = useState<Array<{ id: string; author_id: string; relationship: string; body: string }>>([]);
  const [recDraft, setRecDraft] = useState("");
  const [recBusy, setRecBusy] = useState(false);

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
        setSimilar([]);
        setCompanyJobs([]);
        setTargetUserId(null);
        setConnection(null);
      } else {
        const row = data as Member;
        setMember(row);
        setNotFound(false);
        const uid = await resolveMemberUserId(row);
        if (!cancelled) setTargetUserId(uid);

        const mySkills = tokenizeSkills(row.skills, row.specialty);
        const { data: peers } = await supabase
          .from("member_directory")
          .select(MEMBER_SELECT)
          .neq("id", row.id)
          .limit(60);
        if (!cancelled) {
          setSimilar(
            rankBySkillOverlap(
              (peers as Member[]) || [],
              (m) => tokenizeSkills(m.skills, m.specialty),
              mySkills,
              { limit: 4 },
            ),
          );
        }

        if (row.member_type === "company" && uid) {
          const { data: jobs } = await supabase
            .from("job_listings")
            .select("*")
            .eq("company_id", uid)
            .eq("is_published", true)
            .eq("status", "open")
            .order("created_at", { ascending: false })
            .limit(5);
          if (!cancelled) setCompanyJobs((jobs as JobListing[]) || []);
        } else if (!cancelled) {
          setCompanyJobs([]);
        }
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    async function loadConnection() {
      if (!user?.id || !targetUserId || user.id === targetUserId) {
        setConnection(null);
        return;
      }
      const row = await getConnectionBetween(user.id, targetUserId);
      if (!cancelled) setConnection(row);
    }
    loadConnection();
    return () => {
      cancelled = true;
    };
  }, [user?.id, targetUserId]);

  useEffect(() => {
    if (!targetUserId) return;
    let cancelled = false;
    async function loadNetwork() {
      const [follows, count, posts, endorseMap, accepted, viewCount] = await Promise.all([
        user?.id && user.id !== targetUserId ? isFollowing(user.id, targetUserId) : Promise.resolve(false),
        fetchFollowerCount(targetUserId),
        supabase
          .from("social_posts")
          .select("id, body, created_at, likes_count, image_url")
          .eq("author_id", targetUserId)
          .eq("is_published", true)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(4),
        fetchEndorsements(targetUserId),
        fetchAcceptedRecommendations(targetUserId),
        user?.id === targetUserId ? fetchProfileViewCount(targetUserId) : Promise.resolve(0),
      ]);
      if (cancelled) return;
      setFollowing(follows);
      setFollowers(count);
      setActivity((posts.data as SocialPost[]) || []);
      const mapped = new Map<string, { count: number; mine: boolean }>();
      endorseMap.forEach((value, skill) => {
        mapped.set(skill, { count: value.count, mine: !!user?.id && value.endorsers.includes(user.id) });
      });
      setEndorsements(mapped);
      setRecs(accepted as Array<{ id: string; author_id: string; relationship: string; body: string }>);
      setViews(viewCount);
      if (user?.id && user.id !== targetUserId) {
        recordProfileView(user.id, targetUserId);
      }
    }
    loadNetwork();
    return () => {
      cancelled = true;
    };
  }, [targetUserId, user?.id]);

  const isOwnProfile = !!(user?.id && targetUserId && user.id === targetUserId);

  const handleConnect = async () => {
    if (!user) {
      toast.message(lang === "ar" ? "سجّل الدخول للتواصل" : "Sign in to connect");
      return;
    }
    if (!targetUserId) {
      toast.error(lang === "ar" ? "لا يمكن إرسال الطلب لهذا الملف" : "Cannot connect to this profile yet");
      return;
    }
    setConnectBusy(true);
    if (connection?.status === "pending" && connection.addressee_id === user.id) {
      const { error } = await respondToConnection(connection.id, "accepted");
      if (error) toast.error(error);
      else {
        toast.success(lang === "ar" ? "تم قبول الطلب" : "Connection accepted");
        setConnection({ ...connection, status: "accepted" });
      }
    } else if (!connection) {
      const { error } = await sendConnectionRequest(user.id, targetUserId);
      if (error) toast.error(error);
      else {
        toast.success(lang === "ar" ? "تم إرسال طلب التواصل" : "Connection request sent");
        const row = await getConnectionBetween(user.id, targetUserId);
        setConnection(row);
      }
    }
    setConnectBusy(false);
  };

  const handleFollow = async () => {
    if (!user || !targetUserId) {
      toast.message(t("profile.connect.signin"));
      return;
    }
    const { error } = await toggleFollow(user.id, targetUserId, following);
    if (error) toast.error(error);
    else {
      setFollowing(!following);
      setFollowers((n) => Math.max(0, n + (following ? -1 : 1)));
    }
  };

  const handleEndorse = async (skill: string) => {
    if (!user || !targetUserId || isOwnProfile) return;
    const current = endorsements.get(skill);
    const mine = !!current?.mine;
    const { error } = await toggleEndorsement(user.id, targetUserId, skill, mine);
    if (error) {
      toast.error(error);
      return;
    }
    const next = new Map(endorsements);
    next.set(skill, { count: Math.max(0, (current?.count || 0) + (mine ? -1 : 1)), mine: !mine });
    setEndorsements(next);
  };

  const handleRecommend = async () => {
    if (!user || !targetUserId) return;
    setRecBusy(true);
    const { error } = await submitRecommendation(user.id, targetUserId, recDraft, "colleague");
    setRecBusy(false);
    if (error) toast.error(error);
    else {
      toast.success(t("profile.rec.sent"));
      setRecDraft("");
    }
  };

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
                      <p className="text-xs text-muted-foreground">
                        {followers} {t("profile.followers")}
                        {isOwnProfile ? ` · ${views} ${t("profile.views")}` : ""}
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
                    {!isOwnProfile && (
                      <Button
                        size="sm"
                        className="gap-1.5"
                        disabled={connectBusy || connection?.status === "accepted" || (connection?.status === "pending" && connection.requester_id === user?.id)}
                        onClick={handleConnect}
                      >
                        {connectBusy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : connection?.status === "accepted" ? (
                          <Check className="w-4 h-4" />
                        ) : connection?.status === "pending" ? (
                          <Clock className="w-4 h-4" />
                        ) : (
                          <UserPlus className="w-4 h-4" />
                        )}
                        {!user
                          ? t("profile.connect.signin")
                          : connection?.status === "accepted"
                            ? t("profile.connect.connected")
                            : connection?.status === "pending" && connection.addressee_id === user?.id
                              ? t("profile.connect.accept")
                              : connection?.status === "pending"
                                ? t("profile.connect.pending")
                                : t("profile.connect")}
                      </Button>
                    )}
                    {!isOwnProfile && user && (
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={handleFollow}>
                        <UserCheck className="w-4 h-4" />
                        {following ? t("profile.following") : t("profile.follow")}
                      </Button>
                    )}
                    {!isOwnProfile && connection?.status === "accepted" && targetUserId && (
                      <Button asChild size="sm" variant="outline" className="gap-1.5">
                        <Link to={`/messages?with=${targetUserId}`}>
                          <MessageSquare className="w-4 h-4" />
                          {t("profile.message")}
                        </Link>
                      </Button>
                    )}
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

              {member.member_type === "company" && (
                <section className="rounded-2xl border border-border bg-card p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("profile.open_roles")}
                    </h2>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/jobs">{t("nav.jobs")}</Link>
                    </Button>
                  </div>
                  {companyJobs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("profile.open_roles.empty")}</p>
                  ) : (
                    <div className="space-y-2">
                      {companyJobs.map((job) => (
                        <Link
                          key={job.id}
                          to="/jobs"
                          className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3 hover:border-primary/40 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{job.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {[job.location, job.employment_type].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <Briefcase className="w-4 h-4 text-primary shrink-0" />
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {similar.length > 0 && (
                <section className="rounded-2xl border border-border bg-card p-6 sm:p-7">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    {t("profile.similar")}
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {similar.map((peer) => (
                      <Link
                        key={peer.id}
                        to={`/members/${peer.id}`}
                        className="flex items-center gap-3 rounded-xl border border-border/70 p-3 hover:border-primary/40 transition-colors"
                      >
                        {peer.avatar_url ? (
                          <img src={peer.avatar_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {getInitials(peer.full_name)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{peer.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{peer.role || peer.specialty}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {peer.matchScore} {t("profile.match")}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

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

                  {activity.length > 0 && (
                    <section className="rounded-2xl border border-border bg-card p-6 sm:p-7">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                        {t("profile.activity")}
                      </h2>
                      <div className="space-y-3">
                        {activity.map((post) => (
                          <Link
                            key={post.id}
                            to={`/community#post-${post.id}`}
                            className="block rounded-xl border border-border/70 p-3 hover:border-primary/30"
                          >
                            <p className="text-sm line-clamp-3">{post.body}</p>
                          </Link>
                        ))}
                      </div>
                    </section>
                  )}

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
                      {skills.map((skill) => {
                        const meta = endorsements.get(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            disabled={!user || isOwnProfile}
                            onClick={() => handleEndorse(skill)}
                            className={`rounded-full px-2.5 py-1 text-xs border ${
                              meta?.mine
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-primary/10 text-primary border-transparent"
                            }`}
                          >
                            {skill}
                            {meta?.count ? ` · ${meta.count}` : ""}
                          </button>
                        );
                      })}
                      {!skills.length && (
                        <p className="text-sm text-muted-foreground">{t("profile.skills.empty")}</p>
                      )}
                    </div>
                    {!isOwnProfile && user && connection?.status === "accepted" && (
                      <div className="mt-5 space-y-2">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">{t("profile.rec.write")}</p>
                        <textarea
                          value={recDraft}
                          onChange={(e) => setRecDraft(e.target.value.slice(0, 2000))}
                          className="w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder={t("profile.rec.ph")}
                        />
                        <Button size="sm" disabled={recBusy || recDraft.trim().length < 20} onClick={handleRecommend}>
                          {t("profile.rec.send")}
                        </Button>
                      </div>
                    )}
                    {recs.length > 0 && (
                      <div className="mt-5 space-y-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">{t("profile.rec.title")}</p>
                        {recs.map((rec) => (
                          <p key={rec.id} className="text-sm text-muted-foreground leading-relaxed">
                            “{rec.body}”
                          </p>
                        ))}
                      </div>
                    )}
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
