import { test, expect } from "@playwright/test";

const PUBLIC_HUBS = [
  "/",
  "/community",
  "/insights",
  "/publications",
  "/members",
  "/companies",
  "/jobs",
  "/forum",
  "/marketplace",
  "/market",
  "/events",
  "/discover",
  "/consultations",
  "/search",
];

test.describe("phase 9 professional polish", () => {
  test("legacy library URLs redirect to the canonical publications tree", async ({ page }) => {
    await page.goto("/library?q=vanilla", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/publications(\?q=vanilla)?/);
    await expect(page.locator("main#main-content")).toHaveCount(1);

    await page.goto("/books", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/publications\/books/);

    await page.goto("/research", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/publications\/research/);
  });

  test("footer exposes marketplace, events, and discover", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const footer = page.locator("footer");
    await expect(footer.locator('a[href="/marketplace"]')).toBeVisible({ timeout: 20_000 });
    await expect(footer.locator('a[href="/events"]')).toBeVisible();
    await expect(footer.locator('a[href="/discover"]')).toBeVisible();
    await expect(footer.locator('a[href="/admin"]')).toHaveCount(0);
  });

  test("skip link and main landmark exist", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator('a[href="#main-content"]')).toHaveCount(1);
    await expect(page.locator("main#main-content")).toHaveCount(1);
  });

  test("public hubs have no horizontal overflow at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    for (const path of ["/", "/marketplace", "/publications", "/jobs", "/community"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main#main-content")).toHaveCount(1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(overflow, `${path} overflowed at 320px`).toBeFalsy();
    }
  });

  test("marketplace lists distinguish loading from empty", async ({ page }) => {
    await page.goto("/marketplace/suppliers", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Suppliers|الموردون/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Loading listings|جارٍ تحميل القوائم|No public listings|لا توجد قوائم عامة|Could not load listings|تعذر تحميل القوائم/i)).toBeVisible({ timeout: 20_000 });
  });

  test("arabic marketplace and publications stay RTL without raw i18n keys", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("fen-lang", "ar"));
    await page.goto("/marketplace", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("body")).not.toContainText(/mp\.title|dash\.title|nav\.marketplace/);
    await page.goto("/publications", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("body")).not.toContainText(/library\.title|nav\.library/);
  });

  test("light and dark public hubs keep a main landmark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/marketplace", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/publications", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main#main-content")).toHaveCount(1);
  });

  test("member dashboards stay behind auth and preserve the requested tab", async ({ page }) => {
    await page.goto("/dashboard?tab=profile", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth|\/dashboard|\/verify-email/i);
    if (/\/auth/.test(page.url())) {
      expect(decodeURIComponent(page.url())).toMatch(/next=.*dashboard.*tab=profile|mode=login/);
    }
  });

  test("public route inventory stays reachable", async ({ page }) => {
    for (const path of PUBLIC_HUBS) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 200, path).toBeLessThan(500);
      await expect(page.locator("main#main-content")).toHaveCount(1);
    }
  });
});
