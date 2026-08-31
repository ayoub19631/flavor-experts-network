export type LessonProgressRecord = {
  lesson_id: string;
  status: "not_started" | "in_progress" | "completed";
};

export type QuizAttemptRecord = {
  quiz_id: string;
  passed: boolean;
};

export type RequirementCounts = {
  publishedLessons: number;
  requiredQuizzes: number;
  requiredLabs: number;
  requiresCapstone: boolean;
};

export type CompletionInput = {
  lessons: LessonProgressRecord[];
  quizzes: QuizAttemptRecord[];
  labSubmissions: number;
  capstoneSubmitted: boolean;
  requirements: RequirementCounts;
};

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function countCompletedLessons(lessons: LessonProgressRecord[]): number {
  return lessons.filter((lesson) => lesson.status === "completed").length;
}

export function countPassedQuizzes(quizzes: QuizAttemptRecord[], requiredQuizIds: string[]): number {
  const passed = new Set(quizzes.filter((quiz) => quiz.passed).map((quiz) => quiz.quiz_id));
  return requiredQuizIds.filter((id) => passed.has(id)).length;
}

export function computeEnrollmentProgress(input: CompletionInput): number {
  const { requirements } = input;
  const total =
    requirements.publishedLessons +
    requirements.requiredQuizzes +
    requirements.requiredLabs +
    (requirements.requiresCapstone ? 1 : 0);
  if (total === 0) return 0;

  const done =
    Math.min(countCompletedLessons(input.lessons), requirements.publishedLessons) +
    Math.min(input.quizzes.filter((quiz) => quiz.passed).length, requirements.requiredQuizzes) +
    Math.min(input.labSubmissions, requirements.requiredLabs) +
    (requirements.requiresCapstone && input.capstoneSubmitted ? 1 : 0);

  return clampPercent((done / total) * 100);
}

export function isCourseComplete(input: CompletionInput): boolean {
  const { requirements } = input;
  if (countCompletedLessons(input.lessons) < requirements.publishedLessons) return false;
  if (input.quizzes.filter((quiz) => quiz.passed).length < requirements.requiredQuizzes) return false;
  if (input.labSubmissions < requirements.requiredLabs) return false;
  if (requirements.requiresCapstone && !input.capstoneSubmitted) return false;
  return requirements.publishedLessons > 0;
}

export function enrollmentStatus(progressPct: number, complete: boolean): "enrolled" | "in_progress" | "completed" {
  if (complete || progressPct >= 100) return "completed";
  if (progressPct > 0) return "in_progress";
  return "enrolled";
}

export function nextLessonId(
  orderedLessonIds: string[],
  progress: LessonProgressRecord[],
): string | null {
  if (orderedLessonIds.length === 0) return null;
  const completed = new Set(
    progress.filter((item) => item.status === "completed").map((item) => item.lesson_id),
  );
  return orderedLessonIds.find((id) => !completed.has(id)) || orderedLessonIds[orderedLessonIds.length - 1];
}
