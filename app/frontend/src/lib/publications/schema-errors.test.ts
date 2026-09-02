import { describe, expect, it } from "vitest";
import { isMissingSchemaError } from "./schema-errors";

describe("publication schema errors", () => {
  it("treats a missing publications table as an empty catalog, not a hard failure", () => {
    expect(isMissingSchemaError('relation "public.publications" does not exist')).toBe(true);
    expect(isMissingSchemaError("Could not find the table 'public.publication_categories' in the schema cache")).toBe(true);
    expect(isMissingSchemaError("permission denied")).toBe(false);
  });
});
