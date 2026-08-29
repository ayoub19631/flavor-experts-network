import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard, Newspaper, BookOpen, MessageSquare, Users, Building2,
  Plus, Pencil, Trash2, ArrowLeft, CheckCircle, AlertCircle, Loader2,
  Eye, EyeOff, RefreshCw, FlaskConical, Crown, Star, Shield, UserCheck,
  Search, Activity, TrendingUp, Settings, ChevronRight, Globe, Zap,
  Mail, ExternalLink, Filter, CheckCheck, Copy, Database, Lock,
  Send, Radio, Megaphone, Newspaper as NewsIcon, Users as UsersIcon2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { IndustryNews, EducationalResource, ContactMessage, EnterpriseRequest, Member } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { usePageMeta } from "@/hooks/use-page-meta";
import Navbar from "@/components/Navbar";
import { PLATFORM_ALWAYS_FREE, SITE } from "@/lib/site-config";
import { FileUploader, AvatarUploader } from "@/components/ui/file-uploader";
import AdminModerationPanel from "@/components/admin/AdminModerationPanel";
import AdminCoursesPanel from "@/components/admin/AdminCoursesPanel";
import AdminConsultationsPanel from "@/components/admin/AdminConsultationsPanel";
import AdminForumCategoriesPanel from "@/components/admin/AdminForumCategoriesPanel";

// ─── Types ────────────────────────────────────────────────────────────────────
type NewsItem = IndustryNews;
type ResourceItem = EducationalResource;
type ContactMsg = ContactMessage;
type EnterpriseReq = EnterpriseRequest;

interface UserProfileAdmin {
  id: string;
  email: string;
  full_name: string;
  subscription_tier: "free" | "professional" | "enterprise";
  is_admin: boolean;
  platform_preview_access?: boolean;
  subscription_active: boolean;
  created_at: string;
}

interface Stats {
  news: number;
  resources: number;
  messages: number;
  enterprise: number;
  members: number;
  users: number;
  newMessages: number;
  newEnterprise: number;
  newsletterSubscribers: number;
  jobs: number;
  posts: number;
  topics: number;
  connections: number;
}

// ─── Authorized Admins: server-side is_admin flag (RLS enforced) ───────────────

// ─── Notification Toast ────────────────────────────────────────────────────────
function Notification({ type, message, onClose }: { type: "success" | "error"; message: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9990] flex items-center gap-3 rounded-xl border px-5 py-3 shadow-xl animate-in slide-in-from-top-2 whitespace-nowrap ${type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300" : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300"}`}>
      {type === "success" ? <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

// ─── Stats Card ───────────────────────────────────────────────────────────────
function StatsCard({ icon: Icon, label, value, color, badge }: { icon: React.ElementType; label: string; value: number; color: string; badge?: number }) {
  return (
    <Card className="border border-border hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
        </div>
        {badge !== undefined && badge > 0 && (
          <Badge className="bg-red-500 text-white text-xs px-1.5 h-5">{badge}</Badge>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  usePageMeta({
    title: "Admin",
    description: "Platform administration.",
    path: "/admin",
    noIndex: true,
  });
  const [lang, setLang] = useState<"ar" | "en">("ar");

  // ── Data State ─────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<Stats>({ news: 0, resources: 0, messages: 0, enterprise: 0, members: 0, users: 0, newMessages: 0, newEnterprise: 0, newsletterSubscribers: 0, jobs: 0, posts: 0, topics: 0, connections: 0 });
  const [news, setNews] = useState<NewsItem[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [messages, setMessages] = useState<ContactMsg[]>([]);
  const [enterprise, setEnterprise] = useState<EnterpriseReq[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<UserProfileAdmin[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [usersFetchError, setUsersFetchError] = useState<string | null>(null);

  // ── Search ─────────────────────────────────────────────────────────────────
  const [searchNews, setSearchNews] = useState("");
  const [searchResources, setSearchResources] = useState("");
  const [searchMembers, setSearchMembers] = useState("");
  const [searchUsers, setSearchUsers] = useState("");

  // ── Notifications ──────────────────────────────────────────────────────────
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const notify = (type: "success" | "error", message: string) => setNotification({ type, message });

  // ── News Form ──────────────────────────────────────────────────────────────
  const [newsDialog, setNewsDialog] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [newsForm, setNewsForm] = useState({ title: "", summary: "", content: "", category: "Innovation", image_url: "", source_url: "", author: "Flavor Experts Team", is_published: true });
  const [newsLoading, setNewsLoading] = useState(false);

  // ── Resource Form ──────────────────────────────────────────────────────────
  const [resourceDialog, setResourceDialog] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
  const [resourceForm, setResourceForm] = useState({ title: "", description: "", type: "Article", link: "", category: "Flavor Science", image_url: "", pdf_url: "", premium: false, is_published: true });
  const [resourceLoading, setResourceLoading] = useState(false);

  // ── Member Form ────────────────────────────────────────────────────────────
  const [memberDialog, setMemberDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberForm, setMemberForm] = useState({ full_name: "", email: "", role: "", specialty: "", linkedin_url: "", avatar_url: "", is_featured: false });
  const [memberLoading, setMemberLoading] = useState(false);

  // ── Upload keys (force-remount uploaders on dialog open) ──────────────────
  const [newsUploadKey, setNewsUploadKey] = useState(0);
  const [resourceUploadKey, setResourceUploadKey] = useState(0);
  const [memberUploadKey, setMemberUploadKey] = useState(0);

  // ── User Management ────────────────────────────────────────────────────────
  const [userTierLoading, setUserTierLoading] = useState<string | null>(null);

  // ── Messages & Enterprise expanded view ───────────────────────────────────
  const [expandedMsg, setExpandedMsg] = useState<string | null>(null);
  const [expandedReq, setExpandedReq] = useState<string | null>(null);
  const [msgFilter, setMsgFilter] = useState<string>("all");

  // ── Broadcast state ────────────────────────────────────────────────────────
  const [bcSubject, setBcSubject] = useState("");
  const [bcBody, setBcBody] = useState("");
  const [bcType, setBcType] = useState<"newsletter" | "announcement" | "news">("newsletter");
  const [bcRecipients, setBcRecipients] = useState<"all" | "professional" | "enterprise" | "newsletter">("all");
  const [bcPreview, setBcPreview] = useState(false);
  const [bcSending, setBcSending] = useState(false);

  // ── Reply dialogs ──────────────────────────────────────────────────────────
  const [replyMsg, setReplyMsg] = useState<ContactMsg | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyEntReq, setReplyEntReq] = useState<EnterpriseReq | null>(null);
  const [replyEntText, setReplyEntText] = useState("");
  const [replyEntSending, setReplyEntSending] = useState(false);

  // ── Auth Guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) navigate("/");
  }, [loading, user, navigate]);

  // ── Fetch All ──────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setFetchLoading(true);
    const [{ data: newsData }, { data: resData }, { data: msgData }, { data: entData }, { data: memData }, { data: secureLinks }] = await Promise.all([
      supabase.from("industry_news").select("*").order("published_at", { ascending: false }),
      supabase.from("educational_resources").select("*").order("created_at", { ascending: false }),
      supabase.from("contact_messages").select("*").order("created_at", { ascending: false }),
      supabase.from("enterprise_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("members").select("*").order("joined_at", { ascending: false }),
      supabase.from("resource_secure_links").select("resource_id,url"),
    ]);

    const linkMap = new Map((secureLinks ?? []).map((l: { resource_id: string; url: string }) => [l.resource_id, l.url]));
    const mergedResources = ((resData as ResourceItem[]) ?? []).map((r) => ({
      ...r,
      link: r.premium ? (linkMap.get(r.id) || r.link || "") : (r.link || ""),
    }));

    const { data: usersData, error: usersErr } = await supabase
      .from("user_profiles")
      .select("id, email, full_name, subscription_tier, is_admin, platform_preview_access, subscription_active, created_at")
      .order("created_at", { ascending: false });

    const [
      { count: newsletterCount },
      { count: jobsCount },
      { count: postsCount },
      { count: topicsCount },
      { count: connectionsCount },
    ] = await Promise.all([
      supabase.from("newsletter_subscribers").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("job_listings").select("*", { count: "exact", head: true }),
      supabase.from("social_posts").select("*", { count: "exact", head: true }),
      supabase.from("forum_topics").select("*", { count: "exact", head: true }),
      supabase.from("member_connections").select("*", { count: "exact", head: true }),
    ]);

    if (usersErr) {
      setUsersFetchError("Admin policy not applied yet. Run admin-policies.sql in Supabase to manage users.");
    } else {
      setUsers((usersData as UserProfileAdmin[]) ?? []);
      setUsersFetchError(null);
    }

    setNews((newsData as NewsItem[]) ?? []);
    setResources(mergedResources);
    setMessages((msgData as ContactMsg[]) ?? []);
    setEnterprise((entData as EnterpriseReq[]) ?? []);
    setMembers((memData as Member[]) ?? []);
    setStats({
      news: newsData?.length ?? 0,
      resources: mergedResources.length,
      messages: msgData?.length ?? 0,
      enterprise: entData?.length ?? 0,
      members: memData?.length ?? 0,
      users: usersData?.length ?? 0,
      newMessages: msgData?.filter((m: ContactMsg) => m.status === "new").length ?? 0,
      newEnterprise: entData?.filter((e: EnterpriseReq) => e.status === "new").length ?? 0,
      newsletterSubscribers: newsletterCount ?? 0,
      jobs: jobsCount ?? 0,
      posts: postsCount ?? 0,
      topics: topicsCount ?? 0,
      connections: connectionsCount ?? 0,
    });
    setFetchLoading(false);
  };

  useEffect(() => { if (user && isAdmin) fetchAll(); }, [user, isAdmin]);

  // ── News CRUD ──────────────────────────────────────────────────────────────
  const openAddNews = () => {
    setEditingNews(null);
    setNewsForm({ title: "", summary: "", content: "", category: "Innovation", image_url: "", source_url: "", author: "Flavor Experts Team", is_published: true });
    setNewsUploadKey(k => k + 1);
    setNewsDialog(true);
  };

  const openEditNews = (item: NewsItem) => {
    setEditingNews(item);
    setNewsForm({ title: item.title, summary: item.summary ?? "", content: item.content ?? "", category: item.category, image_url: item.image_url ?? "", source_url: item.source_url ?? "", author: item.author, is_published: item.is_published });
    setNewsUploadKey(k => k + 1);
    setNewsDialog(true);
  };

  const saveNews = async () => {
    if (!newsForm.title.trim() || !newsForm.summary.trim()) { notify("error", "Title and summary are required"); return; }
    setNewsLoading(true);
    const payload = { ...newsForm, updated_at: new Date().toISOString() };
    if (editingNews) {
      const { error } = await supabase.from("industry_news").update(payload).eq("id", editingNews.id);
      if (error) notify("error", error.message); else notify("success", "Article updated successfully");
    } else {
      const { error } = await supabase.from("industry_news").insert([{ ...payload, published_at: new Date().toISOString() }]);
      if (error) notify("error", error.message); else notify("success", "Article published successfully");
    }
    setNewsLoading(false); setNewsDialog(false); fetchAll();
  };

  const deleteNews = async (id: string) => {
    if (!confirm("Delete this article? This cannot be undone.")) return;
    const { error } = await supabase.from("industry_news").delete().eq("id", id);
    if (error) notify("error", error.message); else { notify("success", "Article deleted"); fetchAll(); }
  };

  const toggleNewsPublished = async (item: NewsItem) => {
    await supabase.from("industry_news").update({ is_published: !item.is_published }).eq("id", item.id);
    notify("success", item.is_published ? "Article unpublished" : "Article published"); fetchAll();
  };

  // ── Resource CRUD ──────────────────────────────────────────────────────────
  const openAddResource = () => {
    setEditingResource(null);
    setResourceForm({ title: "", description: "", type: "Article", link: "", category: "Flavor Science", image_url: "", pdf_url: "", premium: false, is_published: true });
    setResourceUploadKey(k => k + 1);
    setResourceDialog(true);
  };

  const openEditResource = (item: ResourceItem) => {
    setEditingResource(item);
    const pdfUrl = (item as any).pdf_url ?? "";
    const linkUrl = item.link ?? "";
    setResourceForm({ title: item.title, description: item.description ?? "", type: item.type, link: pdfUrl || linkUrl, category: item.category, image_url: item.image_url ?? "", pdf_url: pdfUrl, premium: item.premium, is_published: item.is_published });
    setResourceUploadKey(k => k + 1);
    setResourceDialog(true);
  };

  const saveResource = async () => {
    if (!resourceForm.title.trim() || !resourceForm.description.trim()) { notify("error", "Title and description are required"); return; }
    setResourceLoading(true);
    const effectiveLink = resourceForm.pdf_url || resourceForm.link;
    // Premium URLs live in resource_secure_links — never expose them in the public link column
    const payload = {
      title: resourceForm.title, description: resourceForm.description, type: resourceForm.type,
      link: resourceForm.premium ? "" : effectiveLink,
      category: resourceForm.category, image_url: resourceForm.image_url,
      premium: resourceForm.premium, is_published: resourceForm.is_published,
      updated_at: new Date().toISOString(),
    };

    let resourceId = editingResource?.id;
    if (editingResource) {
      const { error } = await supabase.from("educational_resources").update(payload).eq("id", editingResource.id);
      if (error) { notify("error", error.message); setResourceLoading(false); return; }
      notify("success", "Resource updated");
    } else {
      const { data, error } = await supabase.from("educational_resources").insert([payload]).select("id").single();
      if (error) { notify("error", error.message); setResourceLoading(false); return; }
      resourceId = data?.id;
      notify("success", "Resource published");
    }

    if (resourceId) {
      if (resourceForm.premium && effectiveLink) {
        const { error: linkErr } = await supabase.from("resource_secure_links").upsert({
          resource_id: resourceId,
          url: effectiveLink,
          updated_at: new Date().toISOString(),
        });
        if (linkErr) notify("error", `Resource saved but secure link failed: ${linkErr.message}`);
      } else {
        await supabase.from("resource_secure_links").delete().eq("resource_id", resourceId);
      }
    }

    setResourceLoading(false); setResourceDialog(false); fetchAll();
  };

  const deleteResource = async (id: string) => {
    if (!confirm("Delete this resource? This cannot be undone.")) return;
    const { error } = await supabase.from("educational_resources").delete().eq("id", id);
    if (error) notify("error", error.message); else { notify("success", "Resource deleted"); fetchAll(); }
  };

  const toggleResourcePublished = async (item: ResourceItem) => {
    await supabase.from("educational_resources").update({ is_published: !item.is_published }).eq("id", item.id);
    notify("success", item.is_published ? "Resource unpublished" : "Resource published"); fetchAll();
  };

  // ── Member CRUD ────────────────────────────────────────────────────────────
  const openAddMember = () => {
    setEditingMember(null);
    setMemberForm({ full_name: "", email: "", role: "", specialty: "", linkedin_url: "", avatar_url: "", is_featured: false });
    setMemberUploadKey(k => k + 1);
    setMemberDialog(true);
  };

  const openEditMember = (item: Member) => {
    setEditingMember(item);
    setMemberForm({ full_name: item.full_name, email: item.email ?? "", role: item.role ?? "", specialty: item.specialty ?? "", linkedin_url: item.linkedin_url ?? "", avatar_url: item.avatar_url ?? "", is_featured: item.is_featured });
    setMemberUploadKey(k => k + 1);
    setMemberDialog(true);
  };

  const saveMember = async () => {
    if (!memberForm.full_name.trim()) { notify("error", "Full name is required"); return; }
    setMemberLoading(true);
    if (editingMember) {
      const { error } = await supabase.from("members").update({
        full_name: memberForm.full_name, email: memberForm.email || null, role: memberForm.role,
        specialty: memberForm.specialty, linkedin_url: memberForm.linkedin_url, avatar_url: memberForm.avatar_url, is_featured: memberForm.is_featured,
      }).eq("id", editingMember.id);
      if (error) notify("error", error.message); else notify("success", "Member updated");
    } else {
      const { error } = await supabase.from("members").insert([{
        full_name: memberForm.full_name, email: memberForm.email || null, role: memberForm.role,
        specialty: memberForm.specialty, linkedin_url: memberForm.linkedin_url, avatar_url: memberForm.avatar_url,
        is_featured: memberForm.is_featured, joined_at: new Date().toISOString(),
      }]);
      if (error) notify("error", error.message); else notify("success", "Member added successfully");
    }
    setMemberLoading(false); setMemberDialog(false); fetchAll();
  };

  const deleteMember = async (id: string) => {
    if (!confirm("Remove this member from the directory?")) return;
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) notify("error", error.message); else { notify("success", "Member removed"); fetchAll(); }
  };

  const toggleMemberFeatured = async (item: Member) => {
    await supabase.from("members").update({ is_featured: !item.is_featured }).eq("id", item.id);
    notify("success", item.is_featured ? "Removed from featured" : "Added to featured"); fetchAll();
  };

  // ── User Management ────────────────────────────────────────────────────────
  const updateUserTier = async (userId: string, tier: string) => {
    setUserTierLoading(userId);
    const { error } = await supabase.from("user_profiles").update({ subscription_tier: tier }).eq("id", userId);
    if (error) notify("error", error.message); else notify("success", `Subscription updated to ${tier}`);
    setUserTierLoading(null); fetchAll();
  };

  const toggleUserAdmin = async (u: UserProfileAdmin) => {
    const { error } = await supabase.from("user_profiles").update({ is_admin: !u.is_admin }).eq("id", u.id);
    if (error) notify("error", error.message); else notify("success", u.is_admin ? "Admin role removed" : "Admin role granted");
    fetchAll();
  };

  const togglePreviewAccess = async (u: UserProfileAdmin) => {
    const next = !u.platform_preview_access;
    const { error } = await supabase
      .from("user_profiles")
      .update({ platform_preview_access: next })
      .eq("id", u.id);
    if (error) notify("error", error.message);
    else notify("success", next ? "Preview access granted" : "Preview access revoked");
    fetchAll();
  };

  // ── Messages & Enterprise ──────────────────────────────────────────────────
  const updateMessageStatus = async (id: string, status: string) => {
    await supabase.from("contact_messages").update({ status }).eq("id", id); fetchAll();
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    await supabase.from("contact_messages").delete().eq("id", id);
    notify("success", "Message deleted"); fetchAll();
  };

  const updateEnterpriseStatus = async (id: string, status: string) => {
    await supabase.from("enterprise_requests").update({ status }).eq("id", id); fetchAll();
  };

  const deleteEnterprise = async (id: string) => {
    if (!confirm("Delete this enterprise request?")) return;
    await supabase.from("enterprise_requests").delete().eq("id", id);
    notify("success", "Request deleted"); fetchAll();
  };

  const markAllRead = async () => {
    const unread = messages.filter(m => m.status === "new");
    if (unread.length === 0) { notify("error", "No new messages to mark"); return; }
    await Promise.all(unread.map(m => supabase.from("contact_messages").update({ status: "read" }).eq("id", m.id)));
    notify("success", `${unread.length} messages marked as read`); fetchAll();
  };

  const copyEmails = (list: { email: string }[]) => {
    const emails = list.map(u => u.email).filter(Boolean).join(", ");
    navigator.clipboard.writeText(emails);
    notify("success", `${list.length} emails copied to clipboard`);
  };

  const sendBroadcast = async () => {
    if (!bcSubject.trim() || !bcBody.trim() || bcSending) return;
    setBcSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { type: "broadcast", subject: bcSubject, body: bcBody, recipients: bcRecipients, email_type: bcType },
      });
      if (error) notify("error", error.message);
      else if (data?.error) notify("error", data.error);
      else notify("success", `Email sent to ${data?.sent ?? 0} recipient${data?.sent === 1 ? "" : "s"}`);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Failed to send broadcast");
    } finally {
      setBcSending(false);
    }
  };

  const openReplyDialog = (msg: ContactMsg) => {
    setReplyMsg(msg);
    setReplyText("");
  };

  const sendMessageReply = async () => {
    if (!replyMsg || !replyText.trim() || replySending) return;
    setReplySending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { type: "reply", message_id: replyMsg.id, reply_body: replyText },
      });
      if (error) notify("error", error.message);
      else if (data?.error) notify("error", data.error);
      else {
        notify("success", "Reply sent successfully");
        setReplyMsg(null);
        setReplyText("");
        setMessages(prev => prev.map(m => m.id === replyMsg.id ? { ...m, status: "replied" } : m));
        fetchAll();
      }
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Failed to send reply");
    } finally {
      setReplySending(false);
    }
  };

  const openEnterpriseReplyDialog = (req: EnterpriseReq) => {
    setReplyEntReq(req);
    setReplyEntText(`Dear ${req.contact_name},\n\nThank you for your interest in Flavor Experts enterprise services.\n\n`);
  };

  const sendEnterpriseReply = async () => {
    if (!replyEntReq || !replyEntText.trim() || replyEntSending) return;
    setReplyEntSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          type: "custom",
          to: replyEntReq.email,
          subject: `Re: Enterprise — ${replyEntReq.company_name}`,
          text: replyEntText,
        },
      });
      if (error) notify("error", error.message);
      else if (data?.error) notify("error", data.error);
      else {
        notify("success", "Reply sent successfully");
        await supabase.from("enterprise_requests").update({ status: "contacted" }).eq("id", replyEntReq.id);
        setReplyEntReq(null);
        setReplyEntText("");
        fetchAll();
      }
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Failed to send reply");
    } finally {
      setReplyEntSending(false);
    }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (loading || fetchLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <p className="text-lg font-bold text-foreground mb-1">جارٍ التحميل...</p>
          <p className="text-sm text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // ── Unauthorized screen ────────────────────────────────────────────────────
  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm w-full">
          <div className="w-24 h-24 rounded-3xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Lock className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">غير مصرح لك</h1>
          <p className="text-muted-foreground mb-1 text-sm">هذه الصفحة مخصصة للمدير الأساسي فقط.</p>
          <p className="text-muted-foreground mb-8 text-sm">This page is restricted to the primary administrator only.</p>
          <Link to="/"><Button className="gap-2 w-full" size="lg"><ArrowLeft className="w-4 h-4" /> العودة للموقع</Button></Link>
        </div>
      </div>
    );
  }

  // ── Constants ──────────────────────────────────────────────────────────────
  const NEWS_CATEGORIES = ["Innovation", "Sustainability", "Market Trends", "Regulatory", "Events", "Research"];
  const RES_TYPES = ["Article", "Guide", "Webinar", "Research Paper", "Whitepaper", "Course", "Certification", "Case Study", "Recipe", "Formula", "Video"];
  const RES_CATEGORIES = ["Flavor Science", "Sensory Science", "Regulatory", "Technology", "Quality & Safety", "Beverages", "Food Technology", "Formulation", "Nutrition"];
  const TIERS = ["free", "professional", "enterprise"];

  const statusColor: Record<string, string> = {
    new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    read: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    replied: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    archived: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    contacted: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    converted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  const tierColor: Record<string, string> = {
    free: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    professional: "bg-primary/10 text-primary",
    enterprise: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  const filteredNews = news.filter(n => !searchNews || n.title.toLowerCase().includes(searchNews.toLowerCase()) || n.summary?.toLowerCase().includes(searchNews.toLowerCase()));
  const filteredResources = resources.filter(r => !searchResources || r.title.toLowerCase().includes(searchResources.toLowerCase()) || r.type.toLowerCase().includes(searchResources.toLowerCase()));
  const filteredMembers = members.filter(m => !searchMembers || m.full_name.toLowerCase().includes(searchMembers.toLowerCase()) || m.role?.toLowerCase().includes(searchMembers.toLowerCase()));
  const filteredUsers = users.filter(u => !searchUsers || u.email.toLowerCase().includes(searchUsers.toLowerCase()) || u.full_name?.toLowerCase().includes(searchUsers.toLowerCase()));
  const filteredMessages = messages.filter(m => msgFilter === "all" || m.status === msgFilter);

  const recentActivity = [
    ...news.slice(0, 4).map(n => ({ type: "news", title: n.title, time: n.published_at, status: n.is_published ? "published" : "draft" })),
    ...messages.slice(0, 3).map(m => ({ type: "message", title: `Message from ${m.name}`, time: m.created_at, status: m.status })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 7);

  // ── Translations ────────────────────────────────────────────────────────────
  const isAR = lang === "ar";
  const T = {
    title:              isAR ? "لوحة تحكم المدير" : "Admin Control Panel",
    welcome:            isAR ? "مرحباً" : "Welcome",
    fullControl:        isAR ? "تحكم كامل بالمنصة" : "Full platform control",
    refresh:            isAR ? "تحديث" : "Refresh",
    dashboard:          isAR ? "لوحة التحكم" : "Dashboard",
    backToSite:         isAR ? "العودة للموقع" : "Back to Site",
    tabOverview:        isAR ? "نظرة عامة" : "Overview",
    tabNews:            isAR ? "الأخبار" : "News",
    tabResources:       isAR ? "الموارد" : "Resources",
    tabMembers:         isAR ? "الأعضاء" : "Members",
    tabUsers:           isAR ? "المستخدمون" : "Users",
    tabMessages:        isAR ? "الرسائل" : "Messages",
    tabEnterprise:      isAR ? "المؤسسات" : "Enterprise",
    tabSettings:        isAR ? "الإعدادات" : "Settings",
    tabBroadcast:       isAR ? "البث" : "Broadcast",
    tabModeration:      isAR ? "الإشراف" : "Moderation",
    tabCourses:         isAR ? "الدورات" : "Courses",
    tabConsultations:   isAR ? "الاستشارات" : "Consultations",
    tabForum:           isAR ? "أقسام المنتدى" : "Forum",
    analytics:          isAR ? "تحليلات المنصة" : "Platform analytics",
    publish:            isAR ? "نشر" : "Publish",
    add:                isAR ? "إضافة" : "Add",
    addMember:          isAR ? "إضافة عضو" : "Add Member",
    search:             isAR ? "بحث..." : "Search...",
    save:               isAR ? "حفظ" : "Save",
    cancel:             isAR ? "إلغاء" : "Cancel",
    copyEmails:         isAR ? "نسخ الإيميلات" : "Copy Emails",
    markAllRead:        isAR ? "تعليم الكل مقروء" : "Mark All Read",
    sendEmail:          isAR ? "إرسال البريد" : "Send Email",
    previewBtn:         isAR ? "معاينة" : "Preview",
    hide:               isAR ? "إخفاء" : "Hide",
    reply:              isAR ? "رد" : "Reply",
    totalUsers:         isAR ? "إجمالي المستخدمين" : "Total Users",
    newsArticles:       isAR ? "مقالات الأخبار" : "News Articles",
    resourcesLabel:     isAR ? "الموارد" : "Resources",
    membersLabel:       isAR ? "الأعضاء" : "Members",
    messagesLabel:      isAR ? "الرسائل" : "Messages",
    enterpriseLabel:    isAR ? "المؤسسات" : "Enterprise",
    publishedLabel:     isAR ? "منشور" : "Published",
    quickPublish:       isAR ? "نشر سريع" : "Quick Publish",
    recentActivity:     isAR ? "النشاط الأخير" : "Recent Activity",
    platformSummary:    isAR ? "ملخص المنصة" : "Platform Summary",
    publishedArticles:  isAR ? "مقالات منشورة" : "Published Articles",
    activeResources:    isAR ? "موارد نشطة" : "Active Resources",
    premiumMembers:     isAR ? "أعضاء نشطون" : "Active Members",
    featuredExperts:    isAR ? "خبراء مميزون" : "Featured Experts",
    noActivity:         isAR ? "لا يوجد نشاط حديث" : "No recent activity",
    noArticles:         isAR ? "لا توجد مقالات." : "No articles found.",
    noResources:        isAR ? "لا توجد موارد." : "No resources found.",
    noMembers:          isAR ? "لا يوجد أعضاء." : "No members found.",
    noUsers:            isAR ? "لا يوجد مستخدمون." : "No users found.",
    noMessages:         isAR ? "لا توجد رسائل." : "No messages yet.",
    noEnterprise:       isAR ? "لا توجد طلبات مؤسسية." : "No enterprise requests yet.",
    publishFirst:       isAR ? "انشر أول مقال" : "Publish First Article",
    addFirstResource:   isAR ? "أضف أول مورد" : "Add First Resource",
    addFirstMember:     isAR ? "أضف أول عضو" : "Add First Member",
    publishNews:        isAR ? "📰 نشر مقال إخباري" : "📰 Publish News Article",
    addResource:        isAR ? "📚 إضافة مورد / بحث" : "📚 Add Resource / Research",
    publishRecipe:      isAR ? "🍶 نشر وصفة / صيغة" : "🍶 Publish Recipe / Formula",
    addNewMember:       isAR ? "👤 إضافة عضو جديد" : "👤 Add New Member",
    makeAdmin:          isAR ? "تعيين مدير" : "Make Admin",
    revokeAdmin:        isAR ? "سحب صلاحية الإدارة" : "Revoke Admin",
    grantPreview:       isAR ? "منح معاينة" : "Grant Preview",
    revokePreview:      isAR ? "سحب المعاينة" : "Revoke Preview",
    previewAccess:      isAR ? "معاينة" : "Preview",
  };

  return (
    <div className="min-h-screen bg-background" dir={isAR ? "rtl" : "ltr"}>
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 mb-8">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25 flex-shrink-0">
                  <Shield className="w-7 h-7 text-primary-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-2xl font-bold text-foreground">{T.title}</h1>
                    <Badge className="bg-amber-100 text-amber-700 border-0 gap-1 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                      <Crown className="w-3 h-3" /> Super Admin
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {T.welcome},{" "}
                    <span className="font-semibold text-foreground">{profile?.full_name}</span>
                    {" — "}{T.fullControl}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{profile?.email}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* Language Toggle */}
                <button
                  onClick={() => setLang(l => l === "ar" ? "en" : "ar")}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background text-sm font-semibold hover:bg-muted transition-colors"
                  title="Toggle language / تغيير اللغة"
                >
                  <Globe className="w-4 h-4 text-primary" />
                  {lang === "ar" ? "EN" : "عربي"}
                </button>
                <Button variant="outline" size="sm" onClick={fetchAll} className="gap-2 h-9">
                  <RefreshCw className="w-4 h-4" /> {T.refresh}
                </Button>
                <Link to="/dashboard">
                  <Button variant="outline" size="sm" className="gap-2 h-9">
                    <LayoutDashboard className="w-4 h-4" /> {T.dashboard}
                  </Button>
                </Link>
                <Link to="/">
                  <Button variant="ghost" size="sm" className="gap-2 h-9">
                    <ArrowLeft className="w-4 h-4" /> {T.backToSite}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* ── Stats Grid ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
            <StatsCard icon={Users} label={T.totalUsers} value={stats.users} color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" />
            <StatsCard icon={Newspaper} label={T.newsArticles} value={stats.news} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
            <StatsCard icon={BookOpen} label={T.resourcesLabel} value={stats.resources} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
            <StatsCard icon={FlaskConical} label={T.membersLabel} value={stats.members} color="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" />
            <StatsCard icon={MessageSquare} label={T.messagesLabel} value={stats.messages} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" badge={stats.newMessages} />
            <StatsCard icon={Building2} label={T.enterpriseLabel} value={stats.enterprise} color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" badge={stats.newEnterprise} />
            <StatsCard icon={Zap} label={T.publishedLabel} value={news.filter(n => n.is_published).length + resources.filter(r => r.is_published).length} color="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" />
          </div>

          {/* ── Tabs ────────────────────────────────────────────────────────── */}
          <Tabs defaultValue="overview">
            <TabsList className="mb-6 flex flex-wrap gap-1 h-auto bg-muted/60 p-1 rounded-xl w-full">
              <TabsTrigger value="overview" className="gap-1.5 rounded-lg text-xs sm:text-sm">
                <LayoutDashboard className="w-3.5 h-3.5" /> {T.tabOverview}
              </TabsTrigger>
              <TabsTrigger value="news" className="gap-1.5 rounded-lg text-xs sm:text-sm">
                <Newspaper className="w-3.5 h-3.5" /> {T.tabNews}
              </TabsTrigger>
              <TabsTrigger value="resources" className="gap-1.5 rounded-lg text-xs sm:text-sm">
                <BookOpen className="w-3.5 h-3.5" /> {T.tabResources}
              </TabsTrigger>
              <TabsTrigger value="members" className="gap-1.5 rounded-lg text-xs sm:text-sm">
                <FlaskConical className="w-3.5 h-3.5" /> {T.tabMembers}
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-1.5 rounded-lg text-xs sm:text-sm">
                <UserCheck className="w-3.5 h-3.5" /> {T.tabUsers}
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-1.5 rounded-lg text-xs sm:text-sm">
                <MessageSquare className="w-3.5 h-3.5" /> {T.tabMessages}
                {stats.newMessages > 0 && <Badge className="bg-red-500 text-white text-xs px-1.5 py-0 h-4 ml-1">{stats.newMessages}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="enterprise" className="gap-1.5 rounded-lg text-xs sm:text-sm">
                <Building2 className="w-3.5 h-3.5" /> {T.tabEnterprise}
                {stats.newEnterprise > 0 && <Badge className="bg-purple-500 text-white text-xs px-1.5 py-0 h-4 ml-1">{stats.newEnterprise}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5 rounded-lg text-xs sm:text-sm">
                <Settings className="w-3.5 h-3.5" /> {T.tabSettings}
              </TabsTrigger>
              <TabsTrigger value="broadcast" className="gap-1.5 rounded-lg text-xs sm:text-sm">
                <Mail className="w-3.5 h-3.5" /> {T.tabBroadcast}
              </TabsTrigger>
              <TabsTrigger value="moderation" className="gap-1.5 rounded-lg text-xs sm:text-sm">
                <Shield className="w-3.5 h-3.5" /> {T.tabModeration}
              </TabsTrigger>
              <TabsTrigger value="courses" className="gap-1.5 rounded-lg text-xs sm:text-sm">
                <BookOpen className="w-3.5 h-3.5" /> {T.tabCourses}
              </TabsTrigger>
              <TabsTrigger value="consultations" className="gap-1.5 rounded-lg text-xs sm:text-sm">
                <MessageSquare className="w-3.5 h-3.5" /> {T.tabConsultations}
              </TabsTrigger>
              <TabsTrigger value="forum" className="gap-1.5 rounded-lg text-xs sm:text-sm">
                <Radio className="w-3.5 h-3.5" /> {T.tabForum}
              </TabsTrigger>
            </TabsList>

            {/* ══ OVERVIEW ══════════════════════════════════════════════════ */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <Card className="border border-border">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-primary" /> {T.quickPublish}
                    </h3>
                    <div className="space-y-2">
                      {[
                        { label: T.publishNews, action: openAddNews, color: "text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40" },
                        { label: T.addResource, action: openAddResource, color: "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40" },
                        { label: T.publishRecipe, action: () => { setEditingResource(null); setResourceForm({ title: "", description: "", type: "Recipe", link: "", category: "Formulation", image_url: "", pdf_url: "", premium: false, is_published: true }); setResourceUploadKey(k => k + 1); setResourceDialog(true); }, color: "text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40" },
                        { label: T.addNewMember, action: openAddMember, color: "text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40" },
                      ].map(q => (
                        <button key={q.label} onClick={q.action} className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-sm font-medium ${q.color}`}>
                          <span>{q.label}</span>
                          <ChevronRight className="w-4 h-4 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="border border-border lg:col-span-2">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-sm">
                      <Activity className="w-4 h-4 text-primary" /> {T.recentActivity}
                    </h3>
                    <div className="space-y-3">
                      {recentActivity.map((a, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.type === "news" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30" : "bg-amber-100 text-amber-600 dark:bg-amber-900/30"}`}>
                            {a.type === "news" ? <Newspaper className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                            <p className="text-xs text-muted-foreground">{new Date(a.time).toLocaleDateString()}</p>
                          </div>
                          <Badge className={`text-xs flex-shrink-0 ${statusColor[a.status] || "bg-gray-100 text-gray-600"}`}>{a.status}</Badge>
                        </div>
                      ))}
                      {recentActivity.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{T.noActivity}</p>}
                    </div>
                  </CardContent>
                </Card>

                {/* Platform analytics */}
                <Card className="border border-border lg:col-span-3">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-sm">
                      <Activity className="w-4 h-4 text-primary" /> {T.analytics}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                      {[
                        { label: isAR ? "وظائف" : "Jobs", value: stats.jobs, max: Math.max(stats.jobs, stats.posts, stats.topics, stats.connections, 1) },
                        { label: isAR ? "منشورات" : "Posts", value: stats.posts, max: Math.max(stats.jobs, stats.posts, stats.topics, stats.connections, 1) },
                        { label: isAR ? "مواضيع" : "Topics", value: stats.topics, max: Math.max(stats.jobs, stats.posts, stats.topics, stats.connections, 1) },
                        { label: isAR ? "تواصلات" : "Connections", value: stats.connections, max: Math.max(stats.jobs, stats.posts, stats.topics, stats.connections, 1) },
                      ].map((row) => (
                        <div key={row.label} className="rounded-xl bg-secondary/40 p-3">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-muted-foreground">{row.label}</span>
                            <span className="font-semibold">{row.value}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${Math.max(8, Math.round((row.value / row.max) * 100))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4 text-primary" /> {T.platformSummary}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { value: news.filter(n => n.is_published).length, label: T.publishedArticles, color: "bg-blue-50 dark:bg-blue-900/20" },
                        { value: resources.filter(r => r.is_published).length, label: T.activeResources, color: "bg-emerald-50 dark:bg-emerald-900/20" },
                        { value: users.length, label: T.premiumMembers, color: "bg-primary/5" },
                        { value: members.filter(m => m.is_featured).length, label: T.featuredExperts, color: "bg-amber-50 dark:bg-amber-900/20" },
                      ].map(s => (
                        <div key={s.label} className={`text-center p-4 rounded-xl ${s.color}`}>
                          <p className="text-2xl font-bold text-foreground">{s.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ══ NEWS ══════════════════════════════════════════════════════ */}
            <TabsContent value="news">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-base font-semibold text-foreground">{isAR ? "الأخبار" : "Industry News"} ({filteredNews.length})</h2>
                <div className="flex items-center gap-2 flex-1 max-w-sm justify-end">
                  <div className="relative flex-1 max-w-48">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                    <Input value={searchNews} onChange={e => setSearchNews(e.target.value)} placeholder={T.search} className="pl-8 h-9 text-sm" />
                  </div>
                  <Button size="sm" onClick={openAddNews} className="gap-2 flex-shrink-0">
                    <Plus className="w-4 h-4" /> {T.publish}
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {filteredNews.map(item => (
                  <Card key={item.id} className="border border-border hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-start gap-4">
                      {item.image_url && (
                        <img src={item.image_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0 hidden sm:block" onError={e => (e.currentTarget.style.display = "none")} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          <Badge className={`text-xs ${item.is_published ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800"}`}>
                            {item.is_published ? "● Published" : "○ Draft"}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.summary}</p>
                        <p className="text-xs text-muted-foreground mt-1">By {item.author} · {new Date(item.published_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleNewsPublished(item)} title={item.is_published ? "Unpublish" : "Publish"}>
                          {item.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-emerald-500" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openEditNews(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteNews(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredNews.length === 0 && (
                  <div className="text-center py-16">
                    <Newspaper className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">{T.noArticles}</p>
                    <Button size="sm" variant="outline" onClick={openAddNews} className="mt-3 gap-2"><Plus className="w-4 h-4" /> {T.publishFirst}</Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ══ RESOURCES ═════════════════════════════════════════════════ */}
            <TabsContent value="resources">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-base font-semibold text-foreground">{isAR ? "الموارد والبحوث" : "Resources & Research"} ({filteredResources.length})</h2>
                <div className="flex items-center gap-2 flex-1 max-w-sm justify-end">
                  <div className="relative flex-1 max-w-48">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                    <Input value={searchResources} onChange={e => setSearchResources(e.target.value)} placeholder={T.search} className="pl-8 h-9 text-sm" />
                  </div>
                  <Button size="sm" onClick={openAddResource} className="gap-2 flex-shrink-0">
                    <Plus className="w-4 h-4" /> {T.add}
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {filteredResources.map(item => (
                  <Card key={item.id} className="border border-border hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-start gap-4">
                      {item.image_url && (
                        <img src={item.image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0 hidden sm:block" onError={e => (e.currentTarget.style.display = "none")} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">{item.type}</Badge>
                          <Badge variant="outline" className="text-xs">{item.category}</Badge>
                          {item.premium && <Badge className="text-xs bg-primary/10 text-primary"><Crown className="w-3 h-3 mr-0.5" />{PLATFORM_ALWAYS_FREE ? "Members" : "Premium"}</Badge>}
                          <Badge className={`text-xs ${item.is_published ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800"}`}>
                            {item.is_published ? "● Published" : "○ Draft"}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleResourcePublished(item)}>
                          {item.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-emerald-500" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openEditResource(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteResource(item.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredResources.length === 0 && (
                  <div className="text-center py-16">
                    <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">{T.noResources}</p>
                    <Button size="sm" variant="outline" onClick={openAddResource} className="mt-3 gap-2"><Plus className="w-4 h-4" /> {T.addFirstResource}</Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ══ MEMBERS ═══════════════════════════════════════════════════ */}
            <TabsContent value="members">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-base font-semibold text-foreground">{isAR ? "دليل الأعضاء" : "Members Directory"} ({filteredMembers.length})</h2>
                <div className="flex items-center gap-2 flex-1 max-w-sm justify-end">
                  <div className="relative flex-1 max-w-48">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                    <Input value={searchMembers} onChange={e => setSearchMembers(e.target.value)} placeholder={T.search} className="pl-8 h-9 text-sm" />
                  </div>
                  <Button size="sm" onClick={openAddMember} className="gap-2 flex-shrink-0">
                    <Plus className="w-4 h-4" /> {T.addMember}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredMembers.map(m => (
                  <Card key={m.id} className="border border-border hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-3">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt={m.full_name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" onError={e => { (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.full_name)}&background=random`; }} />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-lg">
                          {m.full_name[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <p className="font-semibold text-sm text-foreground">{m.full_name}</p>
                          {m.is_featured && <Badge className="bg-amber-100 text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-400 px-1.5"><Star className="w-3 h-3 inline mr-0.5" />Featured</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{m.role}</p>
                        {m.specialty && <p className="text-xs text-muted-foreground">{m.specialty}</p>}
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleMemberFeatured(m)} title={m.is_featured ? "Remove featured" : "Mark featured"}>
                          <Star className={`w-3.5 h-3.5 ${m.is_featured ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => openEditMember(m)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMember(m.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredMembers.length === 0 && (
                  <div className="text-center py-16 col-span-2">
                    <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">{T.noMembers}</p>
                    <Button size="sm" variant="outline" onClick={openAddMember} className="mt-3 gap-2"><Plus className="w-4 h-4" /> {T.addFirstMember}</Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ══ USERS ═════════════════════════════════════════════════════ */}
            <TabsContent value="users">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-base font-semibold text-foreground">{isAR ? "المستخدمون المسجلون" : "Registered Users"} ({filteredUsers.length})</h2>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <div className="relative w-48">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                    <Input value={searchUsers} onChange={e => setSearchUsers(e.target.value)} placeholder={T.search} className="pl-8 h-9 text-sm" />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copyEmails(filteredUsers)} className="gap-1.5 h-9 text-xs">
                    <Copy className="w-3.5 h-3.5" /> {T.copyEmails} ({filteredUsers.length})
                  </Button>
                </div>
              </div>
              {usersFetchError ? (
                <Card className="border border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800">
                  <CardContent className="p-5 flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-800 dark:text-amber-400 text-sm mb-2">Admin Policy Required</p>
                      <p className="text-sm text-amber-700 dark:text-amber-500 mb-3">{usersFetchError}</p>
                      <p className="text-xs text-muted-foreground mb-3">Run <strong>admin-policies.sql</strong> (in workspace root) in Supabase SQL Editor to unlock user management.</p>
                      <a href="https://supabase.com/dashboard/project/imucfofvdwfyexdwrsfe/sql" target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30">
                          <Settings className="w-4 h-4" /> Open Supabase SQL Editor
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map(u => (
                    <Card key={u.id} className="border border-border hover:shadow-sm transition-shadow">
                      <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-base">
                          {(u.full_name || u.email)[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="font-semibold text-sm text-foreground">{u.full_name || "Unnamed"}</p>
                            {u.is_admin && <Badge className="bg-primary/10 text-primary text-xs gap-1 px-1.5"><Shield className="w-3 h-3" />Admin</Badge>}
                            {u.platform_preview_access && (
                              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs gap-1 px-1.5">
                                <Eye className="w-3 h-3" />{T.previewAccess}
                              </Badge>
                            )}
                            {!PLATFORM_ALWAYS_FREE && (
                              <Badge className={`text-xs capitalize ${tierColor[u.subscription_tier] || "bg-gray-100 text-gray-600"}`}>
                                {u.subscription_tier === "professional" && <Crown className="w-3 h-3 mr-0.5 inline" />}
                                {u.subscription_tier === "enterprise" && <Star className="w-3 h-3 mr-0.5 inline" />}
                                {u.subscription_tier}
                              </Badge>
                            )}
                            {PLATFORM_ALWAYS_FREE && (
                              <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                Free
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <a href={`mailto:${u.email}`} className="hover:text-primary hover:underline transition-colors">{u.email}</a>
                            {" · "}Joined {new Date(u.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                          <a
                            href={`mailto:${u.email}`}
                            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors"
                            title="Send email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                          {!PLATFORM_ALWAYS_FREE && (
                          <Select value={u.subscription_tier} onValueChange={v => updateUserTier(u.id, v)} disabled={userTierLoading === u.id}>
                            <SelectTrigger className="w-36 h-8 text-xs">
                              {userTierLoading === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <SelectValue />}
                            </SelectTrigger>
                            <SelectContent>
                              {TIERS.map(t => <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className={`text-xs h-8 gap-1 ${u.platform_preview_access ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" : "border-emerald-300/40 text-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10"}`}
                            onClick={() => togglePreviewAccess(u)}
                          >
                            <Eye className="w-3 h-3" />
                            {u.platform_preview_access ? T.revokePreview : T.grantPreview}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`text-xs h-8 gap-1 ${u.is_admin ? "border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" : "border-primary/30 text-primary hover:bg-primary/5"}`}
                            onClick={() => toggleUserAdmin(u)}
                          >
                            <Shield className="w-3 h-3" />
                            {u.is_admin ? T.revokeAdmin : T.makeAdmin}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-16">
                      <UserCheck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">No users found.</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ══ MESSAGES ══════════════════════════════════════════════════ */}
            <TabsContent value="messages">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-base font-semibold text-foreground">Contact Messages ({filteredMessages.length})</h2>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {/* Filter chips */}
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                    {["all", "new", "read", "replied", "archived"].map(s => (
                      <button
                        key={s}
                        onClick={() => setMsgFilter(s)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${msgFilter === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {s}{s === "new" && stats.newMessages > 0 ? ` (${stats.newMessages})` : ""}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" onClick={markAllRead} className="gap-1.5 h-8 text-xs">
                    <CheckCheck className="w-3.5 h-3.5" /> {T.markAllRead}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copyEmails(messages)} className="gap-1.5 h-8 text-xs">
                    <Copy className="w-3.5 h-3.5" /> {T.copyEmails}
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {filteredMessages.map(msg => (
                  <Card key={msg.id} className={`border transition-all ${msg.status === "new" ? "border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-900/10" : "border-border"}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">{msg.name}</span>
                            <a href={`mailto:${msg.email}`} className="text-xs text-primary hover:underline">{msg.email}</a>
                            <Badge className={`text-xs ${statusColor[msg.status] || "bg-gray-100 text-gray-700"}`}>{msg.status}</Badge>
                          </div>
                          {msg.subject && <p className="text-xs font-medium text-foreground mb-1">📌 {msg.subject}</p>}
                          <p className={`text-sm text-muted-foreground whitespace-pre-wrap ${expandedMsg === msg.id ? "" : "line-clamp-3"}`}>{msg.message}</p>
                          {msg.message.length > 200 && (
                            <button onClick={() => setExpandedMsg(expandedMsg === msg.id ? null : msg.id)} className="text-xs text-primary hover:underline mt-1">
                              {expandedMsg === msg.id ? "Show less ▲" : "Read full message ▼"}
                            </button>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">{new Date(msg.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs bg-primary/10 text-primary hover:bg-primary/20 border-0"
                              onClick={() => openReplyDialog(msg)}
                            >
                              <Mail className="w-3.5 h-3.5" /> Reply
                            </Button>
                            <Select value={msg.status} onValueChange={v => updateMessageStatus(msg.id, v)}>
                              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["new", "read", "replied", "archived"].map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMessage(msg.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <a
                            href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject || "Your message to Flavor Experts")}&body=Dear ${encodeURIComponent(msg.name)},%0A%0A`}
                            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> Open in mail app
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredMessages.length === 0 && (
                  <div className="text-center py-16">
                    <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">{msgFilter === "all" ? "No messages yet." : `No ${msgFilter} messages.`}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ══ ENTERPRISE ════════════════════════════════════════════════ */}
            <TabsContent value="enterprise">
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-base font-semibold text-foreground">Enterprise Requests ({enterprise.length})</h2>
                <Button size="sm" variant="outline" onClick={() => copyEmails(enterprise.map(e => ({ email: e.email })))} className="gap-1.5 h-8 text-xs">
                  <Copy className="w-3.5 h-3.5" /> Copy Emails
                </Button>
              </div>
              <div className="space-y-3">
                {enterprise.map(req => (
                  <Card key={req.id} className={`border transition-all ${req.status === "new" ? "border-purple-200 bg-purple-50/20 dark:border-purple-800 dark:bg-purple-900/10" : "border-border"}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-sm text-foreground">{req.company_name}</span>
                            <Badge className={`text-xs ${statusColor[req.status] || "bg-gray-100 text-gray-700"}`}>{req.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            👤 {req.contact_name} ·{" "}
                            <a href={`mailto:${req.email}`} className="text-primary hover:underline">{req.email}</a>
                            {req.phone ? ` · 📞 ${req.phone}` : ""}
                          </p>
                          {req.services_interested && <p className="text-xs font-medium text-foreground mt-1">🔧 {req.services_interested}</p>}
                          {req.message && (
                            <>
                              <p className={`text-sm text-muted-foreground mt-1 whitespace-pre-wrap ${expandedReq === req.id ? "" : "line-clamp-2"}`}>{req.message}</p>
                              {req.message.length > 150 && (
                                <button onClick={() => setExpandedReq(expandedReq === req.id ? null : req.id)} className="text-xs text-primary hover:underline mt-0.5">
                                  {expandedReq === req.id ? "Show less ▲" : "Read more ▼"}
                                </button>
                              )}
                            </>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(req.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5 text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 border-0"
                              onClick={() => openEnterpriseReplyDialog(req)}
                            >
                              <Mail className="w-3.5 h-3.5" /> Reply
                            </Button>
                            <Select value={req.status} onValueChange={v => updateEnterpriseStatus(req.id, v)}>
                              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["new", "contacted", "converted", "rejected"].map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteEnterprise(req.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <a
                            href={`mailto:${req.email}?subject=Re: Enterprise Services Inquiry - ${encodeURIComponent(req.company_name)}&body=Dear ${encodeURIComponent(req.contact_name)},%0A%0A`}
                            className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> Open in mail app
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {enterprise.length === 0 && (
                  <div className="text-center py-16">
                    <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No enterprise requests yet.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ══ SETTINGS ══════════════════════════════════════════════════ */}
            <TabsContent value="settings">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Platform Info */}
                <Card className="border border-border">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-primary" /> Platform Overview
                    </h3>
                    <div className="space-y-3">
                      {[
                        { label: "Platform Name", value: "Flavor Experts Network" },
                        { label: "Admin Email", value: SITE.supportEmail },
                        { label: "Supabase Project", value: "imucfofvdwfyexdwrsfe" },
                        { label: "Total Content Items", value: String(stats.news + stats.resources) },
                        { label: "Active Users", value: String(stats.users) },
                        { label: "New Leads (unread)", value: String(stats.newMessages + stats.newEnterprise) },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <span className="text-sm text-muted-foreground">{item.label}</span>
                          <span className="text-sm font-medium text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Links */}
                <Card className="border border-border">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-primary" /> Quick Admin Links
                    </h3>
                    <div className="space-y-2">
                      {[
                        { label: "Supabase Dashboard", url: "https://supabase.com/dashboard/project/imucfofvdwfyexdwrsfe", color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" },
                        { label: "Database Tables", url: "https://supabase.com/dashboard/project/imucfofvdwfyexdwrsfe/editor", color: "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800" },
                        { label: "Auth Providers (LinkedIn setup)", url: "https://supabase.com/dashboard/project/imucfofvdwfyexdwrsfe/auth/providers", color: "bg-[#0077b5]/10 text-[#0077b5] hover:bg-[#0077b5]/20 dark:text-[#38bdf8] border border-[#0077b5]/30" },
                        { label: "Storage Buckets", url: "https://supabase.com/dashboard/project/imucfofvdwfyexdwrsfe/storage/buckets", color: "bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 border border-purple-200 dark:border-purple-800" },
                        { label: "SQL Editor", url: "https://supabase.com/dashboard/project/imucfofvdwfyexdwrsfe/sql", color: "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-800" },
                        { label: "Auth Email Templates", url: "https://supabase.com/dashboard/project/imucfofvdwfyexdwrsfe/auth/templates", color: "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 border border-rose-200 dark:border-rose-800" },
                      ].map(link => (
                        <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                          className={`flex items-center justify-between p-3 rounded-xl text-sm font-medium transition-colors ${link.color}`}>
                          {link.label}
                          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* LinkedIn OAuth Setup Guide */}
                <Card className="border border-[#0077b5]/30 bg-[#0077b5]/5 dark:bg-[#0077b5]/10 lg:col-span-2">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#0077b5]" /> LinkedIn OAuth Setup Guide
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Google login uses the Supabase <code className="text-xs">oauth</code> edge function. LinkedIn sign-in is disabled for now.
                    </p>
                    <div className="space-y-3">
                      {[
                        { step: "1", title: "Create OAuth Apps", desc: "Google Cloud Console + LinkedIn Developers. Enable Sign In with LinkedIn (classic or OpenID). See deploy/OAUTH-SETUP.md.", url: "https://console.cloud.google.com/apis/credentials", urlLabel: "Google Credentials" },
                        { step: "2", title: "Add Redirect URL (both providers)", desc: "https://imucfofvdwfyexdwrsfe.supabase.co/functions/v1/oauth?action=callback" },
                        { step: "3", title: "Set Supabase Secrets", desc: "Copy deploy/oauth.env.example → deploy/oauth.env, fill keys, then run: node deploy/configure-oauth.mjs" },
                        { step: "4", title: "Deploy OAuth Function", desc: "npx supabase functions deploy oauth --project-ref imucfofvdwfyexdwrsfe", url: "https://supabase.com/dashboard/project/imucfofvdwfyexdwrsfe/functions", urlLabel: "Supabase Functions" },
                      ].map(s => (
                        <div key={s.step} className="flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-[#0077b5] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">{s.step}</div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{s.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                            {s.url && (
                              <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#0077b5] hover:underline mt-1">
                                <ExternalLink className="w-3 h-3" /> {s.urlLabel}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Database Info */}
                <Card className="border border-border lg:col-span-2">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Database className="w-4 h-4 text-primary" /> Database Summary
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {[
                        { table: "user_profiles", count: stats.users, icon: Users, color: "text-indigo-600" },
                        { table: "members", count: stats.members, icon: FlaskConical, color: "text-rose-600" },
                        { table: "industry_news", count: stats.news, icon: Newspaper, color: "text-blue-600" },
                        { table: "educational_resources", count: stats.resources, icon: BookOpen, color: "text-emerald-600" },
                        { table: "contact_messages", count: stats.messages, icon: MessageSquare, color: "text-amber-600" },
                        { table: "enterprise_requests", count: stats.enterprise, icon: Building2, color: "text-purple-600" },
                      ].map(t => (
                        <div key={t.table} className="text-center p-3 rounded-xl bg-secondary/30">
                          <t.icon className={`w-5 h-5 mx-auto mb-1.5 ${t.color}`} />
                          <p className="text-lg font-bold text-foreground">{t.count}</p>
                          <p className="text-xs text-muted-foreground leading-tight">{t.table.replace("_", " ")}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ══ BROADCAST ══════════════════════════════════════════════════ */}
            <TabsContent value="broadcast">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3 p-5 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Radio className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Email Broadcast Center</h2>
                    <p className="text-sm text-muted-foreground">Compose and send newsletters, announcements, or news updates to platform members.</p>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* ── Compose ── */}
                  <Card className="border-border/60">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Megaphone className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold text-foreground">Compose Message</h3>
                      </div>

                      {/* Type */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email Type</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { key: "newsletter", label: "Newsletter", icon: NewsIcon },
                            { key: "announcement", label: "Announcement", icon: Megaphone },
                            { key: "news", label: "News Update", icon: Radio },
                          ].map(({ key, label, icon: Ic }) => (
                            <button
                              key={key}
                              onClick={() => setBcType(key as typeof bcType)}
                              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-colors ${
                                bcType === key
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground hover:border-primary/40"
                              }`}
                            >
                              <Ic className="w-4 h-4" />
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Recipients */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recipients</Label>
                        <div className={`grid grid-cols-2 ${PLATFORM_ALWAYS_FREE ? "sm:grid-cols-2" : "sm:grid-cols-4"} gap-2`}>
                          {([
                            { key: "all", label: "All Users", icon: UsersIcon2 },
                            ...(!PLATFORM_ALWAYS_FREE
                              ? [
                                  { key: "professional", label: "Pro Only", icon: Crown },
                                  { key: "enterprise", label: "Enterprise", icon: Building2 },
                                ]
                              : []),
                            { key: "newsletter", label: "Newsletter", icon: Mail },
                          ] as const).map(({ key, label, icon: Ic }) => (
                            <button
                              key={key}
                              onClick={() => setBcRecipients(key as typeof bcRecipients)}
                              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-colors ${
                                bcRecipients === key
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground hover:border-primary/40"
                              }`}
                            >
                              <Ic className="w-4 h-4" />
                              {label}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {bcRecipients === "all"
                            ? `${stats.users} total users`
                            : bcRecipients === "professional"
                              ? "Professional subscribers"
                              : bcRecipients === "enterprise"
                                ? "Enterprise subscribers"
                                : `${stats.newsletterSubscribers} newsletter subscribers`}
                        </p>
                      </div>

                      {/* Subject */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject Line</Label>
                        <Input
                          value={bcSubject}
                          onChange={e => setBcSubject(e.target.value)}
                          placeholder={`e.g. "Flavor Experts Network — ${bcType === "newsletter" ? "Monthly Newsletter" : bcType === "announcement" ? "Important Announcement" : "Latest Industry News"}`}
                          className="h-10"
                        />
                      </div>

                      {/* Body */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email Body</Label>
                        <Textarea
                          value={bcBody}
                          onChange={e => setBcBody(e.target.value)}
                          placeholder={`Write your ${bcType} content here...\n\nYou can include:\n• Industry updates\n• Platform news\n• Event announcements\n• Research highlights`}
                          className="min-h-[180px] resize-y text-sm"
                        />
                        <p className="text-xs text-muted-foreground">{bcBody.length} characters</p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1 gap-2 text-sm"
                          onClick={() => setBcPreview(p => !p)}
                        >
                          <Eye className="w-4 h-4" /> {bcPreview ? "Hide" : "Preview"}
                        </Button>
                        <Button
                          className="flex-1 gap-2 text-sm bg-primary hover:bg-primary/90"
                          disabled={!bcSubject.trim() || !bcBody.trim() || bcSending}
                          onClick={sendBroadcast}
                        >
                          {bcSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {bcSending ? "Sending..." : "Send Email"}
                        </Button>
                      </div>

                      {(!bcSubject.trim() || !bcBody.trim()) && (
                        <p className="text-xs text-muted-foreground text-center">Fill in subject and body to enable sending.</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* ── Preview + Tips ── */}
                  <div className="space-y-4">
                    {/* Email Preview */}
                    {bcPreview && (
                      <Card className="border-primary/30">
                        <CardContent className="p-0 overflow-hidden rounded-xl">
                          {/* Email client simulation */}
                          <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 flex items-center gap-3 border-b border-border">
                            <div className="flex gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-red-400" />
                              <div className="w-3 h-3 rounded-full bg-amber-400" />
                              <div className="w-3 h-3 rounded-full bg-emerald-400" />
                            </div>
                            <span className="text-xs text-muted-foreground">Email Preview</span>
                          </div>
                          <div className="p-5 bg-white dark:bg-card">
                            {/* Header */}
                            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border">
                              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                                <FlaskConical className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="font-bold text-sm text-foreground">Flavor Experts Network</p>
                                <p className="text-xs text-muted-foreground">{SITE.supportEmail}</p>
                              </div>
                            </div>
                            {/* Subject */}
                            <p className="font-bold text-foreground mb-3 text-sm">
                              {bcSubject || <span className="text-muted-foreground italic">Subject line will appear here...</span>}
                            </p>
                            {/* Body */}
                            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                              {bcBody || <span className="italic">Email body will appear here...</span>}
                            </div>
                            {/* Footer */}
                            <div className="mt-5 pt-4 border-t border-border">
                              <p className="text-xs text-muted-foreground">───────────────────────</p>
                              <p className="text-xs text-muted-foreground mt-1">{SITE.name} · {SITE.supportEmail}</p>
                              <p className="text-xs text-muted-foreground">You received this because you're a member of Flavor Experts Network.</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Tips */}
                    <Card className="border-border/60">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="w-4 h-4 text-emerald-500" />
                          <h4 className="font-semibold text-sm text-foreground">Best Practices</h4>
                        </div>
                        <ul className="space-y-2 text-xs text-muted-foreground">
                          <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> Keep subject lines under 60 characters for best open rates</li>
                          <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> Personalize with a greeting and platform context</li>
                          <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> Include a clear call-to-action (CTA)</li>
                          <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /> Send newsletters on Tuesdays or Thursdays for peak open rates</li>
                          <li className="flex items-start gap-2"><AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" /> Emails are sent via Resend — no mail client required</li>
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Recipient summary */}
                    <Card className="border-border/60">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <UsersIcon2 className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm text-foreground">Recipient Summary</h4>
                        </div>
                        <div className="space-y-2">
                          {[
                            { label: "All Users", count: stats.users, color: "bg-primary/10 text-primary", active: bcRecipients === "all" },
                            ...(!PLATFORM_ALWAYS_FREE
                              ? [
                                  { label: "Professional", count: users.filter(u => u.subscription_tier === "professional").length, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30", active: bcRecipients === "professional" },
                                  { label: "Enterprise", count: users.filter(u => u.subscription_tier === "enterprise").length, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30", active: bcRecipients === "enterprise" },
                                ]
                              : []),
                            { label: "Newsletter", count: stats.newsletterSubscribers, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30", active: bcRecipients === "newsletter" },
                          ].map(r => (
                            <div key={r.label} className={`flex items-center justify-between p-2.5 rounded-lg ${r.active ? r.color : "bg-secondary/30"}`}>
                              <span className={`text-xs font-medium ${r.active ? "" : "text-muted-foreground"}`}>{r.label}</span>
                              <Badge className={`${r.active ? r.color : "bg-secondary text-muted-foreground"} text-xs`}>{r.count} recipients</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="moderation">
              <AdminModerationPanel />
            </TabsContent>

            <TabsContent value="courses">
              <AdminCoursesPanel />
            </TabsContent>

            <TabsContent value="consultations">
              <AdminConsultationsPanel />
            </TabsContent>

            <TabsContent value="forum">
              <AdminForumCategoriesPanel />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ══ News Dialog ════════════════════════════════════════════════════════ */}
      <Dialog open={newsDialog} onOpenChange={setNewsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-primary" />
              {editingNews ? "Edit Article" : "Publish News Article"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={newsForm.title} onChange={e => setNewsForm(p => ({ ...p, title: e.target.value }))} placeholder="Article title" />
            </div>
            <div className="space-y-1.5">
              <Label>Summary * <span className="text-muted-foreground font-normal">(shown in news cards)</span></Label>
              <Textarea value={newsForm.summary} onChange={e => setNewsForm(p => ({ ...p, summary: e.target.value }))} placeholder="Short summary..." rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Full Content</Label>
              <Textarea value={newsForm.content} onChange={e => setNewsForm(p => ({ ...p, content: e.target.value }))} placeholder="Full article content..." rows={6} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={newsForm.category} onValueChange={v => setNewsForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{NEWS_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Author</Label>
                <Input value={newsForm.author} onChange={e => setNewsForm(p => ({ ...p, author: e.target.value }))} />
              </div>
            </div>
            <FileUploader
              key={newsUploadKey}
              label="Cover Image"
              accept="image"
              bucket="platform-uploads"
              folder="news"
              currentUrl={newsForm.image_url}
              onUpload={url => setNewsForm(p => ({ ...p, image_url: url }))}
              maxSizeMB={8}
            />
            <div className="space-y-1.5">
              <Label>Source URL</Label>
              <Input value={newsForm.source_url} onChange={e => setNewsForm(p => ({ ...p, source_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <input type="checkbox" id="newsPublished" checked={newsForm.is_published} onChange={e => setNewsForm(p => ({ ...p, is_published: e.target.checked }))} className="h-4 w-4 rounded accent-primary" />
              <Label htmlFor="newsPublished" className="cursor-pointer">Published — visible on site immediately</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewsDialog(false)}>Cancel</Button>
            <Button onClick={saveNews} disabled={newsLoading} className="gap-2 min-w-[130px]">
              {newsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Newspaper className="w-4 h-4" />}
              {editingNews ? "Save Changes" : "Publish Article"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Resource Dialog ════════════════════════════════════════════════════ */}
      <Dialog open={resourceDialog} onOpenChange={setResourceDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              {editingResource ? "Edit Resource" : "Publish Resource / Research / Recipe"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={resourceForm.title} onChange={e => setResourceForm(p => ({ ...p, title: e.target.value }))} placeholder="Resource title" />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea value={resourceForm.description} onChange={e => setResourceForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe this resource..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={resourceForm.type} onValueChange={v => setResourceForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RES_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={resourceForm.category} onValueChange={v => setResourceForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RES_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Link / External URL <span className="text-muted-foreground font-normal text-xs">(optional — used if no PDF uploaded)</span></Label>
              <Input value={resourceForm.link} onChange={e => setResourceForm(p => ({ ...p, link: e.target.value }))} placeholder="https://..." />
            </div>
            <FileUploader
              key={resourceUploadKey}
              label="Cover Image"
              accept="image"
              bucket="platform-uploads"
              folder="resources"
              currentUrl={resourceForm.image_url}
              onUpload={url => setResourceForm(p => ({ ...p, image_url: url }))}
              maxSizeMB={8}
            />
            <FileUploader
              key={resourceUploadKey + 100}
              label="Attach PDF / Document"
              accept="pdf"
              bucket="platform-uploads"
              folder="documents"
              currentUrl={resourceForm.pdf_url}
              onUpload={url => setResourceForm(p => ({ ...p, pdf_url: url, link: url }))}
              maxSizeMB={50}
            />
            <div className="flex items-center gap-6 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="resPremium" checked={resourceForm.premium} onChange={e => setResourceForm(p => ({ ...p, premium: e.target.checked }))} className="h-4 w-4 rounded accent-amber-500" />
                <Label htmlFor="resPremium" className="cursor-pointer flex items-center gap-1"><Crown className="w-3.5 h-3.5 text-amber-500" />{PLATFORM_ALWAYS_FREE ? "Members library" : "Premium only"}</Label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="resPublished" checked={resourceForm.is_published} onChange={e => setResourceForm(p => ({ ...p, is_published: e.target.checked }))} className="h-4 w-4 rounded accent-primary" />
                <Label htmlFor="resPublished" className="cursor-pointer">Published</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResourceDialog(false)}>Cancel</Button>
            <Button onClick={saveResource} disabled={resourceLoading} className="gap-2 min-w-[130px]">
              {resourceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
              {editingResource ? "Save Changes" : "Publish Resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Member Dialog ══════════════════════════════════════════════════════ */}
      <Dialog open={memberDialog} onOpenChange={setMemberDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-rose-600" />
              {editingMember ? "Edit Member" : "Add New Member"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={memberForm.full_name} onChange={e => setMemberForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Dr. John Smith" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={memberForm.email} onChange={e => setMemberForm(p => ({ ...p, email: e.target.value }))} placeholder="john@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Role / Title</Label>
              <Input value={memberForm.role} onChange={e => setMemberForm(p => ({ ...p, role: e.target.value }))} placeholder="Flavor Scientist, Food Technologist..." />
            </div>
            <div className="space-y-1.5">
              <Label>Specialty</Label>
              <Input value={memberForm.specialty} onChange={e => setMemberForm(p => ({ ...p, specialty: e.target.value }))} placeholder="Sensory Science, Natural Flavors..." />
            </div>
            <div className="space-y-1.5">
              <Label>LinkedIn URL</Label>
              <Input value={memberForm.linkedin_url} onChange={e => setMemberForm(p => ({ ...p, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/..." />
            </div>
            <div className="flex flex-col items-center py-2">
              <AvatarUploader
                key={memberUploadKey}
                currentUrl={memberForm.avatar_url}
                name={memberForm.full_name || "Member"}
                bucket="platform-uploads"
                folder="avatars/members"
                onUpload={url => setMemberForm(p => ({ ...p, avatar_url: url }))}
                size="lg"
                label="Upload Photo"
              />
              <p className="text-xs text-muted-foreground mt-2">Click the circle to upload a photo (JPEG, PNG · max 5MB)</p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <input type="checkbox" id="memFeatured" checked={memberForm.is_featured} onChange={e => setMemberForm(p => ({ ...p, is_featured: e.target.checked }))} className="h-4 w-4 rounded accent-amber-500" />
              <Label htmlFor="memFeatured" className="cursor-pointer flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500" /> Featured member (shown prominently)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberDialog(false)}>Cancel</Button>
            <Button onClick={saveMember} disabled={memberLoading} className="gap-2 min-w-[120px]">
              {memberLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              {editingMember ? "Save Changes" : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Message Reply Dialog ═══════════════════════════════════════════════ */}
      <Dialog open={!!replyMsg} onOpenChange={open => { if (!open) { setReplyMsg(null); setReplyText(""); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Reply to {replyMsg?.name}
            </DialogTitle>
          </DialogHeader>
          {replyMsg && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">To: {replyMsg.email}</p>
                {replyMsg.subject && <p className="text-xs font-medium text-foreground">Subject: {replyMsg.subject}</p>}
                <p className="text-sm text-muted-foreground whitespace-pre-wrap border-t border-border pt-2 mt-2">{replyMsg.message}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Your reply</Label>
                <Textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder={`Dear ${replyMsg.name},\n\nThank you for contacting us...`}
                  className="min-h-[140px] resize-y"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setReplyMsg(null); setReplyText(""); }}>Cancel</Button>
            <Button onClick={sendMessageReply} disabled={replySending || !replyText.trim()} className="gap-2 min-w-[120px]">
              {replySending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {replySending ? "Sending..." : "Send Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ Enterprise Reply Dialog ══════════════════════════════════════════════ */}
      <Dialog open={!!replyEntReq} onOpenChange={open => { if (!open) { setReplyEntReq(null); setReplyEntText(""); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              Reply to {replyEntReq?.company_name}
            </DialogTitle>
          </DialogHeader>
          {replyEntReq && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">To: {replyEntReq.contact_name} &lt;{replyEntReq.email}&gt;</p>
                {replyEntReq.services_interested && <p className="text-xs font-medium text-foreground">Services: {replyEntReq.services_interested}</p>}
                {replyEntReq.message && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap border-t border-border pt-2 mt-2">{replyEntReq.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Your reply</Label>
                <Textarea
                  value={replyEntText}
                  onChange={e => setReplyEntText(e.target.value)}
                  placeholder="Write your enterprise reply..."
                  className="min-h-[140px] resize-y"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setReplyEntReq(null); setReplyEntText(""); }}>Cancel</Button>
            <Button onClick={sendEnterpriseReply} disabled={replyEntSending || !replyEntText.trim()} className="gap-2 min-w-[120px]">
              {replyEntSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {replyEntSending ? "Sending..." : "Send Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification */}
      {notification && <Notification type={notification.type} message={notification.message} onClose={() => setNotification(null)} />}
    </div>
  );
}