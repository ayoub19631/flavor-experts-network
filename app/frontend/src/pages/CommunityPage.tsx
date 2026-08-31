import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Bookmark,
  BookmarkCheck,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  MessageSquareText,
  Network,
  PenLine,
  Repeat2,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  EyeOff,
  MessageCircleOff,
  Pencil,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SeoJsonLd, { breadcrumbJsonLd } from "@/components/SeoJsonLd";
import FooterSection from "@/components/FooterSection";
import CommunityPostBody from "@/components/CommunityPostBody";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";
import {
  enrichComments,
  enrichSocialPosts,
  uploadCommunityImage,
} from "@/lib/social";
import { safeHttpUrl } from "@/lib/url";
import { SITE } from "@/lib/site-config";
import type { ReactionType, SocialPost, SocialPostComment } from "@/lib/types";
import { toast } from "sonner";
import { violatesEducationalPolicy } from "@/lib/content-policy";
import {
  extractHashtags,
  readingMinutes,
  shouldCollapsePost,
  truncatePost,
} from "@/lib/community-post";
import {
  REACTIONS,
  fetchMyReactions,
  fetchNetworkAuthorIds,
  fetchSavedPostIds,
  setPostReaction,
  setPostSaved,
} from "@/lib/network";

type FeedFilter = "latest" | "popular" | "mine" | "saved" | "network";

const MAX_POST_LENGTH = 5000;

function formatRelative(date: string, lang: string) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === "ar" ? "الآن" : "Just now";
  if (mins < 60) return lang === "ar" ? `منذ ${mins} د` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return lang === "ar" ? `منذ ${hours} س` : `${hours}h ago`;
  return d.toLocaleDateString(lang === "ar" ? "ar" : "en", {
    month: "short",
    day: "numeric",
  });
}

function initials(name?: string) {
  if (!name) return "FE";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function CommunityPage() {
  const { t, lang } = useI18n();
  const { user, profile, isAdmin } = useAuth();
  const { pathname, hash } = useLocation();
  const isHomeFeed = pathname === "/" || pathname === "/community";
  usePageMeta({ title: t("community.title"), description: t("community.desc"), path: "/community", locale: lang });

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, SocialPostComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [commentBusy, setCommentBusy] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Record<string, string | null>>({});
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("latest");
  const [search, setSearch] = useState("");
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [networkIds, setNetworkIds] = useState<string[]>([]);
  const [reactionMenu, setReactionMenu] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const quickTopics = [
    { tag: "#FlavorScience", label: t("community.topic.science") },
    { tag: "#Sensory", label: t("community.topic.sensory") },
    { tag: "#Innovation", label: t("community.topic.innovation") },
    { tag: "#Careers", label: t("community.topic.careers") },
  ];

  const contributorsCount = useMemo(
    () => new Set(posts.map((post) => post.author_id)).size,
    [posts],
  );

  const interactionCount = useMemo(
    () =>
      posts.reduce(
        (sum, post) => sum + (post.likes_count || 0) + (post.comments_count || 0),
        0,
      ),
    [posts],
  );

  const trendingTopics = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((post) => {
      new Set(extractHashtags(post.body)).forEach((tag) => {
        const normalized = tag.toLocaleLowerCase();
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
      });
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [posts]);

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const filtered = posts.filter((post) => {
      if (feedFilter === "mine" && post.author_id !== user?.id) return false;
      if (feedFilter === "saved" && !savedIds.includes(post.id)) return false;
      if (feedFilter === "network" && !networkIds.includes(post.author_id)) return false;
      if (!query) return true;
      const searchable = [
        post.body,
        post.author?.full_name,
        post.author?.role,
        post.author?.company,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      return searchable.includes(query);
    });

    if (feedFilter === "popular") {
      return [...filtered].sort(
        (a, b) =>
          (b.likes_count || 0) +
          (b.comments_count || 0) * 2 -
          ((a.likes_count || 0) + (a.comments_count || 0) * 2),
      );
    }
    return filtered;
  }, [feedFilter, networkIds, posts, savedIds, search, user?.id]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("social_posts")
      .select("*")
      .eq("is_published", true)
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error || !data) {
      setPosts([]);
      setLoading(false);
      return;
    }

    let enriched = await enrichSocialPosts(data as SocialPost[]);
    if (user) {
      const [reactions, saved, network] = await Promise.all([
        fetchMyReactions(user.id, enriched.map((p) => p.id)),
        fetchSavedPostIds(user.id),
        fetchNetworkAuthorIds(user.id),
      ]);
      enriched = enriched.map((p) => ({
        ...p,
        my_reaction: reactions.get(p.id) || null,
        liked_by_me: reactions.has(p.id),
      }));
      setSavedIds(saved);
      setNetworkIds(network);
    }
    setPosts(enriched);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (loading) return;
    const match = hash.match(/^#post-(.+)$/);
    if (!match?.[1]) return;
    const postId = match[1];
    setExpandedPosts((prev) => ({ ...prev, [postId]: true }));
    const node = document.getElementById(`post-${postId}`);
    if (node) {
      window.requestAnimationFrame(() => {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [loading, hash, posts.length]);

  const onPickImage = async (file?: File | null) => {
    if (!file || !user) return;
    setUploadingImage(true);
    const localPreview = URL.createObjectURL(file);
    setImagePreview(localPreview);
    const { url, error } = await uploadCommunityImage(file);
    setUploadingImage(false);
    if (error || !url) {
      toast.error(error || t("community.image_error"));
      setImagePreview(null);
      setImageUrl(null);
      return;
    }
    setImageUrl(url);
    toast.success(t("community.image_ready"));
  };

  const clearImage = () => {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageUrl(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const addTopic = (tag: string) => {
    setBody((current) => {
      if (current.toLocaleLowerCase().includes(tag.toLocaleLowerCase())) return current;
      const next = `${current.trim()}${current.trim() ? " " : ""}${tag} `;
      return next.slice(0, MAX_POST_LENGTH);
    });
  };

  const toggleExpanded = (postId: string) => {
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const toggleSaved = async (postId: string) => {
    if (!user) {
      toast.error(t("community.login_required"));
      return;
    }
    const saved = savedIds.includes(postId);
    setSavedIds((prev) => (saved ? prev.filter((id) => id !== postId) : [postId, ...prev]));
    const { error } = await setPostSaved(user.id, postId, !saved);
    if (error) {
      setSavedIds((prev) => (saved ? [postId, ...prev] : prev.filter((id) => id !== postId)));
      toast.error(error);
      return;
    }
    toast.success(!saved ? t("community.saved") : t("community.unsaved"));
  };

  const reactToPost = async (post: SocialPost, reaction: ReactionType) => {
    if (!user) {
      toast.error(t("community.login_required"));
      return;
    }
    const current = post.my_reaction || null;
    const removing = current === reaction;
    setReactionMenu(null);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              my_reaction: removing ? null : reaction,
              liked_by_me: !removing,
              likes_count: Math.max(0, p.likes_count + (current && !removing ? 0 : removing ? -1 : 1)),
            }
          : p,
      ),
    );
    const { error } = await setPostReaction(user.id, post.id, removing ? null : reaction, current);
    if (error) {
      toast.error(error);
      load();
    }
  };

  const repost = async (post: SocialPost) => {
    if (!user) {
      toast.error(t("community.login_required"));
      return;
    }
    const { error } = await supabase.from("social_posts").insert({
      author_id: user.id,
      body: lang === "ar" ? "أعاد النشر" : "Reposted",
      is_published: true,
      repost_of_id: post.repost_of_id || post.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("community.reposted"));
    load();
  };

  const copyPost = async (post: SocialPost) => {
    await navigator.clipboard.writeText(post.body);
    toast.success(t("community.copied"));
  };

  const publish = async () => {
    if (!user) {
      toast.error(t("community.login_required"));
      return;
    }
    const text = body.trim();
    if (text.length > MAX_POST_LENGTH) {
      toast.error(t("community.too_long"));
      return;
    }
    if (text.length < 3 && !imageUrl) {
      toast.error(t("community.min_length"));
      return;
    }
    if (uploadingImage) {
      toast.message(t("community.image_wait"));
      return;
    }
    if (violatesEducationalPolicy(text)) {
      toast.error(t("community.policy_blocked"));
      return;
    }
    setPublishing(true);
    const { error } = await supabase.from("social_posts").insert({
      author_id: user.id,
      body: text || (lang === "ar" ? "صورة" : "Photo"),
      image_url: imageUrl,
      is_published: true,
    });
    setPublishing(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
    clearImage();
    toast.success(t("community.published"));
    load();
  };

  const toggleLike = (post: SocialPost) => reactToPost(post, post.my_reaction || "like");

  const loadComments = async (postId: string) => {
    setCommentsLoading((p) => ({ ...p, [postId]: true }));
    const { data, error } = await supabase
      .from("social_post_comments")
      .select("*")
      .eq("post_id", postId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true })
      .limit(50);
    setCommentsLoading((p) => ({ ...p, [postId]: false }));
    if (error) {
      toast.error(error.message);
      return;
    }
    const enriched = await enrichComments((data as SocialPostComment[]) || []);
    setCommentsByPost((p) => ({ ...p, [postId]: enriched }));
  };

  const toggleComments = async (postId: string) => {
    const next = !openComments[postId];
    setOpenComments((p) => ({ ...p, [postId]: next }));
    if (next && !commentsByPost[postId]) {
      await loadComments(postId);
    }
  };

  const saveEdit = async (post: SocialPost) => {
    if (!user || post.author_id !== user.id) return;
    const next = editBody.trim();
    if (next.length < 1) return;
    if (violatesEducationalPolicy(next)) {
      toast.error(t("community.policy_blocked"));
      return;
    }
    setEditBusy(true);
    const { error } = await supabase
      .from("social_posts")
      .update({ body: next, updated_at: new Date().toISOString() })
      .eq("id", post.id)
      .eq("author_id", user.id);
    setEditBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPosts((prev) => prev.map((row) => (row.id === post.id ? { ...row, body: next } : row)));
    setEditingId(null);
    toast.success(t("community.updated"));
  };

  const toggleCommentsLock = async (post: SocialPost) => {
    if (!user || post.author_id !== user.id) return;
    const next = !post.comments_disabled;
    const { error } = await supabase
      .from("social_posts")
      .update({ comments_disabled: next })
      .eq("id", post.id)
      .eq("author_id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPosts((prev) => prev.map((row) => (row.id === post.id ? { ...row, comments_disabled: next } : row)));
    toast.success(next ? t("community.comments_disabled_toast") : t("community.comments_enabled_toast"));
  };

  const submitComment = async (postId: string) => {
    const target = posts.find((post) => post.id === postId);
    if (target?.comments_disabled) {
      toast.error(t("community.comments_disabled"));
      return;
    }
    if (!user) {
      toast.error(t("community.login_required"));
      return;
    }
    const text = (commentDrafts[postId] || "").trim();
    if (text.length < 1) return;
    if (violatesEducationalPolicy(text)) {
      toast.error(t("community.policy_blocked"));
      return;
    }
    setCommentBusy(postId);
    const { data, error } = await supabase
      .from("social_post_comments")
      .insert({
        post_id: postId,
        author_id: user.id,
        body: text,
        parent_comment_id: replyTo[postId] || null,
      })
      .select("*")
      .single();
    setCommentBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    const [enriched] = await enrichComments([data as SocialPostComment]);
    setCommentsByPost((p) => ({
      ...p,
      [postId]: [...(p[postId] || []), enriched],
    }));
    setCommentDrafts((p) => ({ ...p, [postId]: "" }));
    setReplyTo((p) => ({ ...p, [postId]: null }));
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, comments_count: (post.comments_count || 0) + 1 }
          : post,
      ),
    );
  };

  const removeComment = async (postId: string, commentId: string) => {
    if (!window.confirm(t("community.confirm_delete_comment"))) return;
    const { error } = await supabase.from("social_post_comments").delete().eq("id", commentId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCommentsByPost((p) => ({
      ...p,
      [postId]: (p[postId] || []).filter((c) => c.id !== commentId),
    }));
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, comments_count: Math.max(0, (post.comments_count || 1) - 1) }
          : post,
      ),
    );
  };

  const sharePost = async (post: SocialPost) => {
    const url = `${SITE.canonicalOrigin}/community#post-${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: SITE.name,
          text: post.body.slice(0, 140),
          url,
        });
        return;
      }
    } catch {
      /* user cancelled */
    }
    await navigator.clipboard.writeText(url);
    toast.success(t("community.share_copied"));
  };

  const removePost = async (post: SocialPost) => {
    if (!user || post.author_id !== user.id) return;
    if (!window.confirm(t("community.confirm_delete"))) return;
    const { error } = await supabase.from("social_posts").delete().eq("id", post.id).eq("author_id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    toast.success(t("community.deleted"));
  };

  const hidePost = async (post: SocialPost) => {
    if (!isAdmin) return;
    const { error } = await supabase
      .from("social_posts")
      .update({ is_hidden: true })
      .eq("id", post.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    toast.success(lang === "ar" ? "تم إخفاء المنشور" : "Post hidden");
  };

  return (
    <div className="min-h-screen bg-background">
      <SeoJsonLd
        data={breadcrumbJsonLd([
          { name: t("nav.home"), path: "/" },
          { name: t("community.title"), path: "/community" },
        ])}
      />
      <Navbar />
      <main className="pt-20 pb-16">
        <section className="border-b border-border bg-secondary/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {!isHomeFeed ? (
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-5"
              >
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                {t("general.back")}
              </Link>
            ) : (
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-5"
              >
                <Compass className="w-4 h-4" />
                {t("community.about_platform")}
              </Link>
            )}

            <div className="relative overflow-hidden rounded-3xl bg-[hsl(208_100%_14%)] text-white shadow-xl">
              <img
                src="/brand/section-community.webp"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover opacity-25"
              />
              <div className="absolute inset-0 bg-gradient-to-r rtl:bg-gradient-to-l from-[hsl(208_100%_10%/0.98)] via-[hsl(208_100%_12%/0.88)] to-[hsl(208_100%_15%/0.4)]" />
              <div className="relative p-6 sm:p-10 lg:p-12">
                <Badge className="bg-white/10 text-white border-white/15 mb-4 backdrop-blur">
                  <Sparkles className="w-3.5 h-3.5 me-1.5" />
                  {t("community.tag")}
                </Badge>
                <div className="max-w-2xl">
                  <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-3">
                    {t("community.title")}
                  </h1>
                  <p className="text-white/75 text-sm sm:text-lg leading-relaxed">
                    {t("community.desc")}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-8 max-w-2xl">
                  {[
                    { icon: MessageSquareText, value: posts.length, label: t("community.stats.posts") },
                    { icon: Users, value: contributorsCount, label: t("community.stats.contributors") },
                    { icon: BarChart3, value: interactionCount, label: t("community.stats.interactions") },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-3 sm:p-4"
                    >
                      <stat.icon className="w-4 h-4 text-[hsl(47_45%_78%)] mb-2" />
                      <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
                      <p className="text-[10px] sm:text-xs text-white/65 truncate">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
            <section className="min-w-0">

          {/* Composer */}
          <Card className="mb-6 border-primary/20 overflow-hidden shadow-sm">
            <div className="h-1 bg-gradient-to-r rtl:bg-gradient-to-l from-primary via-primary/50 to-transparent" />
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold shrink-0 overflow-hidden">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || t("community.member")}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials(profile?.full_name)
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {user ? profile?.full_name || user.email : t("community.guest_composer")}
                      </p>
                      {user && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t("community.composer_subtitle")}
                        </p>
                      )}
                    </div>
                    <PenLine className="w-5 h-5 text-primary/60" />
                  </div>
                  <Textarea
                    rows={4}
                    value={body}
                    onChange={(e) => setBody(e.target.value.slice(0, MAX_POST_LENGTH))}
                    maxLength={MAX_POST_LENGTH}
                    disabled={!user}
                    placeholder={t("community.composer_ph")}
                    className="resize-none min-h-28 border-border/80 focus-visible:ring-primary/30"
                  />

                  {user && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {quickTopics.map((topic) => (
                          <button
                            key={topic.tag}
                            type="button"
                            onClick={() => addTopic(topic.tag)}
                            className="rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                          >
                            {topic.label}
                          </button>
                        ))}
                      </div>
                      <span
                        className={`text-[11px] tabular-nums ${
                          body.length > MAX_POST_LENGTH * 0.9
                            ? "text-amber-600"
                            : "text-muted-foreground"
                        }`}
                      >
                        {body.length}/{MAX_POST_LENGTH}
                      </span>
                    </div>
                  )}

                  {(imagePreview || imageUrl) && (
                    <div className="relative rounded-xl overflow-hidden border border-border">
                      <img
                        src={imagePreview || imageUrl || ""}
                        alt=""
                        className="w-full max-h-80 object-cover"
                      />
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-white" />
                        </div>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="absolute top-2 end-2 h-8 w-8"
                        onClick={clearImage}
                        aria-label={t("community.remove_image")}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => onPickImage(e.target.files?.[0])}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={!user || uploadingImage}
                        onClick={() => fileRef.current?.click()}
                      >
                        {uploadingImage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ImagePlus className="w-4 h-4" />
                        )}
                        {t("community.add_image")}
                      </Button>
                      <p className="text-xs text-muted-foreground hidden md:block">
                        {user ? t("community.composer_hint") : t("community.login_required")}
                      </p>
                    </div>
                    {user ? (
                      <Button onClick={publish} disabled={publishing || uploadingImage} className="gap-2">
                        {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {t("community.publish")}
                      </Button>
                    ) : (
                      <Button asChild>
                        <Link to="/auth?mode=login">{t("nav.login")}</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mb-5 rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1 rounded-xl bg-secondary/70 p-1 overflow-x-auto">
                {([
                  ["latest", t("community.filter.latest"), Compass],
                  ["popular", t("community.filter.popular"), TrendingUp],
                  ["mine", t("community.filter.mine"), Users],
                  ["saved", t("community.filter.saved"), Bookmark],
                  ["network", t("community.filter.network"), Network],
                ] as const).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={(value === "mine" || value === "network") && !user}
                    onClick={() => setFeedFilter(value)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                      feedFilter === value
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative sm:w-64">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("community.search")}
                  className="ps-9 h-10 bg-background"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4" aria-busy="true" aria-label={t("community.title")}>
              {[0, 1, 2].map((item) => (
                <Card key={item}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                    <div className="h-20 bg-muted animate-pulse rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : visiblePosts.length === 0 ? (
            <Card>
              <CardContent className="p-10 sm:p-14 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <MessageSquareText className="w-7 h-7 text-primary" />
                </div>
                <p className="font-semibold text-lg">
                  {search || feedFilter === "mine"
                    ? t("community.empty.filtered")
                    : feedFilter === "saved"
                      ? t("community.empty.saved")
                      : t("community.empty")}
                </p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {search || feedFilter === "mine"
                    ? t("community.empty.filtered.desc")
                    : feedFilter === "saved"
                      ? t("community.empty.saved.desc")
                      : t("community.empty.desc")}
                </p>
                {(search || feedFilter !== "latest") && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setFeedFilter("latest");
                    }}
                  >
                    {t("community.clear_filters")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {visiblePosts.map((post) => {
                const isCompany = post.author?.account_type === "company";
                const authorName = post.author?.full_name || t("community.member");
                const memberId = post.author?.member_id;
                const postImage = safeHttpUrl(post.image_url);
                const commentsOpen = !!openComments[post.id];
                return (
                  <Card
                    key={post.id}
                    id={`post-${post.id}`}
                    className="overflow-hidden hover:border-primary/25 hover:shadow-md transition-all scroll-mt-28"
                  >
                    <CardContent className="p-5 sm:p-6 space-y-4">
                      <div className="flex items-start gap-3">
                        {memberId ? (
                          <Link to={`/members/${memberId}`} className="shrink-0" aria-label={authorName}>
                            <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold overflow-hidden hover:ring-2 hover:ring-primary/40 transition">
                              {post.author?.avatar_url ? (
                                <img src={post.author.avatar_url} alt={authorName} className="w-full h-full object-cover" />
                              ) : (
                                initials(post.author?.full_name)
                              )}
                            </div>
                          </Link>
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0 overflow-hidden">
                            {post.author?.avatar_url ? (
                              <img src={post.author.avatar_url} alt={authorName} className="w-full h-full object-cover" />
                            ) : (
                              initials(post.author?.full_name)
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                {memberId ? (
                                  <Link
                                    to={`/members/${memberId}`}
                                    className="font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                                  >
                                    {authorName}
                                  </Link>
                                ) : (
                                  <p className="font-semibold text-foreground">{authorName}</p>
                                )}
                                {isCompany && (
                                  <Badge className="bg-primary/10 text-primary border-0 text-[10px] gap-1">
                                    <Building2 className="w-3 h-3" />
                                    {t("community.company")}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {[post.author?.role, post.author?.company]
                                  .filter(Boolean)
                                  .join(" · ") || t("community.member")}
                                {" · "}
                                {formatRelative(post.created_at, lang)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                                  title={lang === "ar" ? "إخفاء" : "Hide"}
                                  aria-label={lang === "ar" ? "إخفاء المنشور" : "Hide post"}
                                  onClick={() => hidePost(post)}
                                >
                                  <EyeOff className="w-4 h-4" />
                                </Button>
                              )}
                              {user?.id === post.author_id && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                    onClick={() => {
                                      setEditingId(post.id);
                                      setEditBody(post.body);
                                    }}
                                    aria-label={t("community.edit")}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-8 w-8 ${
                                      post.comments_disabled
                                        ? "text-amber-600"
                                        : "text-muted-foreground hover:text-amber-600"
                                    }`}
                                    onClick={() => toggleCommentsLock(post)}
                                    aria-label={
                                      post.comments_disabled
                                        ? t("community.comments_on")
                                        : t("community.comments_off")
                                    }
                                    title={
                                      post.comments_disabled
                                        ? t("community.comments_on")
                                        : t("community.comments_off")
                                    }
                                  >
                                    <MessageCircleOff className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => removePost(post)}
                                    aria-label={lang === "ar" ? "حذف المنشور" : "Delete post"}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {post.original && (
                            <p className="mt-3 text-xs text-muted-foreground inline-flex items-center gap-1">
                              <Repeat2 className="w-3.5 h-3.5" />
                              {t("community.reposted")}
                            </p>
                          )}
                          {editingId === post.id ? (
                            <div className="mt-3 space-y-2">
                              <Textarea
                                rows={5}
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value.slice(0, MAX_POST_LENGTH))}
                                className="resize-none"
                              />
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" disabled={editBusy} onClick={() => saveEdit(post)}>
                                  {editBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : t("community.save_edit")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingId(null)}
                                >
                                  {t("community.cancel_edit")}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <CommunityPostBody
                              text={post.original?.body || post.body}
                              expanded={!!expandedPosts[post.id] || hash === `#post-${post.id}`}
                              onToggle={() => toggleExpanded(post.id)}
                              onHashtag={setSearch}
                              seeMore={t("community.see_more")}
                              seeLess={t("community.see_less")}
                              technicalLabel={t("community.technical")}
                            />
                          )}
                          {postImage && (
                            <a href={postImage} target="_blank" rel="noopener noreferrer" className="block mt-3">
                              <img
                                src={postImage}
                                alt={t("community.post_image_alt")}
                                className="rounded-xl max-h-[28rem] w-full object-cover border border-border/60"
                              />
                            </a>
                          )}

                          <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-border/70 pt-3">
                            <div className="relative">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`gap-1.5 h-8 ${
                                  post.liked_by_me ? "text-rose-600" : "text-muted-foreground"
                                }`}
                                onClick={() => setReactionMenu((id) => (id === post.id ? null : post.id))}
                                onDoubleClick={() => toggleLike(post)}
                                aria-label={t("community.like")}
                              >
                                <Heart className={`w-4 h-4 ${post.liked_by_me ? "fill-current" : ""}`} />
                                <span>
                                  {post.my_reaction
                                    ? REACTIONS.find((r) => r.type === post.my_reaction)?.[lang === "ar" ? "ar" : "en"]
                                    : t("community.like_action")}
                                </span>
                                {(post.likes_count || 0) > 0 && (
                                  <span className="tabular-nums text-xs">{post.likes_count}</span>
                                )}
                              </Button>
                              {reactionMenu === post.id && (
                                <div className="absolute bottom-full mb-1 start-0 z-20 flex gap-1 rounded-full border border-border bg-card px-2 py-1 shadow-lg">
                                  {REACTIONS.map((r) => (
                                    <button
                                      key={r.type}
                                      type="button"
                                      title={lang === "ar" ? r.ar : r.en}
                                      className="text-lg leading-none hover:scale-125 transition"
                                      onClick={() => reactToPost(post, r.type)}
                                    >
                                      {r.icon}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 h-8 text-muted-foreground"
                              onClick={() => toggleComments(post.id)}
                              aria-expanded={commentsOpen}
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>{t("community.comments")}</span>
                              {(post.comments_count || 0) > 0 && (
                                <span className="tabular-nums text-xs">{post.comments_count}</span>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 h-8 text-muted-foreground"
                              onClick={() => sharePost(post)}
                            >
                              <Share2 className="w-4 h-4" />
                              {t("community.share")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 h-8 text-muted-foreground"
                              onClick={() => repost(post)}
                            >
                              <Repeat2 className="w-4 h-4" />
                              {t("community.repost")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`gap-1.5 h-8 ${
                                savedIds.includes(post.id) ? "text-primary" : "text-muted-foreground"
                              }`}
                              onClick={() => toggleSaved(post.id)}
                            >
                              {savedIds.includes(post.id) ? (
                                <BookmarkCheck className="w-4 h-4" />
                              ) : (
                                <Bookmark className="w-4 h-4" />
                              )}
                              {savedIds.includes(post.id) ? t("community.saved") : t("community.save")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 h-8 text-muted-foreground"
                              onClick={() => copyPost(post)}
                            >
                              <Copy className="w-4 h-4" />
                              {t("community.copy")}
                            </Button>
                            {shouldCollapsePost(post.body) && (
                              <span className="ms-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {readingMinutes(post.body)} {t("community.min_read")}
                              </span>
                            )}
                          </div>

                          {commentsOpen && (
                            <div className="mt-4 space-y-3 rounded-xl bg-secondary/30 p-3">
                              {commentsLoading[post.id] ? (
                                <div className="flex justify-center py-4">
                                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                </div>
                              ) : (commentsByPost[post.id] || []).length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">
                                  {t("community.comments.empty")}
                                </p>
                              ) : (
                                (commentsByPost[post.id] || []).map((c) => (
                                  <div key={c.id} className={`flex gap-2 ${c.parent_comment_id ? "ms-8" : ""}`}>
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0 overflow-hidden">
                                      {c.author?.avatar_url ? (
                                        <img
                                          src={c.author.avatar_url}
                                          alt={c.author.full_name || t("community.member")}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        initials(c.author?.full_name)
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0 rounded-lg bg-background border border-border px-3 py-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <p className="text-xs font-semibold">
                                            {c.author?.full_name || t("community.member")}
                                          </p>
                                          <p className="text-[11px] text-muted-foreground">
                                            {formatRelative(c.created_at, lang)}
                                          </p>
                                        </div>
                                        {(user?.id === c.author_id || isAdmin) && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                            onClick={() => removeComment(post.id, c.id)}
                                            aria-label={lang === "ar" ? "حذف التعليق" : "Delete comment"}
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        )}
                                      </div>
                                      <p className="text-sm mt-1 whitespace-pre-wrap">
                                        {expandedComments[c.id] || !shouldCollapsePost(c.body, 220)
                                          ? c.body
                                          : `${truncatePost(c.body, 220)}…`}
                                      </p>
                                      <button
                                        type="button"
                                        className="mt-1 text-[11px] font-medium text-primary"
                                        onClick={() => setReplyTo((p) => ({ ...p, [post.id]: c.id }))}
                                      >
                                        {t("community.reply")}
                                      </button>
                                      {shouldCollapsePost(c.body, 220) && (
                                        <button
                                          type="button"
                                          className="mt-1 text-xs font-semibold text-primary hover:underline"
                                          onClick={() =>
                                            setExpandedComments((prev) => ({
                                              ...prev,
                                              [c.id]: !prev[c.id],
                                            }))
                                          }
                                        >
                                          {expandedComments[c.id]
                                            ? t("community.see_less")
                                            : t("community.see_more")}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}

                              {post.comments_disabled ? (
                                <p className="text-xs text-muted-foreground text-center py-2">
                                  {t("community.comments_disabled")}
                                </p>
                              ) : user ? (
                                <div className="space-y-2 pt-1">
                                  {replyTo[post.id] && (
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                      <span>{t("community.replying")}</span>
                                      <button
                                        type="button"
                                        className="font-medium text-primary"
                                        onClick={() => setReplyTo((p) => ({ ...p, [post.id]: null }))}
                                      >
                                        {t("community.cancel_reply")}
                                      </button>
                                    </div>
                                  )}
                                  <div className="flex gap-2">
                                  <Textarea
                                    rows={2}
                                    value={commentDrafts[post.id] || ""}
                                    onChange={(e) =>
                                      setCommentDrafts((p) => ({ ...p, [post.id]: e.target.value }))
                                    }
                                    placeholder={
                                      replyTo[post.id]
                                        ? t("community.reply_ph")
                                        : t("community.comment_ph")
                                    }
                                    className="resize-none text-sm"
                                  />
                                  <Button
                                    size="icon"
                                    className="shrink-0 h-10 w-10"
                                    disabled={commentBusy === post.id}
                                    onClick={() => submitComment(post.id)}
                                    aria-label={t("community.comment_submit")}
                                  >
                                    {commentBusy === post.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Send className="w-4 h-4" />
                                    )}
                                  </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button asChild size="sm" variant="outline" className="w-full">
                                  <Link to="/auth?mode=login">{t("community.login_required")}</Link>
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
            </section>

            <aside className="space-y-5 lg:sticky lg:top-24">
              <Card className="overflow-hidden border-primary/15">
                <div className="h-1 bg-primary" />
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{t("community.sidebar.network")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("community.sidebar.network.desc")}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/members">{t("nav.members")}</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/forum">{t("nav.forum")}</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/jobs">{t("nav.jobs")}</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/insights">{t("nav.insights")}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold">{t("community.sidebar.trending")}</h2>
                  </div>
                  <div className="space-y-1.5">
                    {(trendingTopics.length > 0
                      ? trendingTopics
                      : quickTopics.map((topic) => [topic.tag.toLocaleLowerCase(), 0] as [string, number])
                    ).map(([tag, count]) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSearch(tag)}
                        className="w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-secondary transition text-start"
                      >
                        <span className="font-medium text-primary">{tag}</span>
                        {count > 0 && (
                          <span className="text-[11px] text-muted-foreground">
                            {count} {t("community.sidebar.posts")}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-secondary/30">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold">{t("community.guidelines.title")}</h2>
                  </div>
                  <ul className="space-y-2.5">
                    {[
                      t("community.guidelines.policy"),
                      t("community.guidelines.expertise"),
                      t("community.guidelines.respect"),
                      t("community.guidelines.sources"),
                    ].map((guideline) => (
                      <li key={guideline} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        {guideline}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {!user && (
                <Card className="border-primary/20 bg-primary/[0.04]">
                  <CardContent className="p-5 text-center">
                    <Sparkles className="w-7 h-7 text-primary mx-auto mb-3" />
                    <p className="font-semibold mb-1">{t("community.join.title")}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("community.join.desc")}
                    </p>
                    <Button asChild size="sm" className="w-full">
                      <Link to="/auth?mode=signup">{t("hero.cta.join")}</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
