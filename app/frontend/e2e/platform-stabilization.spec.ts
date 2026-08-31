import { test, expect } from "@playwright/test";

test.describe("phase 1 platform stabilization", () => {
  test("public homepage loads at /", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible();
    await expect(
      page.getByText(/Learn Flavor Science|تعلّم علم النكهات|Under Development|قيد التطوير|Flavor Experts|خبراء النكهات/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("community remains at /community", async ({ page }) => {
    await page.goto("/community", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/Community|المجتمع|Flavor Experts|خبراء النكهات|Under Development|قيد التطوير/i).first(),
    ).toBeVisible({ timeout: 20_000 });
    expect(page.url()).toMatch(/\/community/);
  });

  test("old /welcome route redirects to homepage", async ({ page }) => {
    await page.goto("/welcome", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/(?:$|\?|#)/);
  });

  test("primary navigation includes academy and community", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
    const nav = page.locator("nav").first();
    if (await nav.isVisible()) {
      await expect(nav.getByRole("link", { name: /Community|المجتمع/i }).first()).toBeVisible();
      await expect(nav.getByRole("link", { name: /Academy|الأكاديمية|Courses|الدورات/i }).first()).toBeVisible();
    }
  });

  test("english is LTR and arabic is RTL", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.setItem("fen-lang", "en"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", /en/);
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    await page.evaluate(() => localStorage.setItem("fen-lang", "ar"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("lang", /ar/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("language persists after refresh", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.setItem("fen-lang", "ar"));
    await page.reload({ waitUntil: "domcontentloaded" });
    const stored = await page.evaluate(() => localStorage.getItem("fen-lang"));
    expect(stored).toBe("ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("theme persists after refresh", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.setItem("theme", "dark");
      document.documentElement.classList.add("dark");
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    const stored = await page.evaluate(() => localStorage.getItem("theme"));
    expect(stored).toBe("dark");
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("auth titles by mode", async ({ page }) => {
    const assertTitle = async (path: string, title: RegExp) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      if (await page.getByText(/Under Development|قيد التطوير/i).first().isVisible().catch(() => false)) {
        return;
      }
      await expect(page).toHaveTitle(title);
    };
    await assertTitle("/auth?mode=login", /Sign In \| Flavor Experts Network/i);
    await assertTitle("/auth?mode=signup&type=individual", /Create Account \| Flavor Experts Network/i);
    await assertTitle("/auth?mode=signup&type=company", /Company Registration \| Flavor Experts Network/i);
    await assertTitle("/auth?mode=reset", /Reset Password \| Flavor Experts Network/i);
  });

  test("signup requires policy acceptance before submit", async ({ page }) => {
    await page.goto("/auth?mode=signup", { waitUntil: "domcontentloaded" });
    const submit = page.getByRole("button", { name: /Sign Up|إنشاء|Create|Join/i }).first();
    if (await submit.isVisible()) {
      await expect(submit).toBeDisabled();
    }
  });

  test("enterprise benefits are not duplicated labels", async ({ page }) => {
    await page.goto("/enterprise", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
    const heading = page.getByRole("heading", { name: /Professional network|شبكة مهنية/i }).first();
    if (await heading.isVisible()) {
      const card = heading.locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
      await expect(card.getByText(/Professional network|شبكة مهنية/i)).toHaveCount(1);
    }
  });

  test("public pages expose robots and sitemap", async ({ request, baseURL }) => {
    const origin = baseURL || "http://127.0.0.1:3001";
    const robots = await request.get(`${origin}/robots.txt`);
    expect(robots.ok()).toBeTruthy();
    const robotsText = await robots.text();
    expect(robotsText).toMatch(/Disallow: \/admin/);
    expect(robotsText).not.toMatch(/Disallow: \/\s*$/m);

    const sitemap = await request.get(`${origin}/sitemap.xml`);
    if (sitemap.ok()) {
      const sitemapText = await sitemap.text();
      expect(sitemapText).toMatch(/flavorexpertsnetwork.com|localhost|127\.0\.0\.1/);
    }
  });

  test("critical pages have a main landmark and skip link", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.getByRole("link", { name: /Skip to main content|تخطَّ إلى المحتوى/i })).toHaveCount(1);
  });

  test("homepage and auth are usable at a mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
    await page.goto("/auth?mode=signup", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("textbox").first()).toBeVisible({ timeout: 20_000 });
  });

  for (const path of ["/members", "/jobs", "/forum", "/market", "/blog", "/consultations", "/enterprise"]) {
    test(`${path} public route still loads`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
    });
  }
});
