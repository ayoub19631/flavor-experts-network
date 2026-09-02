import { PUBLICATION_TYPES, type Publication, type PublicationAuthor, type BookChapter } from "./types";

export type PublishValidationError = { field: string; message: string };

export function validateForPublish(input: {
  publication: Pick<Publication, "title" | "slug" | "type" | "primary_language" | "abstract" | "description" | "cover_image_path">;
  authors: Array<Pick<PublicationAuthor, "full_name">>;
  categories: string[];
  chapters?: Array<Pick<BookChapter, "id" | "slug">>;
}): PublishValidationError[] {
  const errors: PublishValidationError[] = [];
  if (!input.publication.title?.trim()) errors.push({ field: "title", message: "Title is required." });
  if (!input.publication.slug?.trim()) errors.push({ field: "slug", message: "A unique slug is required." });
  if (!PUBLICATION_TYPES.includes(input.publication.type)) errors.push({ field: "type", message: "Content type is required." });
  if (!input.publication.primary_language) errors.push({ field: "language", message: "Primary language is required." });
  if (!input.publication.abstract?.trim() && !input.publication.description?.trim()) {
    errors.push({ field: "abstract", message: "Abstract or description is required." });
  }
  if (input.authors.filter((author) => author.full_name.trim()).length < 1) {
    errors.push({ field: "authors", message: "At least one author is required." });
  }
  if (input.categories.length < 1) {
    errors.push({ field: "categories", message: "At least one category is required." });
  }
  if (input.publication.type === "book") {
    if (!input.publication.cover_image_path) {
      errors.push({ field: "cover", message: "A cover image is required for books." });
    }
    if (!input.chapters?.length) {
      errors.push({ field: "chapters", message: "At least one chapter is required for books." });
    }
  }
  return errors;
}
