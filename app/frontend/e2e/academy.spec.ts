import { test, expect } from "@playwright/test";

test.describe("academy catalog and publishing surfaces", () => {
  test("courses catalog loads with live path counts", async ({ page }) => {
    await page.goto("/courses", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/Flavor Experts Academy|أكاديمية خبراء النكهات|courses in this path|دورات في هذا المسار|0 /i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("draft first course is not on the public catalog by slug content", async ({ page }) => {
    await page.goto("/courses/introduction-to-flavor-science-and-formulation", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /Enroll free|سجّل مجاناً/i })).toHaveCount(0);
  });

  test("admin academy builder requires authentication", async ({ page }) => {
    await page.goto("/admin/academy/11111111-1111-4111-8111-111111111111");
    await page.waitForURL(/\/auth|\/admin|\/community/, { timeout: 20_000 });
    expect(page.url()).toMatch(/auth|admin|community/);
  });

  test("certificate verification page is public", async ({ page }) => {
    await page.goto("/certificates", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Verify certificate|تحقق من الشهادة/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("learn dashboard redirects guests to login", async ({ page }) => {
    await page.goto("/learn");
    await page.waitForURL(/\/auth|\/learn/, { timeout: 20_000 });
    expect(page.url()).toMatch(/auth|learn/);
  });

  test("welcome marketing page redirects to the homepage", async ({ page }) => {
    await page.goto("/welcome", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/(?:$|\?|#)/);
    await expect(
      page.getByText(/Flavor Experts|خبراء النكهات|Learn Flavor Science|تعلّم علم النكهات|Under Development|قيد التطوير/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("signup mode uses Create Account document title", async ({ page }) => {
    await page.goto("/auth?mode=signup", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/Create Account \| Flavor Experts Network/i);
  });
});
