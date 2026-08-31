import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import SoftPageLoader from "@/components/SoftPageLoader";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { fetchMyEnrollments, pickLocalized } from "@/lib/academy";
import { supabase } from "@/lib/supabase";
import type { AcademyCourse, AcademyEnrollment } from "@/lib/academy-types";

export default function LearningDashboardPage() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  usePageMeta({ title: t("academy.dashboard"), description: t("academy.desc"), path: "/learn" });
  const [rows, setRows] = useState<Array<AcademyEnrollment & { course?: AcademyCourse }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const enrollments = await fetchMyEnrollments(user.id);
      const ids = enrollments.map((item) => item.course_id);
      const { data } = ids.length
        ? await supabase.from("courses").select("*").in("id", ids)
        : { data: [] };
      const courses = new Map(((data as AcademyCourse[]) || []).map((course) => [course.id, course]));
      setRows(enrollments.map((item) => ({ ...item, course: courses.get(item.course_id) })));
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return <><Navbar /><SoftPageLoader /></>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 max-w-4xl mx-auto px-4 space-y-6">
        <h1 className="text-3xl font-bold">{t("academy.dashboard")}</h1>
        {rows.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center space-y-3">
              <p>{t("academy.dashboard.empty")}</p>
              <Button asChild><Link to="/courses">{t("academy.title")}</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <Card key={row.id}>
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">
                      {pickLocalized(lang, row.course?.title, row.course?.title_ar) || t("academy.title")}
                    </h2>
                    <p className="text-sm text-muted-foreground">{t("academy.progress")}: {row.progress_pct}%</p>
                    <div className="mt-2 h-1.5 w-48 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${row.progress_pct}%` }} />
                    </div>
                  </div>
                  {row.course?.slug && (
                    <Button asChild>
                      <Link to={row.last_lesson_id ? `/learn/${row.course.slug}/${row.last_lesson_id}` : `/courses/${row.course.slug}`}>
                        {row.status === "completed" ? t("academy.certificate") : t("academy.resume")}
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
