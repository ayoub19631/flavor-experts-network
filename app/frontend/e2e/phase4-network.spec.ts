import { test, expect } from "@playwright/test";

test.describe("phase 4 public network routes", () => {
  test("jobs index still loads", async ({ page }) => {
    await page.goto("/jobs", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
  });

  test("events empty state is reachable", async ({ page }) => {
    await page.goto("/events", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /Events|الفعاليات/i })).toBeVisible({ timeout: 20_000 });
  });

  test("consultations experts route loads", async ({ page }) => {
    await page.goto("/consultations/experts", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
  });

  test("search page remains public", async ({ page }) => {
    await page.goto("/search?q=flavor", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
  });

  test("notifications require auth", async ({ page }) => {
    await page.goto("/notifications", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/auth|notifications/i);
  });

  test("admin ops is protected", async ({ page }) => {
    await page.goto("/admin/ops", { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/admin\/ops$/);
  });
});
