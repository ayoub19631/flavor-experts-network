import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  User, Crown, Calendar, BookOpen, LogOut, ArrowLeft,
  TrendingUp, Star, ShieldCheck, Edit3, Save, X,
  CheckCircle, Loader2, Linkedin, Globe, MapPin, Building2, Phone,
  Bell, Award, BarChart2, ExternalLink, Mail, Lock,
  ChevronRight, Zap, Users, FileText, Briefcase, Sparkles,
  FlaskConical, Video, Download, BarChart, Rocket, Gift,
  CreditCard, RefreshCw, ArrowUpCircle, BookMarked,
  LineChart, PieChart, Target, Layers, Newspaper, MessageSquareText, Send, Heart,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { openResourceLink } from "@/lib/resources";
import { enrichSocialPosts } from "@/lib/social";
import { safeHttpUrl } from "@/lib/url";
import { usePageMeta } from "@/hooks/use-page-meta";
import type { SocialPost } from "@/lib/types";
import Navbar from "@/components/Navbar";
import { AvatarUploader, FileUploader } from "@/components/ui/file-uploader";
import { SITE } from "@/lib/site-config";
import {
  asEducation,
  asProjects,
  asWorkExperience,
  buildProfileSavePayload,
  formatPipeLines,
  formatSkills,
  profileViewFromPayload,
} from "@/lib/profile-details";
import { toast } from "sonner";
import {
  fetchMemberIdsByProfileIds,
  fetchProfileNames,
  listAcceptedConnections,
  listPendingIncoming,
  peerUserId,
  respondToConnection,
  type MemberConnection,
} from "@/lib/connections";
import { profileCompletionPercent } from "@/lib/profile-completion";

interface ExtendedProfile {
  full_name?: string;
  role?: string;
  company?: string;
  location?: string;
  bio?: string;
  linkedin_url?: string;
  website_url?: string;
  phone?: string;
  account_type?: string;
  subscription_tier?: string;
  is_admin?: boolean;
  created_at?: string;
  avatar_url?: string;
  cover_url?: string;
  specialty?: string;
  years_experience?: number | null;
  skills?: string[];
  skills_text?: string;
  education_text?: string;
  work_text?: string;
  projects_text?: string;
}

const TIER_CONFIG = {
  free: {
    label: "Free",
    labelAr: "مجاني",
    color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    border: "border-gray-200",
    icon: null,
    gradient: "from-gray-400 to-gray-500",
    bgGlow: "",
  },
  professional: {
    label: "Professional",
    labelAr: "احترافي",
    color: "bg-primary/10 text-primary",
    border: "border-primary/30",
    icon: Crown,
    gradient: "from-primary via-primary/80 to-primary/60",
    bgGlow: "shadow-primary/20",
  },
  enterprise: {
    label: "Enterprise",
    labelAr: "مؤسسي",
    color: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
    border: "border-primary/30",
    icon: Star,
    gradient: "from-[hsl(208_100%_16%)] via-[hsl(208_70%_28%)] to-[hsl(47_30%_70%)]",
    bgGlow: "shadow-primary/20",
  },
};

interface PremiumResource {
  title: string;
  category: string;
  type: string;
  description: string | null;
  link: string | null;
  id: string;
}

interface WebinarResource {
  title: string;
  date: string;
  description: string | null;
  link: string | null;
  id: string;
}

interface EnterpriseStatItem {
  label: string;
  labelAr: string;
  value: string;
  icon: React.ElementType;
}

export default function DashboardPage() {
  const { user, profile, signOut, isPremium, isEnterprise, isAdmin, updateProfile } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();

  // Private workspace page — never index.
  usePageMeta({
    title: t("dash.copy.dashboard"),
    description:
      t("dash.copy.manage_your_profile_posts_resources_and_membersh"),
    path: "/dashboard",
    noIndex: true,
  });

  const [activeTab, setActiveTab] = useState<"overview" | "premium" | "profile" | "posts" | "security" | "subscription">(() => {
    const tab = searchParams.get("tab");
    if (tab === "profile" || tab === "premium" || tab === "posts" || tab === "security" || tab === "subscription") {
      return tab;
    }
    return "overview";
  });

  const selectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "overview") next.delete("tab");
      else next.set("tab", tab);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "profile" || tab === "premium" || tab === "posts" || tab === "security" || tab === "subscription") {
      setActiveTab(tab);
    } else if (!tab) {
      setActiveTab("overview");
    }
  }, [searchParams]);

  const [myPosts, setMyPosts] = useState<SocialPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [dashPostBody, setDashPostBody] = useState("");
  const [dashPublishing, setDashPublishing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [extProfile, setExtProfile] = useState<ExtendedProfile>({});
  const [editData, setEditData] = useState<ExtendedProfile>({});

  // ── Real data from Supabase (replaces mock constants) ──────────────────────
  const [premiumResources, setPremiumResources] = useState<PremiumResource[]>([]);
  const [upcomingWebinars, setUpcomingWebinars] = useState<WebinarResource[]>([]);
  const [enterpriseStats, setEnterpriseStats] = useState<EnterpriseStatItem[]>([]);
  const [pendingConnections, setPendingConnections] = useState<MemberConnection[]>([]);
  const [acceptedConnections, setAcceptedConnections] = useState<MemberConnection[]>([]);
  const [connectionNames, setConnectionNames] = useState<Record<string, string>>({});
  const [memberIdsByProfile, setMemberIdsByProfile] = useState<Record<string, string>>({});
  const [connectionBusy, setConnectionBusy] = useState<string | null>(null);
  useEffect(() => {
    async function loadNetworkLearning() {
      if (!user?.id) return;
      const [pending, accepted] = await Promise.all([
        listPendingIncoming(user.id),
        listAcceptedConnections(user.id),
      ]);
      setPendingConnections(pending);
      setAcceptedConnections(accepted);
      const ids = [
        ...pending.map((r) => r.requester_id),
        ...accepted.map((r) => peerUserId(r, user.id)),
      ];
      setConnectionNames(await fetchProfileNames(ids));
      setMemberIdsByProfile(await fetchMemberIdsByProfileIds(ids));
    }
    loadNetworkLearning();
  }, [user?.id]);

  useEffect(() => {
    async function fetchDashboardData() {
      const [resourcesRes, webinarsRes, newsRes, membersRes, secureLinksRes] = await Promise.all([
        supabase.from("educational_resources").select("id,title,category,type,description,link").eq("premium", true).eq("is_published", true).limit(4),
        supabase.from("educational_resources").select("id,title,description,link,created_at,premium").eq("type", "webinar").eq("is_published", true).order("created_at", { ascending: false }).limit(3),
        supabase.from("industry_news").select("id", { count: "exact", head: true }).eq("is_published", true),
        supabase.from("member_directory").select("id", { count: "exact", head: true }),
        supabase.from("resource_secure_links").select("resource_id,url"),
      ]);

      const linkMap = new Map((secureLinksRes.data ?? []).map((l) => [l.resource_id, l.url]));

      if (resourcesRes.data) {
        setPremiumResources(resourcesRes.data.map((r) => ({
          ...r,
          link: linkMap.get(r.id) || r.link || "",
        })) as PremiumResource[]);
      }

      if (webinarsRes.data) {
        setUpcomingWebinars(webinarsRes.data.map((r) => ({
          id: r.id,
          title: r.title,
          date: new Date(r.created_at as string).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { month: "long", day: "numeric", year: "numeric" }),
          description: r.description,
          link: (r.premium ? linkMap.get(r.id) : null) || r.link || "",
        })));
      }

      setEnterpriseStats([
        { label: t("dash.copy.published_news"), labelAr: t("dash.copy.published_news"), value: String(newsRes.count ?? 0), icon: Newspaper },
        { label: t("dash.copy.total_members"), labelAr: t("dash.copy.total_members"), value: String(membersRes.count ?? 0), icon: Users },
        { label: t("dash.copy.member_resources"), labelAr: t("dash.copy.member_resources"), value: String(resourcesRes.data?.length ?? 0), icon: BookOpen },
        { label: t("dash.copy.company_access"), labelAr: t("dash.copy.company_access"), value: t("dash.copy.active"), icon: Star },
      ]);
    }
    fetchDashboardData();
  }, [lang, t]);

  useEffect(() => {
    if (user?.id) {
      // Fetch DB profile and merge with auth metadata
      supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          const meta = user.user_metadata || {};
          const education = asEducation(data?.education);
          const work = asWorkExperience(data?.work_experience);
          const projects = asProjects(data?.projects);
          const merged: ExtendedProfile = {
            full_name: data?.full_name || meta.full_name || profile?.full_name || "",
            role: data?.role || meta.role || "",
            company: data?.company || meta.company || "",
            location: data?.location || meta.location || "",
            bio: data?.bio || meta.bio || "",
            linkedin_url: data?.linkedin_url || meta.linkedin_url || "",
            website_url: data?.website_url || meta.website_url || "",
            phone: data?.phone || meta.phone || "",
            account_type: data?.account_type || meta.account_type || "individual",
            subscription_tier: data?.subscription_tier || meta.subscription_tier || "free",
            created_at: data?.created_at,
            avatar_url: data?.avatar_url || meta.avatar_url || "",
            cover_url: data?.cover_url || "",
            specialty: data?.specialty || "",
            years_experience:
              typeof data?.years_experience === "number" ? data.years_experience : null,
            skills: Array.isArray(data?.skills) ? data.skills : [],
            skills_text: formatSkills(Array.isArray(data?.skills) ? data.skills : []),
            education_text: formatPipeLines(education, ["school", "degree", "year"]),
            work_text: formatPipeLines(work, ["title", "company", "period", "description"]),
            projects_text: formatPipeLines(projects, ["name", "description", "url"]),
          };
          setExtProfile(merged);
        });
    }
  }, [user?.id]);

  const loadMyPosts = async () => {
    if (!user?.id) return;
    setPostsLoading(true);
    const { data } = await supabase
      .from("social_posts")
      .select("*")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setMyPosts(await enrichSocialPosts((data as SocialPost[]) || []));
    setPostsLoading(false);
  };

  useEffect(() => {
    if (user?.id && (activeTab === "posts" || activeTab === "profile" || activeTab === "overview")) {
      loadMyPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, activeTab]);

  const publishDashPost = async () => {
    if (!user) return;
    const text = dashPostBody.trim();
    if (text.length < 3) {
      toast.error(t("dash.copy.write_a_bit_more_before_publishing"));
      return;
    }
    setDashPublishing(true);
    const { error } = await supabase.from("social_posts").insert({
      author_id: user.id,
      body: text,
      is_published: true,
    });
    setDashPublishing(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDashPostBody("");
    toast.success(t("dash.copy.post_published"));
    loadMyPosts();
  };

  const deleteMyPost = async (id: string) => {
    const { error } = await supabase.from("social_posts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMyPosts((prev) => prev.filter((p) => p.id !== id));
    toast.success(t("dash.copy.post_removed"));
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const startEdit = () => {
    const meta = user?.user_metadata || {};
    setEditData({
      full_name: extProfile.full_name || meta.full_name || profile?.full_name || "",
      role: extProfile.role || meta.role || "",
      company: extProfile.company || meta.company || "",
      location: extProfile.location || meta.location || "",
      bio: extProfile.bio || meta.bio || "",
      linkedin_url: extProfile.linkedin_url || meta.linkedin_url || "",
      website_url: extProfile.website_url || meta.website_url || "",
      phone: extProfile.phone || meta.phone || "",
      avatar_url: extProfile.avatar_url || meta.avatar_url || "",
      cover_url: extProfile.cover_url || "",
      specialty: extProfile.specialty || "",
      years_experience: extProfile.years_experience ?? null,
      skills: extProfile.skills || [],
      skills_text: extProfile.skills_text || formatSkills(extProfile.skills),
      education_text: extProfile.education_text || "",
      work_text: extProfile.work_text || "",
      projects_text: extProfile.projects_text || "",
    });
    setEditing(true);
    setSaveSuccess(false);
    setSaveError(null);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    const built = buildProfileSavePayload(editData);
    if ("error" in built) return;
    const payload = built;
    setSaveLoading(true);
    setSaveError(null);
    try {

      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          full_name: payload.full_name,
          role: payload.role,
          company: payload.company,
          location: payload.location,
          bio: payload.bio,
          linkedin_url: payload.linkedin_url,
          website_url: payload.website_url,
          phone: payload.phone,
          avatar_url: payload.avatar_url,
        },
      });
      if (metaError) throw metaError;

      // Single profile update — errors must surface so members sync is reliable
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          ...payload,
          email: user!.email || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user!.id);
      if (profileError) throw profileError;

      const profileResult = await updateProfile({
        full_name: payload.full_name,
        avatar_url: payload.avatar_url,
      });
      if (profileResult.error) throw new Error(profileResult.error);

      setExtProfile((prev) => ({
        ...prev,
        ...profileViewFromPayload(payload),
      }));
      setSaveSuccess(true);
      setEditing(false);
      toast.success(t("dash.copy.profile_saved"));
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setSaveError(message);
      toast.error(message);
    } finally {
      setSaveLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{t("dash.copy.please_sign_in")}</p>
            <Link to="/auth"><Button className="bg-primary text-primary-foreground">{t("dash.copy.sign_in")}</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentTier = (extProfile.subscription_tier || profile?.subscription_tier || "free") as keyof typeof TIER_CONFIG;
  const tierCfg = TIER_CONFIG[currentTier] || TIER_CONFIG.free;
  const memberSince = (extProfile.created_at || profile?.created_at)
    ? new Date(extProfile.created_at || profile!.created_at!).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { month: "long", year: "numeric" })
    : t("dash.copy.june_2026");
  const displayName = extProfile.full_name || profile?.full_name || user.email?.split("@")[0] || "User";
  const isCompany = extProfile.account_type === "company";
  const isPro = currentTier === "professional";
  const isEnt = currentTier === "enterprise";
  // Override isPremium/isEnterprise from auth context with local extProfile (more up-to-date)
  const localIsPremium = isPro || isEnt || isPremium;
  const localIsEnterprise = isEnt || isEnterprise;

  const TABS = [
    { key: "overview", label: t("dash.copy.overview"), icon: BarChart2 },
    ...(localIsPremium ? [{ key: "premium" as const, label: isEnt ? t("dash.copy.company_hub") : t("dash.copy.resource_library"), icon: isEnt ? Building2 : Sparkles }] : []),
    { key: "profile", label: t("dash.copy.my_profile"), icon: User },
    { key: "posts", label: t("dash.copy.my_posts"), icon: MessageSquareText },
    { key: "subscription", label: t("dash.copy.my_membership"), icon: CreditCard },
    { key: "security", label: t("dash.copy.security"), icon: Lock },
  ] as const;

  const QUICK_ACTIONS = [
    { icon: Briefcase, label: t("dash.copy.job_opportunities"), desc: t("dash.copy.search_or_post_roles"), color: "bg-primary/10 dark:bg-primary/20", iconColor: "text-primary", href: "/jobs" },
    { icon: MessageSquareText, label: t("dash.copy.community_feed"), desc: t("dash.copy.publish_follow_updates"), color: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-600", href: "/community" },
    { icon: Users, label: t("dash.copy.members_directory"), desc: t("dash.copy.connect_with_professionals"), color: "bg-purple-100 dark:bg-purple-900/30", iconColor: "text-purple-600", href: "/members" },
    { icon: TrendingUp, label: t("dash.copy.industry_news"), desc: t("dash.copy.latest_flavor_science_updates"), color: "bg-emerald-100 dark:bg-emerald-900/30", iconColor: "text-emerald-600", href: "/#news" },
    { icon: Star, label: t("dash.copy.my_membership"), desc: t("dash.copy.fully_free_platform_access"), color: "bg-rose-100 dark:bg-rose-900/30", iconColor: "text-rose-600", href: undefined, onClick: () => selectTab("subscription") },
    { icon: ExternalLink, label: t("dash.copy.linkedin_group"), desc: t("dash.copy.flavor_professionals_community"), color: "bg-sky-100 dark:bg-sky-900/30", iconColor: "text-sky-600", href: SITE.linkedInGroup },
  ];

  const ACHIEVEMENTS = [
    { icon: CheckCircle, label: t("dash.copy.email_verified"), earned: !!user.email_confirmed_at, color: "text-emerald-500" },
    { icon: User, label: t("dash.copy.profile_complete"), earned: !!(extProfile.role && extProfile.company && extProfile.bio && extProfile.specialty), color: "text-blue-500" },
    { icon: Crown, label: t("dash.copy.full_access"), earned: !!user, color: "text-primary" },
    { icon: Star, label: t("dash.copy.company_account"), earned: isEnt || localIsEnterprise || profile?.account_type === "company", color: "text-purple-500" },
    { icon: Award, label: t("dash.copy.early_adopter"), earned: new Date(user.created_at ?? Date.now()) < new Date("2026-08-01"), color: "text-primary" },
  ];

  const PREMIUM_FEATURES = [
    { icon: FileText, label: t("dash.copy.research_papers"), desc: t("dash.copy.member_research_resources"), color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
    { icon: Video, label: t("dash.copy.exclusive_webinars"), desc: t("dash.copy.live_webinars_with_industry_experts"), color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30" },
    { icon: LineChart, label: t("dash.copy.industry_reports"), desc: t("dash.copy.market_analytics_trends"), color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" },
    { icon: FlaskConical, label: t("dash.copy.formulation_guides"), desc: t("dash.copy.advanced_technical_protocols"), color: "text-rose-600 bg-rose-100 dark:bg-rose-900/30" },
    { icon: Target, label: t("dash.copy.expert_consultations"), desc: t("dash.copy.direct_access_to_senior_experts"), color: "text-primary bg-primary/10 dark:bg-primary/20" },
    { icon: Download, label: t("dash.copy.downloadable_templates"), desc: t("dash.copy.ready_to_use_professional_templates"), color: "text-sky-600 bg-sky-100 dark:bg-sky-900/30" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div>
              <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-3 transition-colors">
                <ArrowLeft className="w-3 h-3 rtl:rotate-180" /> {t("dash.back")}
              </Link>
              <h1 className="text-2xl font-bold text-foreground">{t("dash.title")}</h1>
              <p className="text-sm text-muted-foreground">{t("dash.welcome")} <span className="font-semibold text-foreground">{displayName}</span></p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link to="/admin">
                  <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow">
                    <ShieldCheck className="w-3.5 h-3.5" /> {t("dash.admin")}
                  </Button>
                </Link>
              )}
              <Button variant="outline" size="sm" className="gap-2 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={handleSignOut}>
                <LogOut className="w-3.5 h-3.5" /> {t("dash.signout")}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* ─── Left Sidebar ─────────────────── */}
            <div className="lg:col-span-1 space-y-4">
              {/* Profile Card */}
              <Card className={`overflow-hidden border border-border ${tierCfg.bgGlow ? `shadow-lg ${tierCfg.bgGlow}` : ""}`}>
                <div className={`h-20 bg-gradient-to-r ${tierCfg.gradient} relative overflow-hidden`}>
                  {localIsPremium && (
                    <div className="absolute inset-0 opacity-20">
                      {[...Array(8)].map((_, i) => (
                        <Sparkles key={i} className="absolute text-white w-3 h-3" style={{ top: `${Math.random()*100}%`, left: `${Math.random()*100}%`, opacity: Math.random() }} />
                      ))}
                    </div>
                  )}
                  {isPro && <Crown className="absolute end-3 top-3 w-5 h-5 text-white/60" />}
                  {isEnt && <Star className="absolute end-3 top-3 w-5 h-5 text-white/60" />}
                </div>
                <CardContent className="p-4 -mt-9">
                  <div className="w-16 h-16 rounded-2xl bg-background border-4 border-background shadow-lg flex items-center justify-center mb-3 overflow-hidden">
                    {extProfile.avatar_url ? (
                      <img src={extProfile.avatar_url} alt={displayName} className="w-full h-full object-cover rounded-xl" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className={`w-full h-full rounded-xl bg-gradient-to-br ${tierCfg.gradient} flex items-center justify-center`}>
                        <span className="text-xl font-bold text-white">{displayName[0].toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <h2 className="font-bold text-foreground text-sm leading-tight mb-0.5">{displayName}</h2>
                  {extProfile.role && <p className="text-xs text-primary font-medium">{extProfile.role}</p>}
                  {extProfile.company && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3" />{extProfile.company}
                    </p>
                  )}
                  {extProfile.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{extProfile.location}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge className={`text-xs ${tierCfg.color}`}>
                      {tierCfg.icon && <tierCfg.icon className="w-3 h-3 me-1" />}
                      {t(`dash.copy.tier_${currentTier}`)}
                    </Badge>
                    {isCompany && (
                      <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Building2 className="w-3 h-3 me-1" />{t("dash.copy.company")}
                      </Badge>
                    )}
                  </div>
                  {saveSuccess && (
                    <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> {t("dash.copy.profile_updated")}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Navigation Tabs */}
              <Card className="border border-border">
                <CardContent className="p-2">
                  {TABS.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => selectTab(key as typeof activeTab)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-start ${
                        activeTab === key
                          ? key === "premium"
                            ? isEnt ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" : "bg-primary/10 text-primary"
                            : "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                      {key === "premium" && localIsPremium && (
                        <span className="ms-auto text-xs px-1.5 py-0.5 rounded-full font-semibold bg-primary/20 text-primary">
                          {isEnt ? "✦" : "★"}
                        </span>
                      )}
                      {activeTab === key && key !== "premium" && <ChevronRight className="w-3 h-3 ms-auto rtl:rotate-180" />}
                    </button>
                  ))}
                  <Separator className="my-2" />
                  {[
                    { href: "/notifications", label: t("dash.nav.notifications") },
                    { href: "/dashboard/connections", label: t("dash.nav.connections") },
                    { href: "/messages", label: t("dash.nav.messages") },
                    { href: "/dashboard/saved-jobs", label: t("dash.nav.saved_jobs") },
                    { href: "/dashboard/applications", label: t("dash.nav.applications") },
                    { href: "/dashboard/rfqs", label: t("dash.nav.rfqs") },
                    { href: "/dashboard/quotes", label: t("dash.nav.quotes") },
                    { href: "/supplier/catalog", label: t("dash.nav.catalog") },
                    { href: "/supplier/quotes", label: t("dash.nav.supplier_quotes") },
                    { href: "/consultations", label: t("dash.nav.consultations") },
                    { href: "/events", label: t("dash.nav.events") },
                    { href: "/dashboard/publications", label: t("dash.nav.library") },
                    { href: "/verification", label: t("dash.nav.verification") },
                    { href: "/dashboard/blocked", label: t("dash.nav.blocked") },
                    { href: "/dashboard/privacy", label: t("dash.nav.privacy") },
                    ...(isCompany ? [{ href: "/company/dashboard", label: t("dash.nav.company") }] : []),
                  ].map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${
                        pathname === item.href || pathname.startsWith(`${item.href}/`)
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Separator className="my-2" />
                  {isAdmin && (
                    <Link to="/admin" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-secondary dark:hover:bg-primary/20">
                      <ShieldCheck className="w-4 h-4" /> {t("dash.admin")}
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="w-4 h-4" /> {t("dash.signout")}
                  </button>
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card className="border border-border">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" /> {t("dash.copy.achievements")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-2">
                  {ACHIEVEMENTS.map(({ icon: Icon, label, earned, color }) => (
                    <div key={label} className={`flex items-center gap-2 text-xs ${earned ? "text-foreground" : "text-muted-foreground/50"}`}>
                      <Icon className={`w-3.5 h-3.5 ${earned ? color : "text-muted-foreground/30"}`} />
                      <span>{label}</span>
                      {earned && <CheckCircle className="w-3 h-3 text-emerald-500 ms-auto" />}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Profile completion */}
              {(() => {
                const pct = profileCompletionPercent(extProfile);
                const incomplete = pct < 100;
                return (
                  <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Rocket className="w-4 h-4 text-primary" />
                        <p className="text-sm font-semibold text-primary">{t("dash.copy.profile_strength")}</p>
                        <span className="ms-auto text-xs font-semibold text-primary">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5 mb-2" />
                      <p className="text-xs text-muted-foreground mb-3">
                        {incomplete
                          ? (t("dash.copy.add_cover_specialty_and_skills_to_boost_visibili"))
                          : (t("dash.copy.your_profile_looks_complete_great_work"))}
                      </p>
                      {incomplete && (
                        <Button size="sm" className="w-full" onClick={() => selectTab("profile")}>
                          {t("dash.copy.complete_profile_now")}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}
            </div>

            {/* ─── Main Content ──────────────────── */}
            <div className="lg:col-span-3 space-y-5">
              {/* ══ TAB: Overview ══ */}
              {activeTab === "overview" && (
                <>
                  {pendingConnections.length > 0 && (
                    <Card className="border-primary/25">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          {t("dash.copy.incoming_connection_requests")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 space-y-2">
                        {pendingConnections.map((req) => (
                          <div key={req.id} className="flex flex-wrap items-center gap-2 justify-between rounded-lg border border-border p-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {connectionNames[req.requester_id] || (t("dash.copy.member"))}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(req.created_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="h-8"
                                disabled={connectionBusy === req.id}
                                onClick={async () => {
                                  setConnectionBusy(req.id);
                                  const { error } = await respondToConnection(req.id, "accepted");
                                  setConnectionBusy(null);
                                  if (error) toast.error(error);
                                  else {
                                    toast.success(t("dash.copy.accepted"));
                                    setPendingConnections((prev) => prev.filter((p) => p.id !== req.id));
                                    setAcceptedConnections((prev) => [{ ...req, status: "accepted" }, ...prev]);
                                  }
                                }}
                              >
                                {t("dash.copy.accept")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                disabled={connectionBusy === req.id}
                                onClick={async () => {
                                  setConnectionBusy(req.id);
                                  const { error } = await respondToConnection(req.id, "declined");
                                  setConnectionBusy(null);
                                  if (error) toast.error(error);
                                  else {
                                    toast.message(t("dash.copy.declined"));
                                    setPendingConnections((prev) => prev.filter((p) => p.id !== req.id));
                                  }
                                }}
                              >
                                {t("dash.copy.decline")}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="border-border">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          {t("dash.copy.my_network")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 space-y-2">
                        {acceptedConnections.length === 0 ? (
                          <div className="text-sm text-muted-foreground space-y-3">
                            <p>{t("dash.copy.no_connections_yet")}</p>
                            <Button asChild size="sm" variant="outline">
                              <Link to="/members">{t("dash.copy.browse_members")}</Link>
                            </Button>
                          </div>
                        ) : (
                          acceptedConnections.slice(0, 5).map((c) => {
                            const peer = peerUserId(c, user.id);
                            const memberId = memberIdsByProfile[peer];
                            const name = connectionNames[peer] || (t("dash.copy.member"));
                            return (
                              <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
                                {memberId ? (
                                  <Link to={`/members/${memberId}`} className="truncate font-medium hover:text-primary">
                                    {name}
                                  </Link>
                                ) : (
                                  <span className="truncate font-medium">{name}</span>
                                )}
                                <Badge variant="secondary" className="text-[10px]">
                                  {t("dash.copy.connected")}
                                </Badge>
                              </div>
                            );
                          })
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-border">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <BookMarked className="w-4 h-4 text-primary" />
                          {t("dash.copy.industry_insights")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-2 space-y-3">
                        <div className="text-sm text-muted-foreground space-y-3">
                          <p>{t("dash.copy.browse_technical_articles_and_professional_posts")}</p>
                          <Button asChild size="sm" variant="outline">
                            <Link to="/insights">{t("dash.copy.explore_industry_insights")}</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: Crown, label: t("dash.copy.membership"), value: t("dash.copy.free"), color: "text-primary bg-primary/10" },
                      { icon: Calendar, label: t("dash.copy.member_since"), value: memberSince, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
                      { icon: CheckCircle, label: t("dash.copy.status"), value: t("dash.copy.active"), color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" },
                    ].map(({ icon: Icon, label, value, color }) => (
                      <Card key={label} className="border border-border">
                        <CardContent className="p-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-bold text-foreground text-sm">{value}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Membership welcome (fully free) */}
                  {localIsPremium && !isEnt && (
                    <Card className="border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent overflow-hidden relative">
                      <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full -translate-y-8 translate-x-8" />
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0">
                          <Crown className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-primary text-base">{t("dash.copy.welcome_your_membership_is_fully_free")}</p>
                          <p className="text-sm text-muted-foreground">{t("dash.copy.full_access_to_resources_jobs_community_and_foru")}</p>
                        </div>
                        <Button size="sm" className="ms-auto whitespace-nowrap" onClick={() => selectTab("premium")}>
                          {t("dash.copy.explore")} <ChevronRight className="w-3.5 h-3.5 ms-1 rtl:rotate-180" />
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {isEnt && (
                    <Card className="border border-primary/30 bg-gradient-to-r from-secondary via-accent/30 to-transparent dark:from-primary/20 dark:via-primary/10 overflow-hidden relative">
                      <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-primary/30 to-transparent rounded-full -translate-y-8 translate-x-8" />
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[hsl(208_100%_16%)] via-[hsl(208_70%_28%)] to-[hsl(47_30%_70%)] flex items-center justify-center flex-shrink-0">
                          <Star className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-primary text-base">{t("dash.copy.company_account_active_fully_free")}</p>
                          <p className="text-sm text-muted-foreground">{t("dash.copy.post_jobs_manage_your_company_profile_and_reach_")}</p>
                        </div>
                        <Button size="sm" className="ms-auto bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap" onClick={() => selectTab("premium")}>
                          {t("dash.copy.my_hub")} <ChevronRight className="w-3.5 h-3.5 ms-1 rtl:rotate-180" />
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Quick Actions Grid */}
                  <Card className="border border-border">
                    <CardHeader className="p-4 pb-3">
                      <CardTitle className="text-sm font-semibold">{t("dash.copy.quick_access")}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {QUICK_ACTIONS.map(({ icon: Icon, label, desc, color, iconColor, href, onClick }) => {
                          const isExternal = href?.startsWith("http");
                          const Inner = (
                            <div className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/50 transition-all group cursor-pointer">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                                <Icon className={`w-4 h-4 ${iconColor}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground text-sm leading-tight">{label}</p>
                                <p className="text-xs text-muted-foreground">{desc}</p>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          );
                          if (onClick) return <button key={label} className="text-start" onClick={onClick}>{Inner}</button>;
                          if (isExternal) return <a key={label} href={href} target="_blank" rel="noopener noreferrer">{Inner}</a>;
                          return <Link key={label} to={href!}>{Inner}</Link>;
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Account Info Summary */}
                  <Card className="border border-border">
                    <CardHeader className="p-4 pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        {t("dash.copy.account_summary")}
                        <button onClick={() => selectTab("profile")} className="text-xs text-primary hover:underline font-normal">
                          {t("dash.copy.edit_profile")}
                        </button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-2 text-sm">
                        {[
                          { icon: Mail, label: t("dash.copy.email"), value: user.email },
                          { icon: User, label: t("dash.copy.full_name"), value: displayName },
                          { icon: Briefcase, label: t("dash.copy.role"), value: extProfile.role || "—" },
                          { icon: Building2, label: t("dash.copy.company_2"), value: extProfile.company || "—" },
                          { icon: MapPin, label: t("dash.copy.location"), value: extProfile.location || "—" },
                        ].map(({ icon: Icon, label, value }) => (
                          <div key={label} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-muted-foreground w-24 flex-shrink-0 text-xs">{label}</span>
                            <span className="text-foreground text-xs font-medium truncate">{value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ══ TAB: Premium / Enterprise ══ */}
              {activeTab === "premium" && localIsPremium && (
                <>
                  {/* Premium Header */}
                  {isPro && (
                    <div className={`rounded-2xl bg-gradient-to-r ${tierCfg.gradient} p-6 text-white relative overflow-hidden`}>
                      <div className="absolute right-0 top-0 opacity-10">
                        <Crown className="w-48 h-48 -translate-y-12 translate-x-12" />
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <Crown className="w-7 h-7" />
                        <h2 className="text-xl font-bold">{t("dash.copy.professional_membership")}</h2>
                      </div>
                      <p className="text-white/80 text-sm max-w-lg">{t("dash.copy.you_have_full_access_to_all_research_papers_excl")}</p>
                      <div className="flex gap-3 mt-4 flex-wrap">
                        <div className="bg-white/20 rounded-lg px-3 py-1.5 text-sm font-medium">{t("dash.copy.member_research_resources_2")}</div>
                        <div className="bg-white/20 rounded-lg px-3 py-1.5 text-sm font-medium">
                          {premiumResources.length} {t("dash.copy.library_resources")}
                        </div>
                        <div className="bg-white/20 rounded-lg px-3 py-1.5 text-sm font-medium">
                          {upcomingWebinars.length} {t("dash.copy.scheduled_webinars")}
                        </div>
                      </div>
                    </div>
                  )}
                  {isEnt && (
                    <div className="rounded-2xl bg-gradient-to-r from-[hsl(208_100%_16%)] via-[hsl(208_70%_28%)] to-[hsl(47_30%_70%)] p-6 text-white relative overflow-hidden">
                      <div className="absolute right-0 top-0 opacity-10">
                        <Star className="w-48 h-48 -translate-y-12 translate-x-12" />
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className="w-7 h-7" />
                        <h2 className="text-xl font-bold">{t("dash.copy.enterprise_control_panel")}</h2>
                      </div>
                      <p className="text-white/80 text-sm max-w-lg">{t("dash.copy.manage_your_company_presence_ads_articles_and_pe")}</p>
                      {/* Enterprise Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                        {enterpriseStats.map(({ label, labelAr, value, icon: Icon }) => (
                          <div key={label} className="bg-white/20 rounded-xl p-3">
                            <Icon className="w-4 h-4 mb-1 opacity-80" />
                            <p className="text-lg font-bold">{value}</p>
                            <p className="text-xs opacity-80">{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Premium Resources */}
                  {isPro && (
                    <Card className="border border-border">
                      <CardHeader className="p-4 pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <BookMarked className="w-4 h-4 text-primary" />
                          {t("dash.copy.your_research_library")}
                          <Badge className="ms-auto text-xs bg-primary/10 text-primary">{t("dash.copy.full_access")}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        {premiumResources.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground text-sm">
                            {t("dash.copy.no_premium_resources_yet")}
                          </div>
                        ) : premiumResources.map((res) => (
                          <div key={res.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer group">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {res.type === "report" ? <PieChart className="w-4 h-4 text-primary" /> :
                               <FileText className="w-4 h-4 text-primary" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-sm truncate">{res.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-xs px-1.5 py-0">{res.category}</Badge>
                                <span className="text-xs text-muted-foreground capitalize">{res.type === "course" ? (t("dash.copy.resource")) : res.type}</span>
                                {res.description && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{res.description}</span>}
                              </div>
                            </div>
                            {res.link ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs gap-1"
                                onClick={() => void openResourceLink(res.id, res.link, true)}
                              >
                                <Download className="w-3 h-3" /> {t("dash.copy.open")}
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => void openResourceLink(res.id, null, true)}>
                                <Download className="w-3 h-3" /> {t("dash.copy.open")}
                              </Button>
                            )}
                          </div>
                        ))}
                        <Link to="/#resources">
                          <Button variant="outline" size="sm" className="w-full gap-2 mt-1">
                            {t("dash.copy.view_all_resources")} <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )}

                  {/* Upcoming Webinars */}
                  {isPro && (
                    <Card className="border border-border">
                      <CardHeader className="p-4 pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Video className="w-4 h-4 text-purple-500" />
                          {t("dash.copy.upcoming_webinars")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        {upcomingWebinars.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground text-sm">
                            {t("dash.copy.no_upcoming_webinars_scheduled_yet")}
                          </div>
                        ) : upcomingWebinars.map((wb) => (
                          <div key={wb.id} className="flex items-start gap-3 p-3 rounded-xl border border-purple-100 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-900/10">
                            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                              <Video className="w-4 h-4 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-foreground text-sm">{wb.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{wb.date}</p>
                              {wb.description && <p className="text-xs text-purple-600 mt-0.5">{wb.description}</p>}
                            </div>
                            {wb.link && safeHttpUrl(wb.link) ? (
                              <a href={safeHttpUrl(wb.link)!} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
                                  {t("dash.copy.join")}
                                </Button>
                              </a>
                            ) : (
                              <Button size="sm" variant="outline" className="text-xs" disabled>
                                {t("dash.copy.soon")}
                              </Button>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Enterprise: Company Tools */}
                  {isEnt && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { icon: Newspaper, title: t("dash.copy.manage_ads"), desc: t("dash.copy.3_active_ads_monthly"), color: "border-blue-200 bg-blue-50/50 dark:bg-blue-900/10", iconColor: "text-blue-600 bg-blue-100 dark:bg-blue-900/30", cta: t("dash.copy.add_ad"), href: "/contact?type=enterprise" },
                        { icon: FileText, title: t("dash.copy.publish_articles"), desc: t("dash.copy.unlimited_articles_on_platform"), color: "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10", iconColor: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30", cta: t("dash.copy.write_article"), href: "/contact?type=enterprise&subject=article" },
                        { icon: Layers, title: t("dash.copy.brand_placement"), desc: t("dash.copy.logo_in_partners_section"), color: "border-purple-200 bg-purple-50/50 dark:bg-purple-900/10", iconColor: "text-purple-600 bg-purple-100 dark:bg-purple-900/30", cta: t("dash.copy.upload_logo"), href: "/contact?type=enterprise&subject=brand" },
                        { icon: BarChart, title: t("dash.copy.performance_reports"), desc: t("dash.copy.monthly_detailed_analytics"), color: "border-primary/30 bg-secondary/50 dark:bg-primary/10", iconColor: "text-primary bg-primary/10 dark:bg-primary/20", cta: t("dash.copy.view_report"), href: "/contact?type=enterprise&subject=report" },
                      ].map(({ icon: Icon, title, desc, color, iconColor, cta, href }) => (
                        <Card key={title} className={`border ${color}`}>
                          <CardContent className="p-4 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground text-sm">{title}</p>
                              <p className="text-xs text-muted-foreground">{desc}</p>
                            </div>
                            <Button size="sm" variant="outline" className="text-xs whitespace-nowrap" asChild>
                              <Link to={href}>{cta}</Link>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Premium Features Grid */}
                  <Card className="border border-border">
                    <CardHeader className="p-4 pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        {t("dash.copy.all_your_benefits")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {PREMIUM_FEATURES.map(({ icon: Icon, label, desc, color }) => (
                          <div key={label} className="flex items-start gap-3 p-3 rounded-xl border border-border">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">{label}</p>
                              <p className="text-xs text-muted-foreground">{desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* ══ TAB: Membership (fully free) ══ */}
              {activeTab === "subscription" && (
                <div className="space-y-5">
                  <Card className="border-2 border-primary/40 overflow-hidden">
                    <div className="h-3 bg-gradient-to-r from-primary via-primary/70 to-primary/40" />
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                            <Zap className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-foreground text-lg">
                              {t("dash.copy.fully_free_membership")}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {t("dash.copy.full_access_for_individuals_and_companies_no_sub")}
                            </p>
                          </div>
                        </div>
                        <Badge className="text-sm px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {t("dash.copy.free_2")}
                        </Badge>
                      </div>
                      <Separator className="mb-4" />
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                        {[
                          { label: t("dash.copy.price"), value: "$0" },
                          { label: t("dash.copy.billing"), value: t("dash.copy.none") },
                          { label: t("dash.copy.since"), value: memberSince },
                        ].map(({ label, value }) => (
                          <div key={label} className="p-3 rounded-xl bg-muted/50">
                            <p className="text-xs text-muted-foreground mb-1">{label}</p>
                            <p className="font-bold text-foreground">{value}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border">
                    <CardHeader className="p-4 pb-3">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Gift className="w-4 h-4 text-primary" />
                        {t("dash.copy.what_s_included")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          t("dash.copy.news_articles_and_industry_insights"),
                          t("dash.copy.job_listings_and_applications"),
                          t("dash.copy.community_forum_and_members_directory"),
                          t("dash.copy.consultations_market_and_industry_insights"),
                          t("dash.copy.company_accounts_fully_free"),
                          t("dash.copy.no_subscriptions_or_payments"),
                        ].map((feat) => (
                          <div key={feat} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-3 flex-wrap">
                    <Link to="/enterprise" className="flex-1">
                      <Button variant="outline" className="w-full gap-2">
                        <Building2 className="w-4 h-4" /> {t("dash.copy.enterprise_services")}
                      </Button>
                    </Link>
                    {SITE.supportEmail ? (
                      <Button variant="outline" className="gap-2 flex-1 min-w-fit" asChild>
                        <a href={`mailto:${SITE.supportEmail}?subject=${encodeURIComponent("Membership support — Flavor Experts Network")}`}>
                          <RefreshCw className="w-4 h-4" /> {t("dash.copy.support")}
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" className="gap-2 flex-1 min-w-fit" asChild>
                        <Link to="/#contact">
                          <RefreshCw className="w-4 h-4" /> {t("dash.copy.support")}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* ══ TAB: Posts ══ */}
              {activeTab === "posts" && (
                <div className="space-y-4">
                  <Card className="border border-primary/20 overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
                    <CardHeader className="p-5 pb-2">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <MessageSquareText className="w-4 h-4 text-primary" />
                        {t("dash.copy.publish_a_professional_update")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-2 space-y-3">
                      <Textarea
                        rows={4}
                        value={dashPostBody}
                        onChange={(e) => setDashPostBody(e.target.value)}
                        placeholder={t("dash.copy.share_an_insight_milestone_or_professional_updat")}
                        className="resize-none"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <Link to="/community" className="text-xs text-primary hover:underline">
                          {t("dash.copy.open_community_feed")}
                        </Link>
                        <Button onClick={publishDashPost} disabled={dashPublishing} className="gap-2">
                          {dashPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {t("dash.copy.publish")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border">
                    <CardHeader className="p-5 pb-2">
                      <CardTitle className="text-sm font-semibold">
                        {t("dash.copy.your_recent_posts")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-2 space-y-3">
                      {postsLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : myPosts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          {t("dash.copy.you_have_not_published_any_posts_yet")}
                        </p>
                      ) : (
                        myPosts.map((post) => (
                          <div key={post.id} className="rounded-xl border border-border p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed flex-1">{post.body}</p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                onClick={() => deleteMyPost(post.id)}
                                aria-label={t("dash.copy.delete_post")}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Heart className="w-3.5 h-3.5" /> {post.likes_count || 0}
                              </span>
                              <span>{new Date(post.created_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ══ TAB: Profile ══ */}
              {activeTab === "profile" && (
                <div className="space-y-4">
                <Card className="border border-primary/15">
                  <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <p className="font-semibold text-foreground">
                        {t("dash.copy.your_public_professional_profile")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("dash.copy.complete_your_details_and_publish_regular_update")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={async () => {
                        if (!user?.id) return;
                        const { data } = await supabase
                          .from("member_directory")
                          .select("id")
                          .eq("profile_id", user.id)
                          .maybeSingle();
                        if (data?.id) window.open(`/members/${data.id}`, "_blank");
                        else window.open("/members", "_blank");
                      }}>
                        {t("dash.copy.view_public_profile")}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => selectTab("posts")}>
                        {t("dash.copy.write_a_post")}
                      </Button>
                      <Button asChild size="sm">
                        <Link to="/community">{t("dash.copy.community")}</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-border">
                  <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" /> {t("dash.copy.my_profile")}
                    </CardTitle>
                    {!editing ? (
                      <Button size="sm" variant="outline" onClick={startEdit} className="gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" /> {t("dash.copy.edit")}
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSave} disabled={saveLoading} className="gap-1.5">
                          {saveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          {t("dash.copy.save")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saveLoading} className="gap-1.5">
                          <X className="w-3.5 h-3.5" /> {t("dash.copy.cancel")}
                        </Button>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-5 pt-2">
                    {saveError && (
                      <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{saveError}</div>
                    )}
                    {saveSuccess && (
                      <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-600 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> {t("dash.copy.profile_saved_successfully")}
                      </div>
                    )}
                    {editing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2 space-y-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            {t("dash.copy.cover_photo")}
                          </Label>
                          <FileUploader
                            accept="image"
                            bucket="platform-uploads"
                            folder="avatars/covers"
                            currentUrl={editData.cover_url || ""}
                            maxSizeMB={8}
                            showUrlFallback={false}
                            label={t("dash.copy.upload_cover_image")}
                            onUpload={(url) => {
                              setEditData((p) => ({ ...p, cover_url: url }));
                              setExtProfile((p) => ({ ...p, cover_url: url }));
                            }}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            {t("dash.copy.prefer_a_wide_landscape_image_e_g_1600_400")}
                          </p>
                        </div>
                        <div className="sm:col-span-2 flex justify-center py-2">
                          <AvatarUploader
                            currentUrl={editData.avatar_url || ""}
                            name={editData.full_name || displayName}
                            bucket="platform-uploads"
                            folder="avatars/users"
                            onUpload={url => {
                              setEditData(p => ({ ...p, avatar_url: url }));
                              setExtProfile(p => ({ ...p, avatar_url: url }));
                            }}
                            size="xl"
                            label={t("dash.copy.change_profile_photo")}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">{t("dash.copy.full_name_2")}</Label>
                          <Input value={editData.full_name || ""} onChange={(e) => setEditData((p) => ({ ...p, full_name: e.target.value }))} placeholder={t("dash.copy.ahmed_al_rashidi")} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">{t("dash.copy.job_title_role")}</Label>
                          <Input value={editData.role || ""} onChange={(e) => setEditData((p) => ({ ...p, role: e.target.value }))} placeholder={t("dash.copy.flavor_scientist")} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">{t("dash.copy.company_organization")}</Label>
                          <Input value={editData.company || ""} onChange={(e) => setEditData((p) => ({ ...p, company: e.target.value }))} placeholder={t("dash.copy.arabian_flavor_labs")} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">{t("dash.copy.location")}</Label>
                          <Input value={editData.location || ""} onChange={(e) => setEditData((p) => ({ ...p, location: e.target.value }))} placeholder={t("dash.copy.riyadh_saudi_arabia")} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">{t("dash.copy.years_of_experience")}</Label>
                          <Input
                            type="number"
                            min={0}
                            max={80}
                            value={editData.years_experience ?? ""}
                            onChange={(e) =>
                              setEditData((p) => ({
                                ...p,
                                years_experience: e.target.value === "" ? null : Number(e.target.value),
                              }))
                            }
                            placeholder="10"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">{t("dash.copy.phone")}</Label>
                          <Input value={editData.phone || ""} onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))} placeholder="+966 5X XXX XXXX" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">{t("dash.copy.linkedin_url")}</Label>
                          <Input value={editData.linkedin_url || ""} onChange={(e) => setEditData((p) => ({ ...p, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/yourname" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">{t("dash.copy.website")}</Label>
                          <Input value={editData.website_url || ""} onChange={(e) => setEditData((p) => ({ ...p, website_url: e.target.value }))} placeholder="https://yourwebsite.com" />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">{t("dash.copy.bio_about")}</Label>
                          <Textarea value={editData.bio || ""} onChange={(e) => setEditData((p) => ({ ...p, bio: e.target.value }))} placeholder={t("dash.copy.share_your_expertise_and_background")} rows={3} className="resize-none" />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">{t("dash.copy.focus_areas_specialties")}</Label>
                          <Input
                            value={editData.specialty || ""}
                            onChange={(e) => setEditData((p) => ({ ...p, specialty: e.target.value }))}
                            placeholder={t("dash.copy.natural_flavors_sensory_formulation")}
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {t("dash.copy.separate_specialties_with_commas")}
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">{t("dash.copy.skills")}</Label>
                          <Input
                            value={editData.skills_text || ""}
                            onChange={(e) => setEditData((p) => ({ ...p, skills_text: e.target.value }))}
                            placeholder={t("dash.copy.gc_ms_qda_encapsulation")}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">{t("dash.copy.work_experience")}</Label>
                          <Textarea
                            value={editData.work_text || ""}
                            onChange={(e) => setEditData((p) => ({ ...p, work_text: e.target.value }))}
                            placeholder={
                              t("dash.copy.title_company_period_description_nflavor_scienti")
                            }
                            rows={4}
                            className="resize-none font-mono text-xs"
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {t("dash.copy.one_line_per_role_separate_fields_with")}
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">{t("dash.copy.education")}</Label>
                          <Textarea
                            value={editData.education_text || ""}
                            onChange={(e) => setEditData((p) => ({ ...p, education_text: e.target.value }))}
                            placeholder={
                              t("dash.copy.school_degree_year_nking_saud_university_bsc_foo")
                            }
                            rows={3}
                            className="resize-none font-mono text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">{t("dash.copy.projects")}</Label>
                          <Textarea
                            value={editData.projects_text || ""}
                            onChange={(e) => setEditData((p) => ({ ...p, projects_text: e.target.value }))}
                            placeholder={
                              t("dash.copy.name_description_url_nflavor_platform_profession")
                            }
                            rows={3}
                            className="resize-none font-mono text-xs"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {extProfile.cover_url ? (
                          <div className="h-28 sm:h-36 rounded-xl overflow-hidden border border-border">
                            <img
                              src={extProfile.cover_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : null}
                        <div className="flex items-start gap-4">
                          {extProfile.avatar_url ? (
                            <img
                              src={extProfile.avatar_url}
                              alt={displayName}
                              className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 border-2 border-primary/20 shadow-md"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tierCfg.gradient} flex items-center justify-center flex-shrink-0`}>
                              <span className="text-xl font-bold text-white">{displayName[0].toUpperCase()}</span>
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-foreground">{displayName}</h3>
                            {extProfile.role && <p className="text-sm text-primary">{extProfile.role}</p>}
                            {extProfile.bio && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{extProfile.bio}</p>}
                          </div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { icon: Mail, label: t("dash.copy.email"), value: user.email },
                            { icon: Building2, label: t("dash.copy.company_2"), value: extProfile.company },
                            { icon: MapPin, label: t("dash.copy.location"), value: extProfile.location },
                            { icon: Briefcase, label: t("dash.copy.experience"), value: extProfile.years_experience ? `${extProfile.years_experience}+` : undefined },
                            { icon: Phone, label: t("dash.copy.phone"), value: extProfile.phone },
                            { icon: Linkedin, label: "LinkedIn", value: extProfile.linkedin_url, isLink: true },
                            { icon: Globe, label: t("dash.copy.website"), value: extProfile.website_url, isLink: true },
                          ].map(({ icon: Icon, label, value, isLink }) => value ? (
                            <div key={label} className="flex items-center gap-2 text-sm">
                              <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-muted-foreground w-20 flex-shrink-0 text-xs">{label}</span>
                              {isLink && safeHttpUrl(value) ? (
                                <a href={safeHttpUrl(value)!} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs truncate flex items-center gap-1">
                                  {value.replace(/^https?:\/\//, "").substring(0, 30)}... <ExternalLink className="w-3 h-3 inline" />
                                </a>
                              ) : (
                                <span className="text-foreground text-xs font-medium">{value}</span>
                              )}
                            </div>
                          ) : null)}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {myPosts.length > 0 && (
                  <Card className="border border-border">
                    <CardHeader className="p-5 pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        {t("dash.copy.latest_posts")}
                        <button onClick={() => selectTab("posts")} className="text-xs text-primary hover:underline font-normal">
                          {t("dash.copy.manage_all")}
                        </button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-2 space-y-3">
                      {myPosts.slice(0, 3).map((post) => (
                        <div key={post.id} className="text-sm text-muted-foreground border-b border-border last:border-0 pb-3 last:pb-0">
                          <p className="text-foreground line-clamp-2">{post.body}</p>
                          <p className="text-xs mt-1">{new Date(post.created_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                </div>
              )}

              {/* ══ TAB: Security ══ */}
              {activeTab === "security" && (
                <div className="space-y-4">
                  <Card className="border border-border">
                    <CardHeader className="p-5 pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" /> {t("dash.copy.security_settings")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-2 space-y-4">
                      {[
                        {
                          icon: CheckCircle,
                          label: t("dash.copy.email_verification"),
                          desc: user.email_confirmed_at ? (t("dash.copy.your_email_is_verified")) : (t("dash.copy.email_not_verified_yet")),
                          color: user.email_confirmed_at ? "text-emerald-600 bg-emerald-100" : "text-amber-600 bg-amber-100",
                          badge: user.email_confirmed_at ? (t("dash.copy.verified")) : (t("dash.copy.pending")),
                        },
                        {
                          icon: Lock,
                          label: t("dash.copy.password"),
                          desc: t("dash.copy.keep_your_account_secure_with_a_strong_password"),
                          color: "text-blue-600 bg-blue-100",
                          badge: t("dash.copy.protected"),
                        },
                        {
                          icon: Bell,
                          label: t("dash.copy.email_notifications"),
                          desc: t("dash.copy.receive_industry_news_and_platform_updates"),
                          color: "text-purple-600 bg-purple-100",
                          badge: t("dash.copy.active"),
                        },
                      ].map(({ icon: Icon, label, desc, color, badge }) => (
                        <div key={label} className="flex items-center justify-between p-3 rounded-xl border border-border">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground text-sm">{label}</p>
                              <p className="text-xs text-muted-foreground">{desc}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">{badge}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border border-border">
                    <CardHeader className="p-5 pb-3">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" /> {t("dash.copy.account_details")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-2 space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">{t("dash.copy.user_id")}</span>
                        <span className="font-mono text-xs text-foreground bg-muted px-2 py-0.5 rounded">{user.id?.substring(0, 16)}...</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">{t("dash.copy.account_type")}</span>
                        <Badge className="text-xs">{isCompany ? (t("dash.copy.company")) : (t("dash.copy.individual"))}</Badge>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">{t("dash.copy.subscription_tier")}</span>
                        <Badge className={`text-xs ${tierCfg.color}`}>{t(`dash.copy.tier_${currentTier}`)}</Badge>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">{t("dash.copy.member_since")}</span>
                        <span className="font-medium text-foreground text-xs">{memberSince}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-red-200 dark:border-red-900">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-red-600 text-sm">{t("dash.copy.sign_out")}</p>
                        <p className="text-xs text-muted-foreground">{t("dash.copy.you_will_be_logged_out_of_your_account")}</p>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2 text-red-500 border-red-200 hover:bg-red-50" onClick={handleSignOut}>
                        <LogOut className="w-3.5 h-3.5" /> {t("dash.copy.sign_out_2")}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

