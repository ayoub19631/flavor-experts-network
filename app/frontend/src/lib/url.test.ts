import { describe, expect, it } from "vitest";
import { safeHttpUrl, isSafeHttpUrl, safeLinkedInUrl } from "./url";

describe("safeHttpUrl", () => {
  it("accepts a full https URL", () => {
    expect(safeHttpUrl("https://example.com/path?q=1")).toBe("https://example.com/path?q=1");
  });

  it("upgrades http to https", () => {
    expect(safeHttpUrl("http://example.com/x")).toBe("https://example.com/x");
  });

  it("assumes https for bare domains", () => {
    expect(safeHttpUrl("example.com/about")).toBe("https://example.com/about");
  });

  it("blocks javascript: URLs (stored XSS)", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
  });

  it("blocks data: URLs", () => {
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("blocks vbscript/file URLs", () => {
    expect(safeHttpUrl("vbscript:msgbox(1)")).toBeNull();
    expect(safeHttpUrl("file:///etc/passwd")).toBeNull();
  });

  it("rejects empty and whitespace input", () => {
    expect(safeHttpUrl("")).toBeNull();
    expect(safeHttpUrl("   ")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
  });

  it("rejects host-less and dot-less values", () => {
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl("localhost")).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(safeHttpUrl("  https://example.com  ")).toBe("https://example.com/");
  });
});

describe("isSafeHttpUrl", () => {
  it("mirrors safeHttpUrl nullability", () => {
    expect(isSafeHttpUrl("https://example.com")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("safeLinkedInUrl", () => {
  it("accepts linkedin profile URLs", () => {
    expect(safeLinkedInUrl("https://www.linkedin.com/in/jane-doe")).toBe(
      "https://www.linkedin.com/in/jane-doe",
    );
    expect(safeLinkedInUrl("linkedin.com/company/acme")).toBe("https://linkedin.com/company/acme");
  });

  it("rejects non-linkedin hosts", () => {
    expect(safeLinkedInUrl("https://evil-linkedin.com/in/x")).toBeNull();
    expect(safeLinkedInUrl("https://example.com")).toBeNull();
  });

  it("rejects unsafe schemes", () => {
    expect(safeLinkedInUrl("javascript:alert(1)")).toBeNull();
  });
});
