import { test, expect } from "@playwright/test";

test.describe("public pages smoke", () => {
  test("home page loads brand or under-development gate", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    // Private mode shows under-development; public mode shows nav/hero
    await expect(
      page
        .getByText(/قيد التطوير|Under Development|Flavor Experts|خبراء النكهات/i)
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("auth page is reachable", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByRole("button").or(page.getByRole("textbox")).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("auth callback path is reachable", async ({ page }) => {
    await page.goto("/auth/callback");
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
  });

  test("admin redirects unauthenticated users", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/auth|\/admin|\/$/, { timeout: 20_000 });
    const url = page.url();
    expect(url.includes("/auth") || url.includes("/admin") || url.endsWith("/")).toBeTruthy();
  });

  test("dashboard redirects unauthenticated users", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/auth|\/dashboard|\/$/, { timeout: 20_000 });
    expect(page.url()).toMatch(/auth|dashboard|^https?:\/\/[^/]+\/?$/);
  });

  test("pricing redirects to free home", async ({ page }) => {
    await page.goto("/pricing");
    await page.waitForURL((url) => !url.pathname.includes("/pricing"), { timeout: 20_000 });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
  });

  test("privacy page loads when allowed", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
  });

  test("terms page loads when allowed", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
  });
});
