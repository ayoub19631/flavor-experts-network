import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BookOpen, Clock, GraduationCap, Route, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { usePageMeta } from "@/hooks/use-page-meta";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import CourseCardSkeleton from "@/components/academy/CourseCardSkeleton";
import {
  fetchMyEnrollments,
  fetchPublishedCourses,
  pickLocalized,
} from "@/lib/academy";
import type { AcademyCourse } from "@/lib/academy-types";

type LearningPath = {
  id: string;
  slug: string;
  title: string;
  title_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  level: string;
};

type PathCourse = { path_id: string; course_id: string; sort_order: number };

export default function CoursesPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  usePageMeta({ title: t("academy.title"), description: t("academy.desc"), path: "/courses" });

  const [courses, setCourses] = useState<AcademyCourse[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [pathCourses, setPathCourses] = useState<PathCourse[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pathFilter, setPathFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ courses: published, error: courseError }, pathRes, linkRes] = await Promise.all([
        fetchPublishedCourses(),
        supabase.from("learning_paths").select("*").eq("is_published", true).order("sort_order", { ascending: true }),
        supabase.from("learning_path_courses").select("path_id, course_id, sort_order"),
      ]);
      if (courseError) throw new Error(courseError);
      if (pathRes.error) throw pathRes.error;
      setCourses(published);
      setPaths((pathRes.data as LearningPath[]) || []);
      setPathCourses((linkRes.data as PathCourse[]) || []);
      if (user?.id) {
        const enrollments = await fetchMyEnrollments(user.id);
        setEnrolled(new Set(enrollments.map((item) => item.course_id)));
        setProgressMap(
          Object.fromEntries(enrollments.map((item) => [item.course_id, item.progress_pct ?? 0])),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("academy.error"));
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const publishedIds = useMemo(() => new Set(courses.map((course) => course.id)), [courses]);

  const filtered = useMemo(() => {
    return courses.filter((course) => {
      const title = pickLocalized(lang, course.title, course.title_ar);
      const desc = pickLocalized(lang, course.description, course.description_ar);
      const hay = `${title} ${desc} ${course.level}`.toLowerCase();
      if (query.trim() && !hay.includes(query.trim().toLowerCase())) return false;
      if (levelFilter !== "all" && course.level !== levelFilter) return false;
      if (languageFilter !== "all" && course.primary_language !== languageFilter) return false;
      if (pathFilter !== "all") {
        const inPath = pathCourses.some((link) => link.path_id === pathFilter && link.course_id === course.id);
        if (!inPath) return false;
      }
      return true;
    });
  }, [courses, lang, languageFilter, levelFilter, pathCourses, pathFilter, query]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="pt-28 pb-10 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/community"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("general.back")}
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <Badge className="bg-primary/10 text-primary border-0">{t("academy.tag")}</Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">{t("academy.title")}</h1>
          <p className="text-muted-foreground max-w-2xl">{t("academy.desc")}</p>
        </div>
      </section>

      <section className="py-10 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("academy.search")}
                className="ps-9"
                aria-label={t("academy.search")}
              />
            </div>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={pathFilter} onChange={(e) => setPathFilter(e.target.value)} aria-label={t("academy.filter.path")}>
              <option value="all">{t("academy.filter.all")}</option>
              {paths.map((path) => (
                <option key={path.id} value={path.id}>{pickLocalized(lang, path.title, path.title_ar)}</option>
              ))}
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} aria-label={t("academy.filter.level")}>
              <option value="all">{t("academy.filter.all")}</option>
              {["beginner", "intermediate", "advanced", "expert"].map((level) => (
                <option key={level} value={level}>{t(`academy.level.${level}`)}</option>
              ))}
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)} aria-label={t("academy.filter.language")}>
              <option value="all">{t("academy.filter.all")}</option>
              <option value="en">{t("academy.lang.en")}</option>
              <option value="ar">{t("academy.lang.ar")}</option>
            </select>
          </div>

          {loading ? (
            <CourseCardSkeleton />
          ) : error ? (
            <Card className="border-destructive/30">
              <CardContent className="p-8 text-center space-y-3">
                <p className="font-medium">{t("academy.error")}</p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button onClick={load}>{t("academy.retry")}</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {paths.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Route className="w-4 h-4 text-primary" />
                    <h2 className="text-lg font-semibold">{t("courses.paths")}</h2>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    {paths.map((path) => {
                      const count = pathCourses.filter((link) => link.path_id === path.id && publishedIds.has(link.course_id)).length;
                      return (
                        <Card key={path.id} className="border-primary/15">
                          <CardContent className="p-5 space-y-2">
                            <Badge variant="secondary">{t(`academy.level.${path.level}`) || path.level}</Badge>
                            <h3 className="font-semibold">{pickLocalized(lang, path.title, path.title_ar)}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-3">{pickLocalized(lang, path.description, path.description_ar)}</p>
                            <p className="text-xs text-muted-foreground">{count} {t("academy.path_count")}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {filtered.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-10 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h2 className="text-lg font-semibold mb-2">{t("academy.empty")}</h2>
                    <p className="text-muted-foreground">{t("academy.empty_desc")}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map((course) => {
                    const title = pickLocalized(lang, course.title, course.title_ar);
                    return (
                      <Card key={course.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <div className="aspect-video bg-primary/5 flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-primary/40" />
                        </div>
                        <CardContent className="p-5 space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{t(`academy.level.${course.level}`) || course.level}</Badge>
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 border-0">{t("academy.status.published")}</Badge>
                          </div>
                          <h2 className="text-lg font-semibold">{title}</h2>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {pickLocalized(lang, course.description, course.description_ar)}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {course.estimated_minutes || Math.round((course.duration_hours || 1) * 60)} {t("academy.minutes")}
                            </span>
                            {enrolled.has(course.id) && <span>{progressMap[course.id] ?? 0}%</span>}
                          </div>
                          {enrolled.has(course.id) && (
                            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${progressMap[course.id] ?? 0}%` }} />
                            </div>
                          )}
                          <Button asChild className="w-full">
                            <Link to={`/courses/${course.slug}`}>
                              {enrolled.has(course.id) ? t("academy.continue") : t("academy.view")}
                            </Link>
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>
      <FooterSection />
    </div>
  );
}
