import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Heart,
  Loader2,
  MessageSquareText,
  Send,
  Trash2,
  EyeOff,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { supabase } from "@/lib/supabase";
import { enrichSocialPosts, fetchMyLikedPostIds } from "@/lib/social";
import { safeHttpUrl } from "@/lib/url";
import type { SocialPost } from "@/lib/types";
import { toast } from "sonner";

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
  usePageMeta({ title: t("community.title"), description: t("community.desc"), path: "/community" });

  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [publishing, setPublishing] = useState(false);

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
      const liked = await fetchMyLikedPostIds(
        user.id,
        enriched.map((p) => p.id),
      );
      enriched = enriched.map((p) => ({ ...p, liked_by_me: liked.has(p.id) }));
    }
    setPosts(enriched);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const publish = async () => {
    if (!user) {
      toast.error(t("community.login_required"));
      return;
    }
    const text = body.trim();
    if (text.length < 3) {
      toast.error(t("community.min_length"));
      return;
    }
    setPublishing(true);
    const { error } = await supabase.from("social_posts").insert({
      author_id: user.id,
      body: text,
      is_published: true,
    });
    setPublishing(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
    toast.success(t("community.published"));
    load();
  };

  const toggleLike = async (post: SocialPost) => {
    if (!user) {
      toast.error(t("community.login_required"));
      return;
    }
    const liked = !!post.liked_by_me;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              liked_by_me: !liked,
              likes_count: Math.max(0, p.likes_count + (liked ? -1 : 1)),
            }
          : p,
      ),
    );
    if (liked) {
      await supabase
        .from("social_post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", user.id);
    } else {
      await supabase.from("social_post_likes").insert({
        post_id: post.id,
        user_id: user.id,
      });
    }
  };

  const removePost = async (post: SocialPost) => {
    if (!user || post.author_id !== user.id) return;
    const { error } = await supabase.from("social_posts").delete().eq("id", post.id);
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
      <Navbar />
      <main className="pt-28 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("general.back")}
          </Link>

          <div className="mb-8">
            <Badge className="bg-primary/10 text-primary border-0 mb-3">
              <MessageSquareText className="w-3.5 h-3.5 me-1.5" />
              {t("community.tag")}
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
              {t("community.title")}
            </h1>
            <p className="text-muted-foreground">{t("community.desc")}</p>
          </div>

          {/* Composer */}
          <Card className="mb-8 border-primary/15 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary/80 via-primary/40 to-transparent" />
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold shrink-0 overflow-hidden">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials(profile?.full_name)
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <p className="text-sm font-medium">
                    {user
                      ? profile?.full_name || user.email
                      : t("community.guest_composer")}
                  </p>
                  <Textarea
                    rows={4}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    disabled={!user}
                    placeholder={t("community.composer_ph")}
                    className="resize-none"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {user ? t("community.composer_hint") : t("community.login_required")}
                    </p>
                    {user ? (
                      <Button onClick={publish} disabled={publishing} className="gap-2">
                        {publishing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
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

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center space-y-2">
                <MessageSquareText className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <p className="font-medium">{t("community.empty")}</p>
                <p className="text-sm text-muted-foreground">{t("community.empty.desc")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => {
                const isCompany = post.author?.account_type === "company";
                const authorName = post.author?.full_name || t("community.member");
                const memberId = post.author?.member_id;
                const postImage = safeHttpUrl(post.image_url);
                return (
                  <Card key={post.id} className="hover:border-primary/20 transition-colors">
                    <CardContent className="p-5 sm:p-6 space-y-4">
                      <div className="flex items-start gap-3">
                        {memberId ? (
                          <Link to={`/members/${memberId}`} className="shrink-0" aria-label={authorName}>
                            <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold overflow-hidden hover:ring-2 hover:ring-primary/40 transition">
                              {post.author?.avatar_url ? (
                                <img
                                  src={post.author.avatar_url}
                                  alt={authorName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                initials(post.author?.full_name)
                              )}
                            </div>
                          </Link>
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0 overflow-hidden">
                            {post.author?.avatar_url ? (
                              <img
                                src={post.author.avatar_url}
                                alt={authorName}
                                className="w-full h-full object-cover"
                              />
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
                                  onClick={() => hidePost(post)}
                                >
                                  <EyeOff className="w-4 h-4" />
                                </Button>
                              )}
                              {user?.id === post.author_id && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => removePost(post)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="mt-3 text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
                            {post.body}
                          </p>
                          {postImage && (
                            <img
                              src={postImage}
                              alt=""
                              className="mt-3 rounded-xl max-h-80 w-full object-cover"
                            />
                          )}
                          <div className="mt-4 flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`gap-1.5 h-8 ${
                                post.liked_by_me ? "text-rose-600" : "text-muted-foreground"
                              }`}
                              onClick={() => toggleLike(post)}
                            >
                              <Heart
                                className={`w-4 h-4 ${post.liked_by_me ? "fill-current" : ""}`}
                              />
                              {post.likes_count || 0}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
