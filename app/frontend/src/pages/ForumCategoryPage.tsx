import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Pin,
  Lock,
  Send,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { enrichTopicsWithAuthors } from "@/lib/forum";
import type { ForumCategory, ForumTopic } from "@/lib/types";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { toast } from "sonner";

function formatDate(date: string, lang: string) {
  return new Date(date).toLocaleDateString(lang === "ar" ? "ar" : "en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ForumCategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const categoryLabel = category
    ? lang === "ar" && category.name_ar
      ? category.name_ar
      : category.name
    : "";

  usePageMeta({
    title: categoryLabel || t("forum.title"),
    description: t("forum.desc"),
    path: `/forum/c/${slug}`,
  });

  useEffect(() => {
    if (!slug) return;

    async function load() {
      try {
        const { data: cat, error: catError } = await supabase
          .from("forum_categories")
          .select("*")
          .eq("slug", slug)
          .eq("is_published", true)
          .single();

        if (catError || !cat) {
          setCategory(null);
          setTopics([]);
          setLoading(false);
          return;
        }

        setCategory(cat as ForumCategory);

        const { data: topicData } = await supabase
          .from("forum_topics")
          .select("*")
          .eq("category_id", cat.id)
          .order("is_pinned", { ascending: false })
          .order("last_reply_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false });

        setTopics(await enrichTopicsWithAuthors((topicData as ForumTopic[]) || []));
      } catch {
        setCategory(null);
        setTopics([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !category) {
      navigate("/auth?mode=login");
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) {
      setError(t("forum.error.fields"));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from("forum_topics")
        .insert({
          category_id: category.id,
          author_id: user.id,
          title: trimmedTitle,
          body: trimmedBody,
          is_pinned: false,
          is_locked: false,
          reply_count: 0,
        })
        .select()
        .single();

      if (insertError || !data) {
        setError(insertError?.message || t("forum.error.create"));
        setSubmitting(false);
        return;
      }

      toast.success(t("forum.topic_created"));
      navigate(`/forum/t/${data.id}`);
    } catch {
      setError(t("forum.error.create"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && !category) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 text-center px-4">
          <p className="text-muted-foreground mb-4">{t("forum.category_not_found")}</p>
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

      <section className="pt-28 pb-10 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/forum"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("forum.back")}
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <Badge className="bg-primary/10 text-primary border-0 px-3 py-1">
              {t("forum.tag")}
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            {categoryLabel}
          </h1>
          {category?.description && (
            <p className="text-muted-foreground">
              {lang === "ar" && category.description_ar
                ? category.description_ar
                : category.description}
            </p>
          )}
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">{t("forum.topics")}</h2>
                {topics.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      {t("forum.empty_topics")}
                    </CardContent>
                  </Card>
                ) : (
                  topics.map((topic) => (
                    <Link key={topic.id} to={`/forum/t/${topic.id}`}>
                      <Card className="border border-border hover:border-primary/30 transition-all">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {topic.is_pinned && (
                                <Pin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              )}
                              {topic.is_locked && (
                                <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              )}
                              <h3 className="font-medium text-foreground truncate">{topic.title}</h3>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {topic.author?.full_name || t("forum.anonymous")} ·{" "}
                              {formatDate(topic.created_at, lang)}
                            </p>
                          </div>
                          <Badge variant="secondary" className="flex-shrink-0">
                            {topic.reply_count} {t("forum.replies")}
                          </Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </div>

              <Card className="border border-border">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    {t("forum.new_topic")}
                  </h2>
                  {!user ? (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground mb-4">{t("forum.login_required")}</p>
                      <Link to="/auth?mode=login">
                        <Button>{t("nav.login")}</Button>
                      </Link>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateTopic} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="topic-title">{t("forum.topic_title")}</Label>
                        <Input
                          id="topic-title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder={t("forum.topic_title_placeholder")}
                          disabled={submitting}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="topic-body">{t("forum.topic_body")}</Label>
                        <Textarea
                          id="topic-body"
                          value={body}
                          onChange={(e) => setBody(e.target.value)}
                          placeholder={t("forum.topic_body_placeholder")}
                          rows={5}
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
                        {submitting ? t("forum.posting") : t("forum.post_topic")}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
