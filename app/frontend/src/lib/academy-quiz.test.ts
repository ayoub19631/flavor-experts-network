import { describe, expect, it } from "vitest";
import { assertEnrollmentAllowed, canIssueCertificate, scoreQuizAttempt } from "./academy-quiz";

const choices = [
  { id: "a1", question_id: "q1", is_correct: true },
  { id: "a2", question_id: "q1", is_correct: false },
  { id: "b1", question_id: "q2", is_correct: false },
  { id: "b2", question_id: "q2", is_correct: true },
];

describe("academy quiz scoring", () => {
  it("scores a perfect attempt as passed", () => {
    const result = scoreQuizAttempt(
      [
        { question_id: "q1", answer_id: "a1" },
        { question_id: "q2", answer_id: "b2" },
      ],
      choices,
      70,
    );
    expect(result.correct).toBe(2);
    expect(result.percent).toBe(100);
    expect(result.passed).toBe(true);
  });

  it("ignores duplicate answers for the same question", () => {
    const result = scoreQuizAttempt(
      [
        { question_id: "q1", answer_id: "a1" },
        { question_id: "q1", answer_id: "a2" },
        { question_id: "q2", answer_id: "b1" },
      ],
      choices,
      70,
    );
    expect(result.correct).toBe(1);
    expect(result.percent).toBe(50);
    expect(result.passed).toBe(false);
  });
});

describe("enrollment and certificate gates", () => {
  it("blocks unpublished courses", () => {
    expect(
      assertEnrollmentAllowed({
        signedIn: true,
        emailVerified: true,
        courseStatus: "draft",
        premium: false,
        platformAlwaysFree: true,
      }),
    ).toEqual({ ok: false, reason: "unpublished" });
  });

  it("allows signed-in verified members on published free courses", () => {
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

  it("issues a certificate only once after completion", () => {
    expect(canIssueCertificate({ enrolled: true, complete: true, alreadyIssued: false })).toBe(true);
    expect(canIssueCertificate({ enrolled: true, complete: true, alreadyIssued: true })).toBe(false);
  });
});
