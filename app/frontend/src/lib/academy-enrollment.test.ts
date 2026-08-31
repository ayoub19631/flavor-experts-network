import { describe, expect, it } from "vitest";
import { computeEnrollmentProgress, isCourseComplete } from "./academy-progress";
import { assertEnrollmentAllowed, canIssueCertificate, scoreQuizAttempt } from "./academy-quiz";

const requirements = {
  publishedLessons: 20,
  requiredQuizzes: 10,
  requiredLabs: 5,
  requiresCapstone: true,
};

describe("academy enrollment to completion", () => {
  it("rejects draft enrollment and allows published free enrollment", () => {
    expect(
      assertEnrollmentAllowed({
        signedIn: true,
        emailVerified: true,
        courseStatus: "draft",
        premium: false,
        platformAlwaysFree: true,
      }).ok,
    ).toBe(false);
    expect(
      assertEnrollmentAllowed({
        signedIn: true,
        emailVerified: true,
        courseStatus: "published",
        premium: false,
        platformAlwaysFree: true,
      }),
    ).toEqual({ ok: true });
  });

  it("reaches 100% only after lessons, quizzes, labs, and capstone", () => {
    const lessons = Array.from({ length: 20 }, (_, index) => ({
      lesson_id: `l${index + 1}`,
      status: "completed" as const,
    }));
    const quizzes = Array.from({ length: 10 }, (_, index) => ({
      quiz_id: `q${index + 1}`,
      passed: true,
    }));
    const incomplete = {
      lessons,
      quizzes,
      labSubmissions: 5,
      capstoneSubmitted: false,
      requirements,
    };
    expect(isCourseComplete(incomplete)).toBe(false);
    expect(canIssueCertificate({ enrolled: true, complete: false, alreadyIssued: false })).toBe(false);

    const complete = { ...incomplete, capstoneSubmitted: true };
    expect(computeEnrollmentProgress(complete)).toBe(100);
    expect(isCourseComplete(complete)).toBe(true);
    expect(canIssueCertificate({ enrolled: true, complete: true, alreadyIssued: false })).toBe(true);
  });

  it("scores a module quiz to the passing threshold", () => {
    const choices = [
      { id: "c1", question_id: "q1", is_correct: true },
      { id: "w1", question_id: "q1", is_correct: false },
      { id: "c2", question_id: "q2", is_correct: true },
      { id: "w2", question_id: "q2", is_correct: false },
      { id: "c3", question_id: "q3", is_correct: true },
      { id: "w3", question_id: "q3", is_correct: false },
    ];
    const passed = scoreQuizAttempt(
      [
        { question_id: "q1", answer_id: "c1" },
        { question_id: "q2", answer_id: "c2" },
        { question_id: "q3", answer_id: "w3" },
      ],
      choices,
      70,
    );
    expect(passed.percent).toBe(67);
    expect(passed.passed).toBe(false);
    const allCorrect = scoreQuizAttempt(
      [
        { question_id: "q1", answer_id: "c1" },
        { question_id: "q2", answer_id: "c2" },
        { question_id: "q3", answer_id: "c3" },
      ],
      choices,
      70,
    );
    expect(allCorrect.percent).toBe(100);
    expect(allCorrect.passed).toBe(true);
  });
});
