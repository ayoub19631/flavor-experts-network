import { test, expect } from "@playwright/test";

test.describe("phase 8 marketplace", () => {
  test("desktop public marketplace hubs", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/marketplace", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: /Supplier marketplace|سوق الموردين/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/marketplace$/);
    await expect(page.getByText(/not a purchase contract|ليس عقد شراء/i)).toBeVisible();
    await page.getByRole("link", { name: /Raw materials|المواد الخام/i }).first().click();
    await expect(page).toHaveURL(/\/marketplace\/materials/);
  });

  test("mobile suppliers and dark mode", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/marketplace/suppliers", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main#main-content")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: /Suppliers|الموردون/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("body")).not.toContainText(/\$\d+\.\d{2}|unit price/i);
  });

  test("arabic RTL marketplace", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("fen-lang", "ar"));
    await page.goto("/marketplace", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: /سوق الموردين/i })).toBeVisible({ timeout: 20_000 });
  });

  test("private rfq and admin routes are noindex or denied", async ({ page }) => {
    await page.goto("/marketplace/rfq", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth|\/marketplace\/rfq|\/verify-email/i);
    await page.goto("/admin/marketplace", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Client Login|تسجيل/i })).toBeVisible({ timeout: 20_000 });
  });

  test("sitemap lists public hubs only", async ({ page }) => {
    const sitemap = await page.request.get("/sitemap.xml");
    const xml = await sitemap.text();
    expect(xml).toMatch(/\/marketplace</);
    expect(xml).toMatch(/\/marketplace\/suppliers/);
    expect(xml).not.toMatch(/\/dashboard\/rfqs/);
    expect(xml).not.toMatch(/\/admin\/marketplace/);
    expect(xml).not.toMatch(/\/supplier\/quotes/);
  });
});
