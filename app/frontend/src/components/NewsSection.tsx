import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  ArrowUpRight,
  TrendingUp,
  Leaf,
  Atom,
  Database,
  Search,
  Newspaper,
} from "lucide-react";
import { fetchFromSupabase, type IndustryNews } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

const EVENT_IMAGE =
  "https://mgx-backend-cdn.metadl.com/generate/images/986354/2026-05-14/oqqj4fqaagnq/industry-networking-event.png";

const iconMap: Record<string, typeof Atom> = {
  Innovation: Atom,
  Sustainability: Leaf,
  "Market Trends": TrendingUp,
  Regulatory: TrendingUp,
  Events: Calendar,
};

interface NewsItem {
  id?: string;
  category: string;
  title: string;
  summary: string;
  date: string;
  image_url: string;
  source_url: string;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function NewsSection() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"db" | "static">("static");
  const [search, setSearch] = useState("");
  const { t } = useI18n();

  useEffect(() => {
    async function fetchNews() {
      const result = await fetchFromSupabase<IndustryNews>("industry_news", {
        orderBy: "published_at",
        ascending: false,
        limit: 6,
        filters: [{ column: "is_published", value: true }],
      });

      if (result.fromDb && result.data) {
        const seen = new Set<string>();
        const mapped: NewsItem[] = result.data
          .filter((item) => {
            const key = item.id || item.title;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .map((item) => ({
            id: item.id,
            category: item.category || "General",
            title: item.title,
            summary: item.summary || "",
            date: formatDate(item.published_at || item.created_at),
            image_url: item.image_url || "",
            source_url: item.source_url || "",
          }));
        setNewsItems(mapped);
        setDataSource("db");
      } else {
        setNewsItems([]);
        setDataSource("static");
      }
      setLoading(false);
    }
    fetchNews();
  }, []);

  const q = search.toLowerCase();
  const filtered = newsItems.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
  );
  const list = filtered.length > 0 ? filtered : !search ? newsItems : [];
  const featured = list[0];
  const displayRest = list.slice(1, 4);

  return (
    <section id="news" className="py-20 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-2">
            {t("news.tag")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t("news.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            {t("news.desc")}
          </p>
          {!loading && dataSource === "db" && newsItems.length > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              <Database className="w-3 h-3" />
              {t("news.live")}
            </div>
          )}

          {!loading && newsItems.length > 0 && (
            <div className="mt-6 flex justify-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("news.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-96 rounded-xl" />
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          </div>
        ) : !featured ? (
          <div className="max-w-lg mx-auto text-center rounded-2xl border border-dashed border-border bg-background/80 px-6 py-12">
            <Newspaper className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">{t("news.empty")}</p>
            <p className="text-sm text-muted-foreground">{t("news.empty.desc")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="overflow-hidden border border-border hover:shadow-xl transition-shadow duration-300 group">
              <a
                href={featured.source_url || "#"}
                target={featured.source_url ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="block"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={featured.image_url || EVENT_IMAGE}
                    alt={featured.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-3 start-3">
                    <Badge className="bg-primary text-primary-foreground">
                      {featured.category}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    {featured.date}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {featured.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {featured.summary}
                  </p>
                </CardContent>
              </a>
            </Card>

            <div className="flex flex-col gap-4">
              {displayRest.map((item) => {
                const IconComp = iconMap[item.category] || TrendingUp;
                return (
                  <Card
                    key={item.id ?? item.title}
                    className="border border-border hover:border-primary/30 hover:shadow-md transition-all duration-300 group"
                  >
                    <a
                      href={item.source_url || "#"}
                      target={item.source_url ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <CardContent className="p-5 flex gap-4">
                        <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <IconComp className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs font-medium">
                              {item.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {item.date}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-2">
                            {item.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.summary}
                          </p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                      </CardContent>
                    </a>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}