import { describe, expect, it } from "vitest";
import { validateForPublish } from "./validation";

describe("publish validation", () => {
  it("requires book cover, chapter, author, and category", () => {
    const errors = validateForPublish({
      publication: {
        title: "Flavor Creation Fundamentals – Volume 1",
        slug: "flavor-creation-fundamentals-volume-1",
        type: "book",
        primary_language: "en",
        abstract: "Draft only",
        description: null,
        cover_image_path: null,
      },
      authors: [],
      categories: [],
      chapters: [],
    });
    expect(errors.map((item) => item.field)).toEqual(expect.arrayContaining(["authors", "categories", "cover", "chapters"]));
  });
});
