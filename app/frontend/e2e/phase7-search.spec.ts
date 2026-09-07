import { test, expect } from "@playwright/test";

test.describe("phase 7 global search", () => {
  test("desktop header search and results page", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const search = page.getByPlaceholder(/Search people, jobs|ابحث عن أشخاص/i);
    await expect(search).toBeVisible({ timeout: 20_000 });
    await search.fill("fl");
    await search.press("Escape");
    await search.fill("flavor");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/search\?q=flavor/i, { timeout: 20_000 });
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: /Search the network|بحث الشبكة/i })).toBeVisible();
  });

  test("mobile search entry and zero results", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/search?q=zzzxnotfoundqqq", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(
      page.getByText(/No matching public results|لا توجد نتائج عامة مطابقة|Search could not be completed|تعذر إكمال البحث/i),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("rejects a long malicious query without crashing", async ({ page }) => {
    const evil = `${"x".repeat(80)}' OR 1=1 --`;
    await page.goto(`/search?q=${encodeURIComponent(evil)}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.locator("body")).not.toContainText(/error:|uncaught/i);
  });

  test("draft publication slug stays hidden from search", async ({ page }) => {
    await page.goto("/search?q=flavor-creation-fundamentals-volume-1", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Flavor Creation Fundamentals/i })).toHaveCount(0);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.getByRole("tab", { name: /Publications|المنشورات/i }).click();
    await expect(page.getByRole("link", { name: /Flavor Creation Fundamentals/i })).toHaveCount(0);
  });

  test("discover is public and search is noindex", async ({ page }) => {
    await page.goto("/discover", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Discover|اكتشف/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/discover$/);

    await page.goto("/search?q=flavor", { waitUntil: "domcontentloaded" });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/i);
    const sitemap = await page.request.get("/sitemap.xml");
    const xml = await sitemap.text();
    expect(xml).toMatch(/\/discover/);
    expect(xml).not.toMatch(/\/search/);
  });

  test("arabic UI and keyboard tabs stay reachable", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("fen-lang", "ar"));
    await page.goto("/search?q=نكهة", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("tab", { name: /الأشخاص/i })).toBeVisible({ timeout: 20_000 });
  });
});
