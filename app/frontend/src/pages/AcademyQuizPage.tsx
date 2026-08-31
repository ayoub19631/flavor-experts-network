import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import SoftPageLoader from "@/components/SoftPageLoader";
import { useI18n } from "@/lib/i18n";
import { usePageMeta } from "@/hooks/use-page-meta";
import { fetchQuiz, submitQuiz } from "@/lib/academy";
import { toast } from "sonner";

type QuizPayload = {
  id: string;
  title?: string;
  title_ar?: string;
  pass_percent: number;
  questions: Array<{
    id: string;
    prompt: string;
    prompt_ar?: string;
    choices: Array<{ id: string; body: string; body_ar?: string }>;
  }>;
};

export default function AcademyQuizPage() {
  const { slug = "", quizId = "" } = useParams();
  const { t, lang } = useI18n();
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ percent: number; passed: boolean; correct: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  usePageMeta({ title: t("academy.quiz"), path: `/learn/${slug}/quiz/${quizId}`, noIndex: true });

  useEffect(() => {
    (async () => {
      const { quiz: data, error } = await fetchQuiz(quizId);
      if (error) toast.error(error);
      setQuiz(data as QuizPayload | null);
      setLoading(false);
    })();
  }, [quizId]);

  const onSubmit = async () => {
    if (!quiz) return;
    const payload = quiz.questions.map((question) => ({
      question_id: question.id,
      answer_id: answers[question.id],
    })).filter((item) => item.answer_id);
    const { result: scored, error } = await submitQuiz(quiz.id, payload);
    if (error) toast.error(error);
    else setResult(scored as typeof result);
  };

  if (loading) return <><Navbar /><SoftPageLoader /></>;
  if (!quiz) return <><Navbar /><div className="pt-28 text-center">{t("academy.empty")}</div></>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 max-w-3xl mx-auto px-4 space-y-6">
        <h1 className="text-2xl font-bold">{lang === "ar" && quiz.title_ar ? quiz.title_ar : quiz.title || t("academy.quiz")}</h1>
        {quiz.questions.map((question, index) => (
          <Card key={question.id}>
            <CardContent className="p-4 space-y-3">
              <p className="font-medium">{index + 1}. {lang === "ar" && question.prompt_ar ? question.prompt_ar : question.prompt}</p>
              <div className="space-y-2">
                {(question.choices || []).map((choice) => (
                  <label key={choice.id} className="flex items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === choice.id}
                      onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: choice.id }))}
                    />
                    <span>{lang === "ar" && choice.body_ar ? choice.body_ar : choice.body}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        <Button onClick={onSubmit}>{t("academy.submit")}</Button>
        {result && (
          <p className="text-sm">
            {t("academy.score")}: {result.percent}% ({result.correct}/{result.total}) — {result.passed ? t("academy.passed") : t("academy.failed")}
          </p>
        )}
        <Button asChild variant="outline"><Link to={`/courses/${slug}`}>{t("general.back")}</Link></Button>
      </div>
    </div>
  );
}
