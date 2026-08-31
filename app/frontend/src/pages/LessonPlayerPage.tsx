import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Markdown from "markdown-to-jsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import SoftPageLoader from "@/components/SoftPageLoader";
import TeachingDisclaimer from "@/components/academy/TeachingDisclaimer";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import {
  completeLesson,
  downloadText,
  enrollInCourse,
  fetchComments,
  fetchCourseBySlug,
  fetchCurriculum,
  fetchLabs,
  fetchLessonBundle,
  fetchModuleQuiz,
  fetchMyEnrollment,
  fetchMyLessonProgress,
  postComment,
  saveLessonProgress,
} from "@/lib/academy";
import type { AcademyCurriculumRow, AcademyLessonTranslation, KnowledgeCheck } from "@/lib/academy-types";
import { ACADEMY_DISCLAIMER, ACADEMY_REGULATORY_NOTE } from "@/lib/academy-types";
import { toast } from "sonner";

export default function LessonPlayerPage() {
  const { slug = "", lessonId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [translation, setTranslation] = useState<AcademyLessonTranslation | null>(null);
  const [rows, setRows] = useState<AcademyCurriculumRow[]>([]);
  const [progress, setProgress] = useState<{ lesson_id: string; status: string }[]>([]);
  const [comments, setComments] = useState<Array<{ id: string; body: string; created_at: string }>>([]);
  const [draft, setDraft] = useState("");
  const [quizId, setQuizId] = useState<string | null>(null);
  const [labId, setLabId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkChoice, setCheckChoice] = useState<number | null>(null);
  const [checkRevealed, setCheckRevealed] = useState(false);

  usePageMeta({
    title: translation?.title || t("academy.title"),
    description: translation?.objective || t("academy.desc"),
    path: `/learn/${slug}/${lessonId}`,
    noIndex: true,
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { course } = await fetchCourseBySlug(slug);
      if (!course) {
        setLoading(false);
        return;
      }
      let enrollment = await fetchMyEnrollment(course.id, user.id);
      if (!enrollment && course.status === "published") {
        await enrollInCourse(course.id);
        enrollment = await fetchMyEnrollment(course.id, user.id);
      }
      const language = lang === "ar" ? "ar" : "en";
      const [bundle, curriculum, mine, labs] = await Promise.all([
        fetchLessonBundle(lessonId, language),
        fetchCurriculum(course.id, language),
        fetchMyLessonProgress(course.id, user.id),
        fetchLabs(course.id),
      ]);
      if (cancelled) return;
      setCourseId(course.id);
      setTranslation(bundle.translation);
      setRows(curriculum.rows);
      setProgress(mine);
      const current = curriculum.rows.find((row) => row.lesson_id === lessonId);
      if (current) {
        const quiz = await fetchModuleQuiz(current.module_id);
        setQuizId(quiz?.id || null);
        setLabId(labs.find((lab) => lab.module_id === current.module_id)?.id || null);
      }
      setComments(await fetchComments(lessonId));
      await saveLessonProgress(lessonId, 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, lessonId, user?.id, lang]);

  const ordered = useMemo(
    () => [...rows].sort((a, b) => a.module_sort - b.module_sort || a.lesson_sort - b.lesson_sort),
    [rows],
  );
  const index = ordered.findIndex((row) => row.lesson_id === lessonId);
  const prev = index > 0 ? ordered[index - 1] : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
  const check = translation?.knowledge_check as KnowledgeCheck | null;
  const done = progress.some((item) => item.lesson_id === lessonId && item.status === "completed");

  const markComplete = async () => {
    setBusy(true);
    const { error } = await completeLesson(lessonId, 1);
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.success(t("academy.completed"));
      setProgress((prevRows) => [...prevRows.filter((row) => row.lesson_id !== lessonId), { lesson_id: lessonId, status: "completed" }]);
    }
  };

  const submitComment = async () => {
    if (!user || !courseId || draft.trim().length < 2) return;
    const { error } = await postComment({
      lesson_id: lessonId,
      course_id: courseId,
      author_id: user.id,
      body: draft.trim(),
    });
    if (error) toast.error(error);
    else {
      setDraft("");
      setComments(await fetchComments(lessonId));
    }
  };

  if (loading) return <><Navbar /><SoftPageLoader /></>;
  if (!translation) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-28 text-center">
          <p className="mb-4">{t("academy.empty")}</p>
          <Button asChild><Link to="/courses">{t("academy.title")}</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 max-w-6xl mx-auto px-4 grid lg:grid-cols-[260px_1fr] gap-6">
        <aside className="lg:sticky lg:top-24 h-fit rounded-xl border p-3 space-y-2">
          {ordered.map((row) => {
            const isCurrent = row.lesson_id === lessonId;
            const isDone = progress.some((item) => item.lesson_id === row.lesson_id && item.status === "completed");
            return (
              <Link
                key={row.lesson_id}
                to={`/learn/${slug}/${row.lesson_id}`}
                className={`block rounded-lg px-3 py-2 text-sm ${isCurrent ? "bg-primary/10 text-primary" : "hover:bg-secondary"}`}
              >
                <span className="inline-flex items-center gap-2">
                  {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  <span className="line-clamp-2">{row.lesson_title}</span>
                </span>
              </Link>
            );
          })}
        </aside>
        <main className="space-y-6 min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{ordered[index]?.module_title}</p>
          <h1 className="text-2xl font-bold">{translation.title}</h1>
          {translation.objective && (
            <p className="text-sm text-muted-foreground"><strong>{t("academy.objective")}: </strong>{translation.objective}</p>
          )}
          <TeachingDisclaimer />
          {translation.body && (
            <article className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              <Markdown>{translation.body}</Markdown>
            </article>
          )}
          {translation.worked_example && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <h2 className="font-semibold">{t("academy.example")}</h2>
                <p className="text-sm whitespace-pre-wrap">{translation.worked_example}</p>
              </CardContent>
            </Card>
          )}
          {check && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h2 className="font-semibold">{t("academy.knowledge")}</h2>
                <p className="text-sm">{check.question}</p>
                <div className="space-y-2">
                  {check.options.map((option, optionIndex) => (
                    <label key={option} className="flex items-start gap-2 text-sm">
                      <input
                        type="radio"
                        name="knowledge"
                        checked={checkChoice === optionIndex}
                        onChange={() => setCheckChoice(optionIndex)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
                <Button size="sm" variant="outline" onClick={() => setCheckRevealed(true)} disabled={checkChoice === null}>
                  {t("academy.submit")}
                </Button>
                {checkRevealed && (
                  <p className="text-sm">
                    {checkChoice === check.correct_index ? t("academy.passed") : t("academy.failed")}
                    {check.explanation ? ` — ${check.explanation}` : ""}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                downloadText(
                  `${translation.title}.txt`,
                  `${translation.title}\n\n${translation.summary || ""}\n\n${ACADEMY_DISCLAIMER}\n${ACADEMY_REGULATORY_NOTE}`,
                )
              }
            >
              <Download className="w-4 h-4 me-2" />
              {t("academy.download_summary")}
            </Button>
            {quizId && (
              <Button asChild variant="outline"><Link to={`/learn/${slug}/quiz/${quizId}`}>{t("academy.quiz")}</Link></Button>
            )}
            {labId && (
              <Button asChild variant="outline"><Link to={`/learn/${slug}/lab/${labId}`}>{t("academy.lab")}</Link></Button>
            )}
            <Button asChild variant="outline"><Link to={`/learn/${slug}/capstone`}>{t("academy.capstone")}</Link></Button>
          </div>
          <section className="space-y-3">
            <h2 className="font-semibold">{t("academy.discussion")}</h2>
            {comments.map((comment) => (
              <p key={comment.id} className="text-sm rounded-lg bg-secondary/50 p-3 whitespace-pre-wrap">{comment.body}</p>
            ))}
            <Textarea rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={t("academy.comment_ph")} />
            <Button size="sm" onClick={submitComment}>{t("academy.comment_post")}</Button>
          </section>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
            <Button variant="outline" disabled={!prev} onClick={() => prev && navigate(`/learn/${slug}/${prev.lesson_id}`)}>
              <ChevronLeft className="w-4 h-4 me-1" /> {t("academy.prev")}
            </Button>
            <Button onClick={markComplete} disabled={busy || done}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? t("academy.completed") : t("academy.complete")}
            </Button>
            <Button variant="outline" disabled={!next} onClick={() => next && navigate(`/learn/${slug}/${next.lesson_id}`)}>
              {t("academy.next")} <ChevronRight className="w-4 h-4 ms-1" />
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}
