import { test, expect } from "@playwright/test";

test.describe("phase 5 critical routes", () => {
  test("verification requires auth", async ({ page }) => {
    await page.goto("/verification", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/auth|verification/i);
  });

  test("notification center requires auth", async ({ page }) => {
    await page.goto("/notifications", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/auth|notifications/i);
  });

  test("ordinary visitors cannot open admin ops", async ({ page }) => {
    await page.goto("/admin/ops", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/admin\/ops$/);
  });

  test("ordinary visitors cannot open verification review", async ({ page }) => {
    await page.goto("/admin/verification", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/admin\/verification$/);
  });

  test("community composer stays public and mention-safe", async ({ page }) => {
    await page.goto("/community", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Professional Community|المجتمع المهني|Community|المجتمع/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("jobs page still exposes apply path after sign-in gate", async ({ page }) => {
    await page.goto("/jobs", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
  });

  test("forum pages stay public and mention-safe", async ({ page }) => {
    await page.goto("/forum", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Forum|المنتدى/i).first()).toBeVisible({ timeout: 20_000 });
  });
});
