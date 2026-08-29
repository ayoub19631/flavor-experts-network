import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Loader2,
  MessageSquare,
  Pin,
  Lock,
  MessagesSquare,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { enrichTopicsWithAuthors } from "@/lib/forum";
import type { ForumCategory, ForumTopic } from "@/lib/types";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";

function formatDate(date: string, lang: string) {
  return new Date(date).toLocaleDateString(lang === "ar" ? "ar" : "en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ForumPage() {
  const { t, lang } = useI18n();
  usePageMeta({ title: t("forum.title"), description: t("forum.desc"), path: "/forum" });

  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [recentTopics, setRecentTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [catRes, topicRes] = await Promise.all([
          supabase
            .from("forum_categories")
            .select("*")
            .eq("is_published", true)
            .order("sort_order", { ascending: true }),
          supabase
            .from("forum_topics")
            .select("*")
            .order("is_pinned", { ascending: false })
            .order("last_reply_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        setCategories((catRes.data as ForumCategory[]) || []);

        const topics = (topicRes.data as ForumTopic[]) || [];
        setRecentTopics(await enrichTopicsWithAuthors(topics));
      } catch {
        setCategories([]);
        setRecentTopics([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const categoryName = (cat: ForumCategory) =>
    lang === "ar" && cat.name_ar ? cat.name_ar : cat.name;

  const categoryDesc = (cat: ForumCategory) =>
    lang === "ar" && cat.description_ar ? cat.description_ar : cat.description;

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
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <MessagesSquare className="w-5 h-5 text-[hsl(47_23%_85%)]" />
            </div>
            <Badge className="bg-white/10 text-[hsl(47_23%_85%)] border-0 px-3 py-1">
              {t("forum.tag")}
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            {t("forum.title")}
          </h1>
          <p className="text-white/75 max-w-xl">{t("forum.desc")}</p>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <h2 className="text-xl font-semibold text-foreground">{t("forum.categories")}</h2>
                {categories.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      {t("forum.empty_categories")}
                    </CardContent>
                  </Card>
                ) : (
                  categories.map((cat) => (
                    <Link key={cat.id} to={`/forum/c/${cat.slug}`}>
                      <Card className="border border-border hover:border-primary/30 hover:shadow-md transition-all">
                        <CardContent className="p-5 flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{categoryName(cat)}</h3>
                            {categoryDesc(cat) && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {categoryDesc(cat)}
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">{t("forum.recent")}</h2>
                {recentTopics.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                      {t("forum.empty_topics")}
                    </CardContent>
                  </Card>
                ) : (
                  recentTopics.map((topic) => (
                    <Link key={topic.id} to={`/forum/t/${topic.id}`}>
                      <Card className="border border-border hover:border-primary/30 transition-all">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-1">
                            {topic.is_pinned && (
                              <Pin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            )}
                            {topic.is_locked && (
                              <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            )}
                            <h3 className="font-medium text-foreground text-sm line-clamp-1">
                              {topic.title}
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {topic.author?.full_name || t("forum.anonymous")} ·{" "}
                            {formatDate(topic.created_at, lang)} · {topic.reply_count}{" "}
                            {t("forum.replies")}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
