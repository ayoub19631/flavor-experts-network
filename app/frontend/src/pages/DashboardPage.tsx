import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  CreditCard, RefreshCw, ArrowUpCircle, PlayCircle, BookMarked,
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
  formatPipeLines,
  formatSkills,
  parsePipeLines,
  parseSkills,
} from "@/lib/profile-details";
import { toast } from "sonner";

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

  // Private workspace page — never index.
  usePageMeta({
    title: lang === "ar" ? "لوحة التحكم" : "Dashboard",
    description:
      lang === "ar"
        ? "أدر ملفك ومنشوراتك ومواردك وعضويتك."
        : "Manage your profile, posts, resources and membership.",
    path: "/dashboard",
    noIndex: true,
  });

  const [activeTab, setActiveTab] = useState<"overview" | "premium" | "profile" | "posts" | "security" | "subscription">("overview");
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
          date: new Date(r.created_at as string).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          description: r.description,
          link: (r.premium ? linkMap.get(r.id) : null) || r.link || "",
        })));
      }

      setEnterpriseStats([
        { label: "Published News", labelAr: "أخبار منشورة", value: String(newsRes.count ?? 0), icon: Newspaper },
        { label: "Total Members", labelAr: "إجمالي الأعضاء", value: String(membersRes.count ?? 0), icon: Users },
        { label: "Member Resources", labelAr: "موارد الأعضاء", value: String(resourcesRes.data?.length ?? 0), icon: BookOpen },
        { label: "Company Access", labelAr: "وصول الشركات", value: "Active", icon: Star },
      ]);
    }
    fetchDashboardData();
  }, []);

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
      toast.error(lang === "ar" ? "اكتب المزيد قبل النشر" : "Write a bit more before publishing");
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
    toast.success(lang === "ar" ? "تم نشر المنشور" : "Post published");
    loadMyPosts();
  };

  const deleteMyPost = async (id: string) => {
    const { error } = await supabase.from("social_posts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMyPosts((prev) => prev.filter((p) => p.id !== id));
    toast.success(lang === "ar" ? "تم حذف المنشور" : "Post removed");
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
    if (!editData.full_name?.trim()) return;
    setSaveLoading(true);
    setSaveError(null);
    try {
      const fullName = editData.full_name.trim();
      const skills = parseSkills(editData.skills_text || formatSkills(editData.skills));
      const education = parsePipeLines<{ school: string; degree: string; year: string }>(
        editData.education_text || "",
        ["school", "degree", "year"],
      );
      const work_experience = parsePipeLines<{
        title: string;
        company: string;
        period: string;
        description: string;
      }>(editData.work_text || "", ["title", "company", "period", "description"]);
      const projects = parsePipeLines<{ name: string; description: string; url: string }>(
        editData.projects_text || "",
        ["name", "description", "url"],
      );

      const yearsRaw = editData.years_experience;
      const years_experience =
        yearsRaw === null || yearsRaw === undefined || String(yearsRaw).trim() === "" || Number.isNaN(Number(yearsRaw))
          ? null
          : Math.max(0, Math.min(80, Math.round(Number(yearsRaw))));

      const payload = {
        full_name: fullName,
        role: (editData.role || "").trim(),
        company: (editData.company || "").trim(),
        location: (editData.location || "").trim(),
        bio: (editData.bio || "").trim(),
        linkedin_url: (editData.linkedin_url || "").trim(),
        website_url: (editData.website_url || "").trim(),
        phone: (editData.phone || "").trim(),
        avatar_url: (editData.avatar_url || "").trim(),
        cover_url: (editData.cover_url || "").trim(),
        specialty: (editData.specialty || "").trim(),
        years_experience,
        skills,
        education,
        work_experience,
        projects,
      };

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
        full_name: fullName,
        avatar_url: payload.avatar_url,
      });
      if (profileResult.error) throw new Error(profileResult.error);

      setExtProfile((prev) => ({
        ...prev,
        ...payload,
        skills_text: formatSkills(payload.skills),
        education_text: formatPipeLines(payload.education, ["school", "degree", "year"]),
        work_text: formatPipeLines(payload.work_experience, [
          "title",
          "company",
          "period",
          "description",
        ]),
        projects_text: formatPipeLines(payload.projects, ["name", "description", "url"]),
      }));
      setSaveSuccess(true);
      setEditing(false);
      toast.success(lang === "ar" ? "تم حفظ الملف الشخصي" : "Profile saved");
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
            <p className="text-muted-foreground mb-4">Please sign in to access your dashboard.</p>
            <Link to="/auth"><Button className="bg-primary text-primary-foreground">Sign In</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentTier = (extProfile.subscription_tier || profile?.subscription_tier || "free") as keyof typeof TIER_CONFIG;
  const tierCfg = TIER_CONFIG[currentTier] || TIER_CONFIG.free;
  const memberSince = (extProfile.created_at || profile?.created_at)
    ? new Date(extProfile.created_at || profile!.created_at!).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { month: "long", year: "numeric" })
    : lang === "ar" ? "يونيو 2026" : "June 2026";
  const displayName = extProfile.full_name || profile?.full_name || user.email?.split("@")[0] || "User";
  const isCompany = extProfile.account_type === "company";
  const isPro = currentTier === "professional";
  const isEnt = currentTier === "enterprise";
  // Override isPremium/isEnterprise from auth context with local extProfile (more up-to-date)
  const localIsPremium = isPro || isEnt || isPremium;
  const localIsEnterprise = isEnt || isEnterprise;

  const TABS = [
    { key: "overview", label: lang === "ar" ? "نظرة عامة" : "Overview", icon: BarChart2 },
    ...(localIsPremium ? [{ key: "premium" as const, label: lang === "ar" ? (isEnt ? "لوحة الشركة" : "مكتبة الموارد") : (isEnt ? "Company Hub" : "Resource Library"), icon: isEnt ? Building2 : Sparkles }] : []),
    { key: "profile", label: lang === "ar" ? "ملفي الشخصي" : "My Profile", icon: User },
    { key: "posts", label: lang === "ar" ? "منشوراتي" : "My Posts", icon: MessageSquareText },
    { key: "subscription", label: lang === "ar" ? "عضويتي" : "My Membership", icon: CreditCard },
    { key: "security", label: lang === "ar" ? "الأمان" : "Security", icon: Lock },
  ] as const;

  const QUICK_ACTIONS = [
    { icon: Briefcase, label: lang === "ar" ? "فرص العمل" : "Job Opportunities", desc: lang === "ar" ? "ابحث أو انشر وظائف" : "Search or post roles", color: "bg-primary/10 dark:bg-primary/20", iconColor: "text-primary", href: "/jobs" },
    { icon: MessageSquareText, label: lang === "ar" ? "المجتمع المهني" : "Community Feed", desc: lang === "ar" ? "انشر وتابع التحديثات" : "Publish & follow updates", color: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-600", href: "/community" },
    { icon: Users, label: lang === "ar" ? "دليل الأعضاء" : "Members Directory", desc: lang === "ar" ? "تواصل مع المتخصصين" : "Connect with professionals", color: "bg-purple-100 dark:bg-purple-900/30", iconColor: "text-purple-600", href: "/members" },
    { icon: TrendingUp, label: lang === "ar" ? "أخبار الصناعة" : "Industry News", desc: lang === "ar" ? "آخر تطورات علوم النكهات" : "Latest flavor science updates", color: "bg-emerald-100 dark:bg-emerald-900/30", iconColor: "text-emerald-600", href: "/#news" },
    { icon: Star, label: lang === "ar" ? "عضويتي" : "My Membership", desc: lang === "ar" ? "منصة مجانية بالكامل" : "Fully free platform access", color: "bg-rose-100 dark:bg-rose-900/30", iconColor: "text-rose-600", href: undefined, onClick: () => setActiveTab("subscription") },
    { icon: ExternalLink, label: lang === "ar" ? "مجموعة لينكد إن" : "LinkedIn Group", desc: lang === "ar" ? "مجتمع محترفي النكهات" : "Flavor professionals community", color: "bg-sky-100 dark:bg-sky-900/30", iconColor: "text-sky-600", href: "https://www.linkedin.com/groups/13155714/" },
  ];

  const ACHIEVEMENTS = [
    { icon: CheckCircle, label: lang === "ar" ? "البريد موثق" : "Email Verified", earned: !!user.email_confirmed_at, color: "text-emerald-500" },
    { icon: User, label: lang === "ar" ? "الملف مكتمل" : "Profile Complete", earned: !!(extProfile.role && extProfile.company && extProfile.bio && extProfile.specialty), color: "text-blue-500" },
    { icon: Crown, label: lang === "ar" ? "وصول كامل" : "Full Access", earned: !!user, color: "text-primary" },
    { icon: Star, label: lang === "ar" ? "حساب شركة" : "Company Account", earned: isEnt || localIsEnterprise || profile?.account_type === "company", color: "text-purple-500" },
    { icon: Award, label: lang === "ar" ? "من المبكرين" : "Early Adopter", earned: new Date(user.created_at ?? Date.now()) < new Date("2026-08-01"), color: "text-primary" },
  ];

  const PREMIUM_FEATURES = [
    { icon: FileText, label: lang === "ar" ? "الأوراق البحثية" : "Research Papers", desc: lang === "ar" ? "موارد علمية للأعضاء" : "Member research resources", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
    { icon: Video, label: lang === "ar" ? "الندوات الحصرية" : "Exclusive Webinars", desc: lang === "ar" ? "ندوات مباشرة مع خبراء الصناعة" : "Live webinars with industry experts", color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30" },
    { icon: LineChart, label: lang === "ar" ? "تقارير الصناعة" : "Industry Reports", desc: lang === "ar" ? "تحليلات السوق والاتجاهات" : "Market analytics & trends", color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" },
    { icon: FlaskConical, label: lang === "ar" ? "أدلة التركيب" : "Formulation Guides", desc: lang === "ar" ? "بروتوكولات وصيغ تقنية متقدمة" : "Advanced technical protocols", color: "text-rose-600 bg-rose-100 dark:bg-rose-900/30" },
    { icon: Target, label: lang === "ar" ? "استشارات الخبراء" : "Expert Consultations", desc: lang === "ar" ? "تواصل مباشر مع كبار الخبراء" : "Direct access to senior experts", color: "text-primary bg-primary/10 dark:bg-primary/20" },
    { icon: Download, label: lang === "ar" ? "قوالب قابلة للتنزيل" : "Downloadable Templates", desc: lang === "ar" ? "نماذج وقوالب جاهزة للاستخدام" : "Ready-to-use professional templates", color: "text-sky-600 bg-sky-100 dark:bg-sky-900/30" },
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
                <ArrowLeft className="w-3 h-3" /> {lang === "ar" ? "العودة للرئيسية" : "Back to home"}
              </Link>
              <h1 className="text-2xl font-bold text-foreground">{lang === "ar" ? "لوحة التحكم" : "Dashboard"}</h1>
              <p className="text-sm text-muted-foreground">{lang === "ar" ? "مرحباً بعودتك، " : "Welcome back, "}<span className="font-semibold text-foreground">{displayName}</span></p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link to="/admin">
                  <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow">
                    <ShieldCheck className="w-3.5 h-3.5" /> Admin Panel
                  </Button>
                </Link>
              )}
              <Button variant="outline" size="sm" className="gap-2 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={handleSignOut}>
                <LogOut className="w-3.5 h-3.5" /> {lang === "ar" ? "خروج" : "Sign Out"}
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
                  {isPro && <Crown className="absolute right-3 top-3 w-5 h-5 text-white/60" />}
                  {isEnt && <Star className="absolute right-3 top-3 w-5 h-5 text-white/60" />}
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
                      {tierCfg.icon && <tierCfg.icon className="w-3 h-3 mr-1" />}
                      {lang === "ar" ? tierCfg.labelAr : tierCfg.label}
                    </Badge>
                    {isCompany && (
                      <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        <Building2 className="w-3 h-3 mr-1" />{lang === "ar" ? "شركة" : "Company"}
                      </Badge>
                    )}
                  </div>
                  {saveSuccess && (
                    <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> {lang === "ar" ? "تم التحديث!" : "Profile updated!"}
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
                      onClick={() => setActiveTab(key as typeof activeTab)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
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
                        <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-semibold bg-primary/20 text-primary">
                          {isEnt ? "✦" : "★"}
                        </span>
                      )}
                      {activeTab === key && key !== "premium" && <ChevronRight className="w-3 h-3 ml-auto" />}
                    </button>
                  ))}
                  <Separator className="my-2" />
                  {isAdmin && (
                    <Link to="/admin" className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-secondary dark:hover:bg-primary/20">
                      <ShieldCheck className="w-4 h-4" /> Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="w-4 h-4" /> {lang === "ar" ? "تسجيل الخروج" : "Sign Out"}
                  </button>
                </CardContent>
              </Card>

              {/* Achievements */}
              <Card className="border border-border">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" /> {lang === "ar" ? "الإنجازات" : "Achievements"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-2">
                  {ACHIEVEMENTS.map(({ icon: Icon, label, earned, color }) => (
                    <div key={label} className={`flex items-center gap-2 text-xs ${earned ? "text-foreground" : "text-muted-foreground/50"}`}>
                      <Icon className={`w-3.5 h-3.5 ${earned ? color : "text-muted-foreground/30"}`} />
                      <span>{label}</span>
                      {earned && <CheckCircle className="w-3 h-3 text-emerald-500 ml-auto" />}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Profile completion */}
              {(() => {
                const profileFields = [
                  extProfile.full_name,
                  extProfile.role,
                  extProfile.company,
                  extProfile.location,
                  extProfile.bio,
                  extProfile.specialty,
                  extProfile.cover_url,
                  (extProfile.skills?.length ?? 0) > 0 || !!extProfile.skills_text,
                  extProfile.linkedin_url,
                ];
                const filled = profileFields.filter(Boolean).length;
                const pct = Math.round((filled / profileFields.length) * 100);
                const incomplete = pct < 100;
                return (
                  <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Rocket className="w-4 h-4 text-primary" />
                        <p className="text-sm font-semibold text-primary">{lang === "ar" ? "اكتمال الملف" : "Profile Strength"}</p>
                        <span className="ms-auto text-xs font-semibold text-primary">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5 mb-2" />
                      <p className="text-xs text-muted-foreground mb-3">
                        {incomplete
                          ? (lang === "ar" ? "أضف صورة الغلاف والتخصص والمهارات لزيادة الظهور" : "Add cover, specialty, and skills to boost visibility")
                          : (lang === "ar" ? "ملفك مكتمل — أحسنت!" : "Your profile looks complete — great work!")}
                      </p>
                      {incomplete && (
                        <Button size="sm" className="w-full" onClick={() => setActiveTab("profile")}>
                          {lang === "ar" ? "أكمل ملفك الآن" : "Complete profile now"}
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
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: Crown, label: lang === "ar" ? "العضوية" : "Membership", value: lang === "ar" ? "مجانية" : "Free", color: "text-primary bg-primary/10" },
                      { icon: Calendar, label: lang === "ar" ? "عضو منذ" : "Member Since", value: memberSince, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
                      { icon: CheckCircle, label: lang === "ar" ? "الحالة" : "Status", value: lang === "ar" ? "نشط" : "Active", color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30" },
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
                          <p className="font-bold text-primary text-base">{lang === "ar" ? "مرحباً بك — عضويتك مجانية بالكامل" : "Welcome — your membership is fully free"}</p>
                          <p className="text-sm text-muted-foreground">{lang === "ar" ? "وصول كامل للموارد والوظائف والمجتمع والمنتدى بدون اشتراك" : "Full access to resources, jobs, community, and forum — no subscription"}</p>
                        </div>
                        <Button size="sm" className="ml-auto whitespace-nowrap" onClick={() => setActiveTab("premium")}>
                          {lang === "ar" ? "استكشف" : "Explore"} <ChevronRight className="w-3.5 h-3.5 ml-1" />
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
                          <p className="font-bold text-primary text-base">{lang === "ar" ? "حساب الشركة نشط — مجاني بالكامل" : "Company account active — fully free"}</p>
                          <p className="text-sm text-muted-foreground">{lang === "ar" ? "انشر الوظائف، أدر ملف الشركة، وتواصل مع مجتمع المتخصصين — مجاناً" : "Post jobs, manage your company profile, and reach professionals — free"}</p>
                        </div>
                        <Button size="sm" className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap" onClick={() => setActiveTab("premium")}>
                          {lang === "ar" ? "لوحتي" : "My Hub"} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Quick Actions Grid */}
                  <Card className="border border-border">
                    <CardHeader className="p-4 pb-3">
                      <CardTitle className="text-sm font-semibold">{lang === "ar" ? "وصول سريع" : "Quick Access"}</CardTitle>
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
                          if (onClick) return <button key={label} className="text-left" onClick={onClick}>{Inner}</button>;
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
                        {lang === "ar" ? "ملخص الحساب" : "Account Summary"}
                        <button onClick={() => setActiveTab("profile")} className="text-xs text-primary hover:underline font-normal">
                          {lang === "ar" ? "تعديل الملف" : "Edit Profile"}
                        </button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-2 text-sm">
                        {[
                          { icon: Mail, label: lang === "ar" ? "البريد" : "Email", value: user.email },
                          { icon: User, label: lang === "ar" ? "الاسم" : "Full Name", value: displayName },
                          { icon: Briefcase, label: lang === "ar" ? "المنصب" : "Role", value: extProfile.role || "—" },
                          { icon: Building2, label: lang === "ar" ? "الشركة" : "Company", value: extProfile.company || "—" },
                          { icon: MapPin, label: lang === "ar" ? "الموقع" : "Location", value: extProfile.location || "—" },
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
                        <h2 className="text-xl font-bold">{lang === "ar" ? "عضوية احترافية" : "Professional Membership"}</h2>
                      </div>
                      <p className="text-white/80 text-sm max-w-lg">{lang === "ar" ? "لديك وصول كامل لجميع الموارد البحثية والندوات الحصرية وتقارير الصناعة" : "You have full access to all research papers, exclusive webinars, and industry reports"}</p>
                      <div className="flex gap-3 mt-4 flex-wrap">
                        <div className="bg-white/20 rounded-lg px-3 py-1.5 text-sm font-medium">{lang === "ar" ? "موارد بحثية للأعضاء" : "Member research resources"}</div>
                        <div className="bg-white/20 rounded-lg px-3 py-1.5 text-sm font-medium">
                          {premiumResources.length} {lang === "ar" ? "مورداً في مكتبتك" : "library resources"}
                        </div>
                        <div className="bg-white/20 rounded-lg px-3 py-1.5 text-sm font-medium">
                          {upcomingWebinars.length} {lang === "ar" ? "ندوات مجدولة" : "scheduled webinars"}
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
                        <h2 className="text-xl font-bold">{lang === "ar" ? "لوحة تحكم الشركة" : "Enterprise Control Panel"}</h2>
                      </div>
                      <p className="text-white/80 text-sm max-w-lg">{lang === "ar" ? "إدارة حضور شركتك والإعلانات والمقالات وتحليلات الأداء" : "Manage your company presence, ads, articles, and performance analytics"}</p>
                      {/* Enterprise Stats */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                        {enterpriseStats.map(({ label, labelAr, value, icon: Icon }) => (
                          <div key={label} className="bg-white/20 rounded-xl p-3">
                            <Icon className="w-4 h-4 mb-1 opacity-80" />
                            <p className="text-lg font-bold">{value}</p>
                            <p className="text-xs opacity-80">{lang === "ar" ? labelAr : label}</p>
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
                          {lang === "ar" ? "مكتبتك البحثية" : "Your Research Library"}
                          <Badge className="ml-auto text-xs bg-primary/10 text-primary">{lang === "ar" ? "وصول كامل" : "Full Access"}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        {premiumResources.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground text-sm">
                            {lang === "ar" ? "لا توجد موارد مميزة حتى الآن" : "No premium resources yet"}
                          </div>
                        ) : premiumResources.map((res) => (
                          <div key={res.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer group">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {res.type === "course" ? <PlayCircle className="w-4 h-4 text-primary" /> :
                               res.type === "report" ? <PieChart className="w-4 h-4 text-primary" /> :
                               <FileText className="w-4 h-4 text-primary" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-sm truncate">{res.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-xs px-1.5 py-0">{res.category}</Badge>
                                <span className="text-xs text-muted-foreground capitalize">{res.type}</span>
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
                                <Download className="w-3 h-3" /> {lang === "ar" ? "فتح" : "Open"}
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => void openResourceLink(res.id, null, true)}>
                                <Download className="w-3 h-3" /> {lang === "ar" ? "فتح" : "Open"}
                              </Button>
                            )}
                          </div>
                        ))}
                        <Link to="/#resources">
                          <Button variant="outline" size="sm" className="w-full gap-2 mt-1">
                            {lang === "ar" ? "عرض جميع الموارد" : "View All Resources"} <ChevronRight className="w-3.5 h-3.5" />
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
                          {lang === "ar" ? "الندوات القادمة" : "Upcoming Webinars"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        {upcomingWebinars.length === 0 ? (
                          <div className="text-center py-6 text-muted-foreground text-sm">
                            {lang === "ar" ? "لا توجد ندوات قادمة حالياً" : "No upcoming webinars scheduled yet"}
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
                                  {lang === "ar" ? "سجّل" : "Join"}
                                </Button>
                              </a>
                            ) : (
                              <Button size="sm" variant="outline" className="text-xs" disabled>
                                {lang === "ar" ? "قريباً" : "Soon"}
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
                        { icon: Newspaper, title: lang === "ar" ? "إدارة الإعلانات" : "Manage Ads", desc: lang === "ar" ? "3 إعلانات نشطة شهرياً" : "3 active ads monthly", color: "border-blue-200 bg-blue-50/50 dark:bg-blue-900/10", iconColor: "text-blue-600 bg-blue-100 dark:bg-blue-900/30", cta: lang === "ar" ? "إضافة إعلان" : "Add Ad", href: "/contact?type=enterprise" },
                        { icon: FileText, title: lang === "ar" ? "نشر مقالات" : "Publish Articles", desc: lang === "ar" ? "نشر غير محدود على الموقع" : "Unlimited articles on platform", color: "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10", iconColor: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30", cta: lang === "ar" ? "كتابة مقال" : "Write Article", href: "/contact?type=enterprise&subject=article" },
                        { icon: Layers, title: lang === "ar" ? "شعار الشركة" : "Brand Placement", desc: lang === "ar" ? "شعارك في صفحة الشركاء" : "Logo in Partners section", color: "border-purple-200 bg-purple-50/50 dark:bg-purple-900/10", iconColor: "text-purple-600 bg-purple-100 dark:bg-purple-900/30", cta: lang === "ar" ? "رفع الشعار" : "Upload Logo", href: "/contact?type=enterprise&subject=brand" },
                        { icon: BarChart, title: lang === "ar" ? "تقارير الأداء" : "Performance Reports", desc: lang === "ar" ? "تحليلات شهرية مفصلة" : "Monthly detailed analytics", color: "border-primary/30 bg-secondary/50 dark:bg-primary/10", iconColor: "text-primary bg-primary/10 dark:bg-primary/20", cta: lang === "ar" ? "عرض التقرير" : "View Report", href: "/contact?type=enterprise&subject=report" },
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
                        {lang === "ar" ? "جميع مزاياك" : "All Your Benefits"}
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
                              {lang === "ar" ? "عضوية مجانية بالكامل" : "Fully Free Membership"}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {lang === "ar" ? "وصول كامل للأفراد والشركات — بدون اشتراك" : "Full access for individuals and companies — no subscription"}
                            </p>
                          </div>
                        </div>
                        <Badge className="text-sm px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {lang === "ar" ? "مجاني" : "Free"}
                        </Badge>
                      </div>
                      <Separator className="mb-4" />
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                        {[
                          { label: lang === "ar" ? "السعر" : "Price", value: "$0" },
                          { label: lang === "ar" ? "الفوترة" : "Billing", value: lang === "ar" ? "لا يوجد" : "None" },
                          { label: lang === "ar" ? "عضو منذ" : "Since", value: memberSince },
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
                        {lang === "ar" ? "ما تشمله عضويتك" : "What's Included"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          lang === "ar" ? "الأخبار والمقالات والموارد التعليمية" : "News, articles, and educational resources",
                          lang === "ar" ? "فرص العمل والتقديم عليها" : "Job listings and applications",
                          lang === "ar" ? "المجتمع والمنتدى ودليل الأعضاء" : "Community, forum, and members directory",
                          lang === "ar" ? "الدورات والاستشارات والسوق" : "Courses, consultations, and market",
                          lang === "ar" ? "حسابات الشركات مجانية بالكامل" : "Company accounts fully free",
                          lang === "ar" ? "بدون اشتراكات أو مدفوعات" : "No subscriptions or payments",
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
                        <Building2 className="w-4 h-4" /> {lang === "ar" ? "خدمات الشركات" : "Enterprise services"}
                      </Button>
                    </Link>
                    <Button variant="outline" className="gap-2 flex-1 min-w-fit" asChild>
                      <a href={`mailto:${SITE.supportEmail}?subject=${encodeURIComponent("Membership support — Flavor Experts Network")}`}>
                        <RefreshCw className="w-4 h-4" /> {lang === "ar" ? "الدعم" : "Support"}
                      </a>
                    </Button>
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
                        {lang === "ar" ? "انشر تحديثاً مهنياً" : "Publish a professional update"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-2 space-y-3">
                      <Textarea
                        rows={4}
                        value={dashPostBody}
                        onChange={(e) => setDashPostBody(e.target.value)}
                        placeholder={lang === "ar" ? "شارك رؤية أو إنجازاً أو تحديثاً مهنياً…" : "Share an insight, milestone, or professional update…"}
                        className="resize-none"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <Link to="/community" className="text-xs text-primary hover:underline">
                          {lang === "ar" ? "عرض تغذية المجتمع" : "Open community feed"}
                        </Link>
                        <Button onClick={publishDashPost} disabled={dashPublishing} className="gap-2">
                          {dashPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {lang === "ar" ? "نشر" : "Publish"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border">
                    <CardHeader className="p-5 pb-2">
                      <CardTitle className="text-sm font-semibold">
                        {lang === "ar" ? "منشوراتك الأخيرة" : "Your recent posts"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-2 space-y-3">
                      {postsLoading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      ) : myPosts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          {lang === "ar" ? "لم تنشر أي منشورات بعد." : "You have not published any posts yet."}
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
                        {lang === "ar" ? "ملفك المهني العام" : "Your public professional profile"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {lang === "ar"
                          ? "أكمل بياناتك وانشر تحديثات منتظمة لزيادة ظهورك في الشبكة."
                          : "Complete your details and publish regular updates to grow your visibility."}
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
                        {lang === "ar" ? "عرض الملف العام" : "View public profile"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab("posts")}>
                        {lang === "ar" ? "نشر منشور" : "Write a post"}
                      </Button>
                      <Button asChild size="sm">
                        <Link to="/community">{lang === "ar" ? "المجتمع" : "Community"}</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-border">
                  <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" /> {lang === "ar" ? "ملفي الشخصي" : "My Profile"}
                    </CardTitle>
                    {!editing ? (
                      <Button size="sm" variant="outline" onClick={startEdit} className="gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" /> {lang === "ar" ? "تعديل" : "Edit"}
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSave} disabled={saveLoading} className="gap-1.5">
                          {saveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          {lang === "ar" ? "حفظ" : "Save"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saveLoading} className="gap-1.5">
                          <X className="w-3.5 h-3.5" /> {lang === "ar" ? "إلغاء" : "Cancel"}
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
                        <CheckCircle className="w-4 h-4" /> {lang === "ar" ? "تم حفظ الملف الشخصي بنجاح!" : "Profile saved successfully!"}
                      </div>
                    )}
                    {editing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2 space-y-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            {lang === "ar" ? "صورة الغلاف" : "Cover photo"}
                          </Label>
                          <FileUploader
                            accept="image"
                            bucket="platform-uploads"
                            folder="avatars/covers"
                            currentUrl={editData.cover_url || ""}
                            maxSizeMB={8}
                            showUrlFallback={false}
                            label={lang === "ar" ? "رفع صورة غلاف" : "Upload cover image"}
                            onUpload={(url) => {
                              setEditData((p) => ({ ...p, cover_url: url }));
                              setExtProfile((p) => ({ ...p, cover_url: url }));
                            }}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            {lang === "ar"
                              ? "يفضّل صورة أفقية بعرض واسع (مثل 1600×400)."
                              : "Prefer a wide landscape image (e.g. 1600×400)."}
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
                            label={lang === "ar" ? "تغيير الصورة الشخصية" : "Change Profile Photo"}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "الاسم الكامل *" : "Full Name *"}</Label>
                          <Input value={editData.full_name || ""} onChange={(e) => setEditData((p) => ({ ...p, full_name: e.target.value }))} placeholder={lang === "ar" ? "أحمد الراشدي" : "Ahmed Al-Rashidi"} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "المسمى الوظيفي" : "Job Title / Role"}</Label>
                          <Input value={editData.role || ""} onChange={(e) => setEditData((p) => ({ ...p, role: e.target.value }))} placeholder={lang === "ar" ? "خبير نكهات" : "Flavor Scientist"} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "الشركة / المؤسسة" : "Company / Organization"}</Label>
                          <Input value={editData.company || ""} onChange={(e) => setEditData((p) => ({ ...p, company: e.target.value }))} placeholder={lang === "ar" ? "مختبرات النكهات العربية" : "Arabian Flavor Labs"} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "الموقع" : "Location"}</Label>
                          <Input value={editData.location || ""} onChange={(e) => setEditData((p) => ({ ...p, location: e.target.value }))} placeholder={lang === "ar" ? "الرياض، المملكة" : "Riyadh, Saudi Arabia"} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "سنوات الخبرة" : "Years of experience"}</Label>
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
                          <Label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "الهاتف" : "Phone"}</Label>
                          <Input value={editData.phone || ""} onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))} placeholder="+966 5X XXX XXXX" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "رابط لينكد إن" : "LinkedIn URL"}</Label>
                          <Input value={editData.linkedin_url || ""} onChange={(e) => setEditData((p) => ({ ...p, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/yourname" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "الموقع الإلكتروني" : "Website"}</Label>
                          <Input value={editData.website_url || ""} onChange={(e) => setEditData((p) => ({ ...p, website_url: e.target.value }))} placeholder="https://yourwebsite.com" />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "نبذة شخصية" : "Bio / About"}</Label>
                          <Textarea value={editData.bio || ""} onChange={(e) => setEditData((p) => ({ ...p, bio: e.target.value }))} placeholder={lang === "ar" ? "شارك خبراتك ومسيرتك المهنية..." : "Share your expertise and background..."} rows={3} className="resize-none" />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "مجالات التخصص" : "Focus areas / specialties"}</Label>
                          <Input
                            value={editData.specialty || ""}
                            onChange={(e) => setEditData((p) => ({ ...p, specialty: e.target.value }))}
                            placeholder={lang === "ar" ? "نكهات طبيعية, تقييم حسي, تركيب" : "Natural flavors, Sensory, Formulation"}
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {lang === "ar" ? "افصل التخصصات بفاصلة." : "Separate specialties with commas."}
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "المهارات" : "Skills"}</Label>
                          <Input
                            value={editData.skills_text || ""}
                            onChange={(e) => setEditData((p) => ({ ...p, skills_text: e.target.value }))}
                            placeholder={lang === "ar" ? "GC-MS, QDA, Encapsulation" : "GC-MS, QDA, Encapsulation"}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "الخبرات المهنية" : "Work experience"}</Label>
                          <Textarea
                            value={editData.work_text || ""}
                            onChange={(e) => setEditData((p) => ({ ...p, work_text: e.target.value }))}
                            placeholder={
                              lang === "ar"
                                ? "المسمى | الشركة | الفترة | الوصف\nخبير نكهات | شركة النكهات | 2020-الآن | تطوير تركيبات"
                                : "Title | Company | Period | Description\nFlavor Scientist | Acme Flavors | 2020-Present | Led formulation"
                            }
                            rows={4}
                            className="resize-none font-mono text-xs"
                          />
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {lang === "ar" ? "سطر لكل خبرة، افصل الحقول بـ |" : "One line per role; separate fields with |"}
                          </p>
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "التعليم" : "Education"}</Label>
                          <Textarea
                            value={editData.education_text || ""}
                            onChange={(e) => setEditData((p) => ({ ...p, education_text: e.target.value }))}
                            placeholder={
                              lang === "ar"
                                ? "الجامعة | الدرجة | السنة\nجامعة الملك سعود | بكالوريوس علوم الأغذية | 2018"
                                : "School | Degree | Year\nKing Saud University | BSc Food Science | 2018"
                            }
                            rows={3}
                            className="resize-none font-mono text-xs"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs text-muted-foreground mb-1 block">{lang === "ar" ? "المشاريع" : "Projects"}</Label>
                          <Textarea
                            value={editData.projects_text || ""}
                            onChange={(e) => setEditData((p) => ({ ...p, projects_text: e.target.value }))}
                            placeholder={
                              lang === "ar"
                                ? "الاسم | الوصف | الرابط\nمنصة النكهات | شبكة مهنية | https://example.com"
                                : "Name | Description | URL\nFlavor Platform | Professional network | https://example.com"
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
                            { icon: Mail, label: lang === "ar" ? "البريد" : "Email", value: user.email },
                            { icon: Building2, label: lang === "ar" ? "الشركة" : "Company", value: extProfile.company },
                            { icon: MapPin, label: lang === "ar" ? "الموقع" : "Location", value: extProfile.location },
                            { icon: Briefcase, label: lang === "ar" ? "سنوات الخبرة" : "Experience", value: extProfile.years_experience ? `${extProfile.years_experience}+` : undefined },
                            { icon: Phone, label: lang === "ar" ? "الهاتف" : "Phone", value: extProfile.phone },
                            { icon: Linkedin, label: "LinkedIn", value: extProfile.linkedin_url, isLink: true },
                            { icon: Globe, label: lang === "ar" ? "الموقع الإلكتروني" : "Website", value: extProfile.website_url, isLink: true },
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
                        {lang === "ar" ? "أحدث منشوراتك" : "Latest posts"}
                        <button onClick={() => setActiveTab("posts")} className="text-xs text-primary hover:underline font-normal">
                          {lang === "ar" ? "إدارة الكل" : "Manage all"}
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
                        <Lock className="w-4 h-4 text-primary" /> {lang === "ar" ? "إعدادات الأمان" : "Security Settings"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-2 space-y-4">
                      {[
                        {
                          icon: CheckCircle,
                          label: lang === "ar" ? "التحقق من البريد" : "Email Verification",
                          desc: user.email_confirmed_at ? (lang === "ar" ? "بريدك الإلكتروني موثق" : "Your email is verified") : (lang === "ar" ? "البريد غير موثق بعد" : "Email not verified yet"),
                          color: user.email_confirmed_at ? "text-emerald-600 bg-emerald-100" : "text-amber-600 bg-amber-100",
                          badge: user.email_confirmed_at ? (lang === "ar" ? "موثق" : "Verified") : (lang === "ar" ? "معلق" : "Pending"),
                        },
                        {
                          icon: Lock,
                          label: lang === "ar" ? "كلمة المرور" : "Password",
                          desc: lang === "ar" ? "حافظ على أمان حسابك بكلمة مرور قوية" : "Keep your account secure with a strong password",
                          color: "text-blue-600 bg-blue-100",
                          badge: lang === "ar" ? "محمي" : "Protected",
                        },
                        {
                          icon: Bell,
                          label: lang === "ar" ? "إشعارات البريد" : "Email Notifications",
                          desc: lang === "ar" ? "استقبل أخبار الصناعة وتحديثات المنصة" : "Receive industry news and platform updates",
                          color: "text-purple-600 bg-purple-100",
                          badge: lang === "ar" ? "نشط" : "Active",
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
                        <FileText className="w-4 h-4 text-primary" /> {lang === "ar" ? "تفاصيل الحساب" : "Account Details"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 pt-2 space-y-3 text-sm">
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">{lang === "ar" ? "معرف المستخدم" : "User ID"}</span>
                        <span className="font-mono text-xs text-foreground bg-muted px-2 py-0.5 rounded">{user.id?.substring(0, 16)}...</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">{lang === "ar" ? "نوع الحساب" : "Account Type"}</span>
                        <Badge className="text-xs">{isCompany ? (lang === "ar" ? "شركة" : "Company") : (lang === "ar" ? "فردي" : "Individual")}</Badge>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-muted-foreground">{lang === "ar" ? "مستوى الاشتراك" : "Subscription Tier"}</span>
                        <Badge className={`text-xs ${tierCfg.color}`}>{lang === "ar" ? tierCfg.labelAr : tierCfg.label}</Badge>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground">{lang === "ar" ? "عضو منذ" : "Member Since"}</span>
                        <span className="font-medium text-foreground text-xs">{memberSince}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-red-200 dark:border-red-900">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-red-600 text-sm">{lang === "ar" ? "تسجيل الخروج" : "Sign Out"}</p>
                        <p className="text-xs text-muted-foreground">{lang === "ar" ? "سيتم تسجيل خروجك من حسابك" : "You will be logged out of your account"}</p>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2 text-red-500 border-red-200 hover:bg-red-50" onClick={handleSignOut}>
                        <LogOut className="w-3.5 h-3.5" /> {lang === "ar" ? "خروج" : "Sign Out"}
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

