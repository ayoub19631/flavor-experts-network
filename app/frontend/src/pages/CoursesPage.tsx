import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Clock, Loader2, GraduationCap, Route, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { usePageMeta } from "@/hooks/use-page-meta";
import type { Course } from "@/lib/types";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import { toast } from "sonner";

type LearningPath = {
  id: string;
  slug: string;
  title: string;
  title_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  level: string;
};

type PathCourse = {
  path_id: string;
  course_id: string;
  sort_order: number;
};

export default function CoursesPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  usePageMeta({ title: t("courses.title"), description: t("courses.desc"), path: "/courses" });

  const [courses, setCourses] = useState<Course[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [pathCourses, setPathCourses] = useState<PathCourse[]>([]);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [{ data: courseData }, { data: pathData }, { data: linkData }] = await Promise.all([
          supabase.from("courses").select("*").eq("is_published", true).order("created_at", { ascending: false }),
          supabase.from("learning_paths").select("*").eq("is_published", true).order("sort_order", { ascending: true }),
          supabase.from("learning_path_courses").select("path_id, course_id, sort_order").order("sort_order", { ascending: true }),
        ]);
        setCourses((courseData as Course[]) || []);
        setPaths((pathData as LearningPath[]) || []);
        setPathCourses((linkData as PathCourse[]) || []);

        if (user?.id) {
          const { data: enrollData } = await supabase
            .from("course_enrollments")
            .select("course_id, progress_pct")
            .eq("user_id", user.id);
          setEnrolled(new Set((enrollData || []).map((e: { course_id: string }) => e.course_id)));
          const map: Record<string, number> = {};
          (enrollData || []).forEach((e: { course_id: string; progress_pct: number }) => {
            map[e.course_id] = e.progress_pct ?? 0;
          });
          setProgressMap(map);
        } else {
          setEnrolled(new Set());
          setProgressMap({});
        }
      } catch {
        setCourses([]);
        setPaths([]);
        setPathCourses([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user?.id]);

  const courseTitle = (course: Course) =>
    lang === "ar" && course.title_ar ? course.title_ar : course.title;

  const courseDesc = (course: Course) =>
    lang === "ar" && course.description_ar ? course.description_ar : course.description;

  const pathTitle = (path: LearningPath) =>
    lang === "ar" && path.title_ar ? path.title_ar : path.title;

  const pathDesc = (path: LearningPath) =>
    lang === "ar" && path.description_ar ? path.description_ar : path.description;

  const enroll = async (courseId: string, pathId?: string) => {
    if (!user) {
      toast.message(t("courses.enroll.signin"));
      return;
    }
    setEnrollingId(courseId);
    const { error } = await supabase.from("course_enrollments").upsert(
      {
        user_id: user.id,
        course_id: courseId,
        path_id: pathId || null,
        status: "enrolled",
        progress_pct: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,course_id" },
    );
    setEnrollingId(null);
    if (error) toast.error(error.message);
    else {
      toast.success(t("courses.enroll.success"));
      setEnrolled((prev) => new Set(prev).add(courseId));
      setProgressMap((prev) => ({ ...prev, [courseId]: prev[courseId] ?? 0 }));
    }
  };

  const updateProgress = async (courseId: string, progress_pct: number) => {
    if (!user) return;
    const status =
      progress_pct >= 100 ? "completed" : progress_pct > 0 ? "in_progress" : "enrolled";
    const { error } = await supabase
      .from("course_enrollments")
      .update({ progress_pct, status, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("course_id", courseId);
    if (error) toast.error(error.message);
    else {
      setProgressMap((prev) => ({ ...prev, [courseId]: progress_pct }));
      toast.success(t("courses.progress.saved"));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-28 pb-10 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("general.back")}
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <Badge className="bg-primary/10 text-primary border-0 px-3 py-1">
              {t("courses.tag")}
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            {t("courses.title")}
          </h1>
          <p className="text-muted-foreground max-w-xl">{t("courses.desc")}</p>
        </div>
      </section>

      <section className="py-10 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
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
                      const linked = pathCourses
                        .filter((pc) => pc.path_id === path.id)
                        .map((pc) => courses.find((c) => c.id === pc.course_id))
                        .filter(Boolean) as Course[];
                      return (
                        <Card key={path.id} className="border-primary/15">
                          <CardContent className="p-5 space-y-3">
                            <Badge variant="secondary">{path.level}</Badge>
                            <h3 className="font-semibold text-foreground">{pathTitle(path)}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-3">{pathDesc(path)}</p>
                            <p className="text-xs text-muted-foreground">
                              {linked.length} {t("courses.path_courses")}
                            </p>
                            {linked.slice(0, 3).map((c) => (
                              <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
                                <span className="truncate">{courseTitle(c)}</span>
                                {enrolled.has(c.id) ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    disabled={enrollingId === c.id}
                                    onClick={() => enroll(c.id, path.id)}
                                  >
                                    {enrollingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : t("courses.enroll")}
                                  </Button>
                                )}
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {courses.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-10 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                      {t("courses.empty")}
                    </h2>
                    <p className="text-muted-foreground">{t("courses.empty_desc")}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">{t("courses.all")}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                      <Card
                        key={course.id}
                        className="border border-border overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {course.image_url ? (
                          <div className="aspect-video bg-secondary/50 overflow-hidden">
                            <img
                              src={course.image_url}
                              alt={courseTitle(course)}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="aspect-video bg-primary/5 flex items-center justify-center">
                            <BookOpen className="w-12 h-12 text-primary/40" />
                          </div>
                        )}
                        <CardContent className="p-5">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <Badge variant="secondary">{course.level}</Badge>
                            {course.premium && (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                                {t("courses.premium")}
                              </Badge>
                            )}
                          </div>
                          <h2 className="text-lg font-semibold text-foreground mb-2">
                            {courseTitle(course)}
                          </h2>
                          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                            {courseDesc(course)}
                          </p>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="w-3.5 h-3.5" />
                              {course.duration_hours} {t("courses.hours")}
                            </div>
                            {enrolled.has(course.id) ? (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 border-0 gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {t("courses.enrolled")}
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                disabled={enrollingId === course.id}
                                onClick={() => enroll(course.id)}
                              >
                                {enrollingId === course.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  t("courses.enroll")
                                )}
                              </Button>
                            )}
                          </div>
                          {enrolled.has(course.id) && (
                            <div className="mt-4 space-y-2">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{t("courses.progress")}</span>
                                <span>{progressMap[course.id] ?? 0}%</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                step={10}
                                value={progressMap[course.id] ?? 0}
                                onChange={(e) => updateProgress(course.id, Number(e.target.value))}
                                className="w-full accent-primary"
                                aria-label={t("courses.progress")}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
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
