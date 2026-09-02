import { test, expect } from "@playwright/test";

test.describe("companies directory", () => {
  test("companies page is public", async ({ page }) => {
    await page.goto("/companies", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /Companies|الشركات/i })).toBeVisible({ timeout: 20_000 });
  });
});
