export type QuizChoice = {
  id: string;
  question_id: string;
  is_correct: boolean;
};

export type QuizAnswerSubmission = {
  question_id: string;
  answer_id: string;
};

export type QuizScoreResult = {
  total: number;
  correct: number;
  percent: number;
  passed: boolean;
  details: Array<{ question_id: string; answer_id: string; correct: boolean }>;
};

export function scoreQuizAttempt(
  submissions: QuizAnswerSubmission[],
  choices: QuizChoice[],
  passPercent = 70,
): QuizScoreResult {
  const correctByQuestion = new Map<string, string>();
  for (const choice of choices) {
    if (choice.is_correct) correctByQuestion.set(choice.question_id, choice.id);
  }

  const seen = new Set<string>();
  const details: QuizScoreResult["details"] = [];
  for (const submission of submissions) {
    if (seen.has(submission.question_id)) continue;
    seen.add(submission.question_id);
    const expected = correctByQuestion.get(submission.question_id);
    details.push({
      question_id: submission.question_id,
      answer_id: submission.answer_id,
      correct: Boolean(expected) && expected === submission.answer_id,
    });
  }

  const total = correctByQuestion.size;
  const correct = details.filter((item) => item.correct).length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return {
    total,
    correct,
    percent,
    passed: percent >= passPercent,
    details,
  };
}

export function assertEnrollmentAllowed(input: {
  signedIn: boolean;
  emailVerified: boolean;
  courseStatus: string;
  premium: boolean;
  platformAlwaysFree: boolean;
}): { ok: true } | { ok: false; reason: "signin" | "verify" | "unpublished" | "paid" } {
  if (!input.signedIn) return { ok: false, reason: "signin" };
  if (!input.emailVerified) return { ok: false, reason: "verify" };
  if (input.courseStatus !== "published") return { ok: false, reason: "unpublished" };
  if (input.premium && !input.platformAlwaysFree) return { ok: false, reason: "paid" };
  return { ok: true };
}

export function canIssueCertificate(input: {
  enrolled: boolean;
  complete: boolean;
  alreadyIssued: boolean;
}): boolean {
  return input.enrolled && input.complete && !input.alreadyIssued;
}
