import { test, expect } from "@playwright/test";

test.describe("phase 3 publications library", () => {
  for (const path of ["/library", "/books", "/research", "/policies", "/policies/publication-ethics"]) {
    test(`${path} is publicly reachable`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
      await expect(page.locator("main#main-content")).toHaveCount(1);
    });
  }

  test("draft book slug is not a public catalog hit", async ({ page }) => {
    await page.goto("/books/flavor-creation-fundamentals-volume-1", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /Flavor Creation Fundamentals/i })).toHaveCount(0);
  });

  test("guest cannot open the publications admin", async ({ page }) => {
    await page.goto("/admin/publications", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/(auth|admin)/);
    if (/\/admin/.test(page.url())) {
      await expect(page.getByText(/Access denied|تسجيل|Client Login|Sign/i).first()).toBeVisible({ timeout: 20_000 });
    }
  });

  test("library appears in the primary navigation", async ({ page }) => {
    await page.goto("/library", { waitUntil: "domcontentloaded" });
    const nav = page.locator("nav").first();
    await expect(nav.getByRole("link", { name: /Library|المكتبة/i }).first()).toBeVisible({ timeout: 20_000 });
    await expect(nav.getByRole("link", { name: /Academy|الأكاديمية/i })).toHaveCount(0);
  });

  test("sitemap lists library surfaces and not admin drafts", async ({ request, baseURL }) => {
    const origin = baseURL || "http://127.0.0.1:3000";
    const sitemap = await request.get(`${origin}/sitemap.xml`);
    expect(sitemap.ok()).toBeTruthy();
    const text = await sitemap.text();
    expect(text).toMatch(/\/library/);
    expect(text).toMatch(/\/books/);
    expect(text).toMatch(/\/research/);
    expect(text).not.toMatch(/\/admin\/publications/);
    expect(text).not.toMatch(/flavor-creation-fundamentals-volume-1/);
    const libraryHits = text.match(/\/library/g) || [];
    expect(libraryHits.length).toBeGreaterThanOrEqual(1);
  });
});
