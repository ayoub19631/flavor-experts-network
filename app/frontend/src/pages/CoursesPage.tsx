import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Clock, Loader2, GraduationCap } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import type { Course } from "@/lib/types";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";

export default function CoursesPage() {
  const { t, lang } = useI18n();
  usePageMeta({ title: t("courses.title"), description: t("courses.desc"), path: "/courses" });

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false });

        if (error || !data) {
          setCourses([]);
        } else {
          setCourses(data as Course[]);
        }
      } catch {
        setCourses([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const courseTitle = (course: Course) =>
    lang === "ar" && course.title_ar ? course.title_ar : course.title;

  const courseDesc = (course: Course) =>
    lang === "ar" && course.description_ar ? course.description_ar : course.description;

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : courses.length === 0 ? (
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
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {course.duration_hours} {t("courses.hours")}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
