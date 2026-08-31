import { describe, expect, it } from "vitest";
import {
  computeEnrollmentProgress,
  enrollmentStatus,
  isCourseComplete,
  nextLessonId,
} from "./academy-progress";

const requirements = {
  publishedLessons: 2,
  requiredQuizzes: 1,
  requiredLabs: 1,
  requiresCapstone: true,
};

describe("academy progress", () => {
  it("starts at zero", () => {
    expect(
      computeEnrollmentProgress({
        lessons: [],
        quizzes: [],
        labSubmissions: 0,
        capstoneSubmitted: false,
        requirements,
      }),
    ).toBe(0);
  });

  it("counts completed lessons, passed quizzes, labs, and capstone", () => {
    const progress = computeEnrollmentProgress({
      lessons: [
        { lesson_id: "l1", status: "completed" },
        { lesson_id: "l2", status: "completed" },
      ],
      quizzes: [{ quiz_id: "q1", passed: true }],
      labSubmissions: 1,
      capstoneSubmitted: true,
      requirements,
    });
    expect(progress).toBe(100);
    expect(
      isCourseComplete({
        lessons: [
          { lesson_id: "l1", status: "completed" },
          { lesson_id: "l2", status: "completed" },
        ],
        quizzes: [{ quiz_id: "q1", passed: true }],
        labSubmissions: 1,
        capstoneSubmitted: true,
        requirements,
      }),
    ).toBe(true);
  });

  it("does not complete without the capstone", () => {
    expect(
      isCourseComplete({
        lessons: [
          { lesson_id: "l1", status: "completed" },
          { lesson_id: "l2", status: "completed" },
        ],
        quizzes: [{ quiz_id: "q1", passed: true }],
        labSubmissions: 1,
        capstoneSubmitted: false,
        requirements,
      }),
    ).toBe(false);
  });

  it("returns the next incomplete lesson", () => {
    expect(
      nextLessonId(["a", "b", "c"], [{ lesson_id: "a", status: "completed" }]),
    ).toBe("b");
  });

  it("maps enrollment status", () => {
    expect(enrollmentStatus(0, false)).toBe("enrolled");
    expect(enrollmentStatus(40, false)).toBe("in_progress");
    expect(enrollmentStatus(100, true)).toBe("completed");
  });
});
