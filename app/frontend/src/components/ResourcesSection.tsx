import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  FileText,
  Video,
  Download,
  GraduationCap,
  Microscope,
  FlaskConical,
  Loader2,
  ExternalLink,
  Database,
  Lock,
  Search,
} from "lucide-react";
import { fetchFromSupabase, type EducationalResource } from "@/lib/supabase";
import { openResourceLink } from "@/lib/resources";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

const iconMap: Record<string, typeof BookOpen> = {
  Guide: BookOpen,
  Research: Microscope,
  Webinar: Video,
  Whitepaper: FileText,
  "Case Study": FlaskConical,
  Course: GraduationCap,
  Article: FileText,
  Certification: GraduationCap,
  "Research Paper": Microscope,
};

interface ResourceItem {
  id?: string;
  type: string;
  title: string;
  description: string;
  category: string;
  link: string;
  premium: boolean;
}

const typeColors: Record<string, string> = {
  Guide: "bg-emerald-100 text-emerald-700",
  Research: "bg-blue-100 text-blue-700",
  Webinar: "bg-purple-100 text-purple-700",
  Whitepaper: "bg-amber-100 text-amber-700",
  "Case Study": "bg-rose-100 text-rose-700",
  Course: "bg-cyan-100 text-cyan-700",
  Article: "bg-amber-100 text-amber-700",
  Certification: "bg-cyan-100 text-cyan-700",
  "Research Paper": "bg-blue-100 text-blue-700",
};

export default function ResourcesSection() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"db" | "empty">("empty");
  const [search, setSearch] = useState("");
  const { t } = useI18n();
  const { user, isPremium } = useAuth();

  useEffect(() => {
    async function fetchResources() {
      const result = await fetchFromSupabase<EducationalResource>(
        "educational_resources",
        {
          orderBy: "created_at",
          ascending: false,
          limit: 8,
          filters: [{ column: "is_published", value: true }],
        }
      );

      if (result.fromDb && result.data) {
        const seen = new Set<string>();
        const mapped: ResourceItem[] = result.data
          .filter((item) => {
            const key = item.id || item.title;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .map((item) => ({
            id: item.id,
            type: item.type || "Article",
            title: item.title,
            description: item.description || "",
            category: item.category || "General",
            link: item.link || "",
            premium: item.premium ?? false,
          }));
        setResources(mapped);
        setDataSource("db");
      } else {
        setResources([]);
        setDataSource("empty");
      }
      setLoading(false);
    }
    fetchResources();
  }, []);

  return (
    <section id="resources" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-2">
            {t("resources.tag")}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            {t("resources.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            {t("resources.desc")}
          </p>
          {!loading && dataSource === "db" && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              <Database className="w-3 h-3" />
              {t("resources.live")}
            </div>
          )}

          {/* Search */}
          {!loading && resources.length > 0 && (
            <div className="mt-6 flex justify-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("resources.search")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-9 h-10"
                />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="max-w-lg mx-auto text-center rounded-2xl border border-dashed border-border bg-secondary/20 px-6 py-12">
            <BookOpen className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">{t("resources.empty")}</p>
            <p className="text-sm text-muted-foreground">{t("resources.empty.desc")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources
              .filter((r) => {
                const q = search.toLowerCase();
                return (
                  !q ||
                  r.title.toLowerCase().includes(q) ||
                  r.description.toLowerCase().includes(q) ||
                  r.category.toLowerCase().includes(q) ||
                  r.type.toLowerCase().includes(q)
                );
              })
              .map((resource) => {
              const IconComp = iconMap[resource.type] || BookOpen;
              // Members get full free access; guests sign in for member resources.
              const isLocked = resource.premium && !isPremium && !user;

              return (
                <Card
                  key={resource.id ?? resource.title}
                  className={`border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 group relative ${
                    isLocked ? "opacity-80" : "cursor-pointer"
                  }`}
                  onClick={() => {
                    if (isLocked) return;
                    void openResourceLink(resource.id, resource.link, resource.premium);
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <IconComp className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-xs font-medium ${typeColors[resource.type] || "bg-gray-100 text-gray-700"}`}
                        >
                          {resource.type}
                        </Badge>
                      </div>
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {resource.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {resource.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {resource.category}
                      </span>
                      {isLocked ? (
                        <Link to="/auth?mode=signup">
                          <Button variant="ghost" size="sm" className="gap-1 text-xs text-primary hover:text-primary/80 h-7 px-2">
                            <Lock className="w-3 h-3" />
                            {t("nav.signup")}
                          </Button>
                        </Link>
                      ) : (
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}