import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Clock, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import FooterSection from "@/components/FooterSection";
import TeachingDisclaimer from "@/components/academy/TeachingDisclaimer";
import SoftPageLoader from "@/components/SoftPageLoader";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import {
  enrollInCourse,
  fetchCourseBySlug,
  fetchCourseTranslations,
  fetchCurriculum,
  fetchMyEnrollment,
  fetchMyLessonProgress,
  pickLocalized,
} from "@/lib/academy";
import type { AcademyCourse, AcademyCurriculumRow, AcademyEnrollment, AcademyTranslation } from "@/lib/academy-types";
import { toast } from "sonner";

export default function CourseDetailPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { user, isEmailVerified, isAdmin } = useAuth();
  const { t, lang } = useI18n();
  const [course, setCourse] = useState<AcademyCourse | null>(null);
  const [translation, setTranslation] = useState<AcademyTranslation | null>(null);
  const [rows, setRows] = useState<AcademyCurriculumRow[]>([]);
  const [enrollment, setEnrollment] = useState<AcademyEnrollment | null>(null);
  const [progress, setProgress] = useState<{ lesson_id: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  usePageMeta({
    title: translation?.title || course?.title || t("academy.title"),
    description: translation?.description || course?.description || t("academy.desc"),
    path: `/courses/${slug}`,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { course: found } = await fetchCourseBySlug(slug);
      if (!found || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }
      const [translations, curriculum, mine] = await Promise.all([
        fetchCourseTranslations(found.id),
        fetchCurriculum(found.id, lang === "ar" ? "ar" : "en"),
        user ? fetchMyEnrollment(found.id, user.id) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setCourse(found);
      setTranslation(translations.find((item) => item.language === (lang === "ar" ? "ar" : "en")) || translations[0] || null);
      setRows(curriculum.rows);
      setEnrollment(mine);
      if (user && mine) setProgress(await fetchMyLessonProgress(found.id, user.id));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, user?.id, lang]);

  const grouped = useMemo(() => {
    const map = new Map<string, AcademyCurriculumRow[]>();
    rows.forEach((row) => {
      const list = map.get(row.module_id) || [];
      list.push(row);
      map.set(row.module_id, list);
    });
    return [...map.entries()];
  }, [rows]);

  const resumeId = enrollment?.last_lesson_id || rows[0]?.lesson_id;

  const enroll = async () => {
    if (!user) {
      navigate("/auth?mode=login");
      return;
    }
    if (!isEmailVerified) {
      navigate("/verify-email");
      return;
    }
    if (!course) return;
    setBusy(true);
    const { error } = await enrollInCourse(course.id);
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.success(t("courses.enroll.success"));
      const mine = await fetchMyEnrollment(course.id, user.id);
      setEnrollment(mine);
    }
  };

  if (loading) return <><Navbar /><SoftPageLoader /></>;
  if (!course || (course.status !== "published" && !isAdmin)) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-28 max-w-xl mx-auto px-4 text-center space-y-3">
          <h1 className="text-2xl font-bold">{t("academy.empty")}</h1>
          <Button asChild><Link to="/courses">{t("general.back")}</Link></Button>
        </div>
      </div>
    );
  }

  const published = course.status === "published";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <Link to="/courses" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> {t("academy.title")}
        </Link>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{t(`academy.level.${course.level}`)}</Badge>
          <Badge className={published ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 border-0" : "bg-secondary text-muted-foreground border-0"}>
            {published ? t("academy.status.published") : t("academy.status.draft")}
          </Badge>
        </div>
        <h1 className="text-3xl font-bold">{translation?.title || pickLocalized(lang, course.title, course.title_ar)}</h1>
        <p className="text-muted-foreground">{translation?.subtitle}</p>
        <p>{translation?.description || pickLocalized(lang, course.description, course.description_ar)}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {course.estimated_minutes || Math.round((course.duration_hours || 1) * 60)} {t("academy.minutes")}
        </div>
        <TeachingDisclaimer />
        {translation?.outcomes && (
          <section>
            <h2 className="font-semibold mb-2">{t("academy.outcomes")}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{translation.outcomes}</p>
          </section>
        )}
        {translation?.audience && (
          <section>
            <h2 className="font-semibold mb-2">{t("academy.audience")}</h2>
            <p className="text-sm text-muted-foreground">{translation.audience}</p>
          </section>
        )}
        <div className="flex flex-wrap gap-2">
          {published && enrollment ? (
            <Button onClick={() => resumeId && navigate(`/learn/${course.slug}/${resumeId}`)}>
              {t("academy.resume")}
            </Button>
          ) : published ? (
            <Button onClick={enroll} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : t("academy.enroll")}
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link to={`/admin/academy/${course.id}?preview=1`}>{t("admin.academy.preview")}</Link>
            </Button>
          )}
          {!user && (
            <Button asChild variant="outline">
              <Link to="/auth?mode=login">{t("academy.signin")}</Link>
            </Button>
          )}
        </div>
        {enrollment && (
          <p className="text-sm">{t("academy.progress")}: {enrollment.progress_pct}%</p>
        )}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t("academy.curriculum")}</h2>
          {grouped.map(([moduleId, lessons]) => (
            <Card key={moduleId}>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-medium">{lessons[0]?.module_title}</h3>
                <ol className="space-y-1 text-sm">
                  {lessons
                    .sort((a, b) => a.lesson_sort - b.lesson_sort)
                    .map((lesson) => {
                      const done = progress.some((item) => item.lesson_id === lesson.lesson_id && item.status === "completed");
                      return (
                        <li key={lesson.lesson_id} className="flex items-center justify-between gap-3">
                          <span>{lesson.lesson_title}</span>
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            {done && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            {lesson.estimated_minutes} {t("academy.minutes")}
                          </span>
                        </li>
                      );
                    })}
                </ol>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
      <FooterSection />
    </div>
  );
}
