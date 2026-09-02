import { describe, expect, it } from "vitest";
import { markdownToSafeHtml, sanitizePublicationHtml } from "./sanitize";

describe("publication sanitizer", () => {
  it("strips scripts and event handlers", () => {
    const html = sanitizePublicationHtml(`<p onclick="alert(1)">Safe</p><script>alert(2)</script><a href="javascript:alert(3)">x</a>`);
    expect(html).not.toMatch(/script|onclick|javascript/i);
    expect(html).toContain("<p>Safe</p>");
  });

  it("keeps safe markdown links", () => {
    const html = markdownToSafeHtml("See [docs](https://flavorexpertsnetwork.com/library)");
    expect(html).toContain("href=\"https://flavorexpertsnetwork.com/library\"");
    expect(html).toContain("rel=\"noopener noreferrer\"");
  });
});
