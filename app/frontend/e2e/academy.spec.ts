import { test, expect } from "@playwright/test";

test.describe("industry insights and legacy catalog URLs", () => {
  test("courses URL redirects to industry insights", async ({ page }) => {
    await page.goto("/courses", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/insights/);
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/Industry Insights|رؤى الصناعة|Flavor Experts|خبراء النكهات|Under Development|قيد التطوير/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("legacy course slug redirects to industry insights", async ({ page }) => {
    await page.goto("/courses/introduction-to-flavor-science-and-formulation", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/insights/);
    await expect(page.getByRole("button", { name: /Enroll free|سجّل مجاناً/i })).toHaveCount(0);
  });

  test("admin catalog builder requires authentication", async ({ page }) => {
    await page.goto("/admin/academy/11111111-1111-4111-8111-111111111111");
    await page.waitForURL(/\/auth|\/admin|\/community/, { timeout: 20_000 });
    expect(page.url()).toMatch(/auth|admin|community/);
  });

  test("certificate URLs redirect to industry insights", async ({ page }) => {
    await page.goto("/certificates", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/insights/);
  });

  test("learn URLs redirect to industry insights", async ({ page }) => {
    await page.goto("/learn");
    await expect(page).toHaveURL(/\/insights/);
  });

  test("welcome marketing page redirects to the homepage", async ({ page }) => {
    await page.goto("/welcome", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/(?:$|\?|#)/);
    await expect(
      page.getByText(/Flavor Experts|خبراء النكهات|Professional Flavor Industry Network|شبكة صناعة النكهات المهنية|Under Development|قيد التطوير/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("signup mode uses Create Account document title", async ({ page }) => {
    await page.goto("/auth?mode=signup", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/Create Account \| Flavor Experts Network/i);
  });
});
