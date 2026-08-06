import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Loader2,
  Pin,
  Lock,
  Send,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { enrichRepliesWithAuthors, enrichTopicsWithAuthors } from "@/lib/forum";
import type { ForumCategory, ForumReply, ForumTopic } from "@/lib/types";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { toast } from "sonner";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDateTime(date: string, lang: string) {
  return new Date(date).toLocaleString(lang === "ar" ? "ar" : "en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ForumTopicPage() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useI18n();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modBusy, setModBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  usePageMeta({
    title: topic?.title || t("forum.title"),
    description: t("forum.desc"),
    path: `/forum/t/${id}`,
  });

  const loadTopic = async () => {
    if (!id) return;

    try {
      const { data: topicData, error: topicError } = await supabase
        .from("forum_topics")
        .select("*")
        .eq("id", id)
        .single();

      if (topicError || !topicData) {
        setTopic(null);
        setReplies([]);
        setCategory(null);
        return;
      }

      const enriched = (await enrichTopicsWithAuthors([topicData as ForumTopic]))[0];
      setTopic(enriched);

      const { data: catData } = await supabase
        .from("forum_categories")
        .select("*")
        .eq("id", enriched.category_id)
        .single();
      setCategory((catData as ForumCategory) || null);

      const { data: replyData } = await supabase
        .from("forum_replies")
        .select("*")
        .eq("topic_id", id)
        .order("created_at", { ascending: true });

      setReplies(await enrichRepliesWithAuthors((replyData as ForumReply[]) || []));
    } catch {
      setTopic(null);
      setReplies([]);
      setCategory(null);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadTopic();
      setLoading(false);
    }
    init();
  }, [id]);

  const toggleModeration = async (field: "is_pinned" | "is_locked") => {
    if (!topic || !isAdmin) return;
    setModBusy(true);
    const next = !topic[field];
    const { error: updateError } = await supabase
      .from("forum_topics")
      .update({ [field]: next })
      .eq("id", topic.id);
    setModBusy(false);
    if (updateError) toast.error(updateError.message);
    else {
      setTopic({ ...topic, [field]: next });
      toast.success(lang === "ar" ? "تم تحديث الموضوع" : "Topic updated");
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !topic) {
      navigate("/auth?mode=login");
      return;
    }

    if (topic.is_locked) {
      setError(t("forum.locked"));
      return;
    }

    const trimmed = replyBody.trim();
    if (!trimmed) {
      setError(t("forum.error.fields"));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from("forum_replies").insert({
        topic_id: topic.id,
        author_id: user.id,
        body: trimmed,
      });

      if (insertError) {
        setError(insertError.message || t("forum.error.reply"));
        setSubmitting(false);
        return;
      }

      await supabase
        .from("forum_topics")
        .update({
          reply_count: (topic.reply_count || 0) + 1,
          last_reply_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", topic.id);

      setReplyBody("");
      toast.success(t("forum.reply_posted"));
      await loadTopic();
    } catch {
      setError(t("forum.error.reply"));
    } finally {
      setSubmitting(false);
    }
  };

  const AuthorBlock = ({
    name,
    avatarUrl,
    date,
  }: {
    name: string;
    avatarUrl?: string | null;
    date: string;
  }) => (
    <div className="flex items-center gap-3 mb-3">
      <Avatar className="h-9 w-9">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{formatDateTime(date, lang)}</p>
      </div>
    </div>
  );

  if (!loading && !topic) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 text-center px-4">
          <p className="text-muted-foreground mb-4">{t("forum.topic_not_found")}</p>
          <Link to="/forum">
            <Button variant="outline">{t("forum.back")}</Button>
          </Link>
        </div>
        <FooterSection />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-28 pb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Link
              to="/forum"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t("forum.back")}
            </Link>
            {category && (
              <>
                <span className="text-muted-foreground">/</span>
                <Link
                  to={`/forum/c/${category.slug}`}
                  className="text-sm text-primary hover:underline"
                >
                  {lang === "ar" && category.name_ar ? category.name_ar : category.name}
                </Link>
              </>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : topic ? (
            <div className="space-y-6">
              <Card className="border border-border">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {topic.is_pinned && (
                      <Badge className="bg-primary/10 text-primary border-0 gap-1">
                        <Pin className="w-3 h-3" />
                        {t("forum.pinned")}
                      </Badge>
                    )}
                    {topic.is_locked && (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="w-3 h-3" />
                        {t("forum.locked_badge")}
                      </Badge>
                    )}
                    {isAdmin && (
                      <div className="ms-auto flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1"
                          disabled={modBusy}
                          onClick={() => toggleModeration("is_pinned")}
                        >
                          <Pin className="w-3.5 h-3.5" />
                          {topic.is_pinned
                            ? (lang === "ar" ? "إلغاء التثبيت" : "Unpin")
                            : (lang === "ar" ? "تثبيت" : "Pin")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1"
                          disabled={modBusy}
                          onClick={() => toggleModeration("is_locked")}
                        >
                          <Lock className="w-3.5 h-3.5" />
                          {topic.is_locked
                            ? (lang === "ar" ? "فتح" : "Unlock")
                            : (lang === "ar" ? "إغلاق" : "Lock")}
                        </Button>
                      </div>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-foreground mb-4">{topic.title}</h1>
                  <AuthorBlock
                    name={topic.author?.full_name || t("forum.anonymous")}
                    avatarUrl={topic.author?.avatar_url}
                    date={topic.created_at}
                  />
                  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground whitespace-pre-wrap">
                    {topic.body}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {replies.length} {t("forum.replies")}
                </h2>
                {replies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("forum.no_replies")}</p>
                ) : (
                  replies.map((reply) => (
                    <Card key={reply.id} className="border border-border">
                      <CardContent className="p-5">
                        <AuthorBlock
                          name={reply.author?.full_name || t("forum.anonymous")}
                          avatarUrl={reply.author?.avatar_url}
                          date={reply.created_at}
                        />
                        <div className="text-sm text-foreground whitespace-pre-wrap">{reply.body}</div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              <Card className="border border-border">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    {t("forum.post_reply")}
                  </h2>
                  {!user ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground mb-4">{t("forum.login_required")}</p>
                      <Link to="/auth?mode=login">
                        <Button>{t("nav.login")}</Button>
                      </Link>
                    </div>
                  ) : topic.is_locked ? (
                    <p className="text-muted-foreground text-sm">{t("forum.locked")}</p>
                  ) : (
                    <form onSubmit={handleReply} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reply-body">{t("forum.reply_body")}</Label>
                        <Textarea
                          id="reply-body"
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          placeholder={t("forum.reply_body_placeholder")}
                          rows={4}
                          disabled={submitting}
                          required
                        />
                      </div>
                      {error && (
                        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          {error}
                        </div>
                      )}
                      <Button type="submit" disabled={submitting} className="gap-2">
                        {submitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        {submitting ? t("forum.posting") : t("forum.post_reply_btn")}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
