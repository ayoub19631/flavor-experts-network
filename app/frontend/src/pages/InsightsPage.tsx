import { Link } from "react-router-dom";
import { FileText, MessageSquareText, Users } from "lucide-react";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import SeoJsonLd, { breadcrumbJsonLd } from "@/components/SeoJsonLd";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useI18n } from "@/lib/i18n";
import { blogPosts, getBlogRoute } from "@/lib/blog";
import { supabase } from "@/lib/supabase";

type PostRow = { id: string; body?: string | null; created_at?: string };

export default function InsightsPage() {
  const { t } = useI18n();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  usePageMeta({
    title: t("insights.title"),
    description: t("insights.desc"),
    path: "/insights",
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from("social_posts")
        .select("id, body, created_at")
        .eq("is_published", true)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(8);
      if (!cancelled) {
        setPosts((data as PostRow[]) || []);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SeoJsonLd
        data={breadcrumbJsonLd([
          { name: t("nav.home"), path: "/" },
          { name: t("insights.title"), path: "/insights" },
        ])}
      />
      <Navbar />
      <main className="pt-24 pb-16">
        <section className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
            {t("insights.tag")}
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-foreground max-w-3xl">
            {t("insights.title")}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-3xl leading-relaxed">
            {t("insights.desc")}
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <Card className="border-border">
              <CardContent className="p-5">
                <FileText className="w-5 h-5 text-primary mb-3" />
                <h2 className="font-semibold">{t("insights.articles")}</h2>
                <p className="text-sm text-muted-foreground mt-2">{t("insights.articles_desc")}</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-5">
                <MessageSquareText className="w-5 h-5 text-primary mb-3" />
                <h2 className="font-semibold">{t("insights.posts")}</h2>
                <p className="text-sm text-muted-foreground mt-2">{t("insights.posts_desc")}</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-5">
                <Users className="w-5 h-5 text-primary mb-3" />
                <h2 className="font-semibold">{t("insights.exchange")}</h2>
                <p className="text-sm text-muted-foreground mt-2">{t("insights.exchange_desc")}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 sm:px-6 mt-14">
          <div className="flex items-end justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold">{t("insights.articles")}</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/blog">{t("home.view_all")}</Link>
            </Button>
          </div>
          {blogPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {blogPosts.slice(0, 6).map((article) => (
                <Link key={article.slug} to={getBlogRoute(article.slug)} className="block h-full">
                  <Card className="h-full border-border hover:border-primary/30 transition-colors">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-foreground">{article.title}</h3>
                      {article.description ? (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{article.description}</p>
                      ) : null}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground border border-dashed border-border rounded-xl px-4 py-6 text-center">
              {t("insights.empty_articles")}
            </p>
          )}
        </section>

        <section className="mx-auto max-w-6xl px-4 sm:px-6 mt-14">
          <div className="flex items-end justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold">{t("insights.posts")}</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/community">{t("home.view_all")}</Link>
            </Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("insights.loading")}</p>
          ) : posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.map((post) => (
                <Link key={post.id} to="/community" className="block h-full">
                  <Card className="h-full border-border hover:border-primary/30 transition-colors">
                    <CardContent className="p-5">
                      <p className="text-sm text-foreground line-clamp-5">{post.body || ""}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground border border-dashed border-border rounded-xl px-4 py-6 text-center">
              {t("insights.empty_posts")}
            </p>
          )}
        </section>

        <section className="mx-auto max-w-3xl px-4 sm:px-6 mt-16 text-center">
          <h2 className="text-2xl font-bold">{t("insights.cta_title")}</h2>
          <p className="text-muted-foreground mt-3 mb-6">{t("insights.cta_desc")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/community">{t("nav.community")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/forum">{t("nav.forum")}</Link>
            </Button>
          </div>
        </section>
      </main>
      <FooterSection />
    </div>
  );
}
