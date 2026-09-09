import { test, expect } from "@playwright/test";

const PUBLIC_PAGES = [
  "/",
  "/auth",
  "/terms",
  "/privacy",
  "/enterprise",
  "/community",
  "/insights",
  "/publications",
  "/publications/books",
  "/publications/research",
  "/policies",
  "/members",
  "/companies",
  "/jobs",
  "/forum",
  "/marketplace",
  "/marketplace/suppliers",
  "/marketplace/materials",
  "/market",
  "/blog",
  "/consultations",
  "/consultations/experts",
  "/events",
  "/discover",
  "/search",
  "/courses",
];

const REDIRECTS: Array<[string, RegExp]> = [
  ["/library", /\/publications/],
  ["/books", /\/publications\/books/],
  ["/research", /\/publications\/research/],
  ["/pricing", /\/$/],
  ["/learn", /\/insights/],
  ["/certificates", /\/insights/],
];

const PROTECTED = [
  "/dashboard",
  "/dashboard?tab=profile",
  "/dashboard?tab=posts",
  "/dashboard?tab=security",
  "/dashboard?tab=subscription",
  "/messages",
  "/notifications",
  "/notifications/preferences",
  "/verification",
  "/submit-publication",
  "/marketplace/rfq",
  "/dashboard/publications",
  "/dashboard/rfqs",
  "/dashboard/quotes",
  "/company/dashboard",
  "/supplier/catalog",
  "/supplier/quotes",
  "/admin",
  "/admin/ops",
  "/admin/verification",
  "/admin/marketplace",
  "/admin/publications",
];

test.describe("phase 9 closeout evidence", () => {
  test("visitor can open unique public pages", async ({ page }) => {
    for (const path of PUBLIC_PAGES) {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 200, path).toBeLessThan(400);
      await expect(page.locator("main#main-content, form, h1").first()).toBeVisible({ timeout: 20_000 });
    }
  });

  test("legacy aliases redirect instead of rendering a second page", async ({ page }) => {
    for (const [from, to] of REDIRECTS) {
      await page.goto(from, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(to, { timeout: 15_000 });
    }
  });

  test("protected routes are auth gates, not functional success", async ({ page }) => {
    for (const path of PROTECTED) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/auth|\/verify-email/, { timeout: 20_000 });
    }
  });

  test("unpublished slugs stay hidden to visitors", async ({ page }) => {
    await page.goto("/publications/__phase9-unpublished-draft__", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toContainText(/revision_requested|under_review|private draft body/i);
    await expect(page.getByText(/No publications are publicly available yet|لا توجد منشورات عامة بعد/i)).toBeVisible({ timeout: 20_000 });
  });

  test("dashboard auth gate keeps tab in the return path", async ({ page }) => {
    for (const tab of ["profile", "posts", "security", "subscription"]) {
      await page.goto(`/dashboard?tab=${tab}`, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/auth|\/verify-email/, { timeout: 15_000 });
      expect(decodeURIComponent(page.url())).toMatch(new RegExp(`tab=${tab}|mode=login`));
    }
  });

  test("arabic and dark public hubs do not leak translation keys", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("fen-lang", "ar");
    });
    await page.emulateMedia({ colorScheme: "dark" });
    for (const path of ["/", "/publications", "/search", "/marketplace", "/discover"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.locator("body")).not.toContainText(/dash\.[a-z]|nav\.[a-z]|mp\.[a-z]/);
    }
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/search", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });
});
