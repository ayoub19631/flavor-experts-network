import { describe, expect, it } from "vitest";
import { PLATFORM_ROUTES, canonicalLibraryPath, isLibraryNavPath } from "./platform-routes";

describe("platform routes inventory", () => {
  it("keeps unique path records", () => {
    const paths = PLATFORM_ROUTES.map((route) => route.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("maps legacy library URLs to the canonical publications tree", () => {
    expect(canonicalLibraryPath("/library")).toBe("/publications");
    expect(canonicalLibraryPath("/books")).toBe("/publications/books");
    expect(canonicalLibraryPath("/research")).toBe("/publications/research");
    expect(canonicalLibraryPath("/books/flavor-science")).toBe("/publications/flavor-science");
    expect(canonicalLibraryPath("/research/vanilla-notes")).toBe("/publications/vanilla-notes");
    expect(canonicalLibraryPath("/my-library")).toBe("/dashboard/publications");
    expect(canonicalLibraryPath("/my-library/abc")).toBe("/dashboard/publications/abc");
    expect(canonicalLibraryPath("/books/slug/chapters/one")).toBeNull();
    expect(canonicalLibraryPath("/publications")).toBeNull();
  });

  it("marks library aliases as the library nav section", () => {
    expect(isLibraryNavPath("/publications")).toBe(true);
    expect(isLibraryNavPath("/publications/books")).toBe(true);
    expect(isLibraryNavPath("/library")).toBe(true);
    expect(isLibraryNavPath("/books/sample")).toBe(true);
    expect(isLibraryNavPath("/research")).toBe(true);
    expect(isLibraryNavPath("/policies/publication-ethics")).toBe(true);
    expect(isLibraryNavPath("/marketplace")).toBe(false);
  });
});
