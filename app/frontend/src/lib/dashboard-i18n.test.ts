import { describe, expect, it } from "vitest";
import { dashboardTranslations } from "./dashboard-i18n";

describe("dashboard translations", () => {
  it("keeps English and Arabic keys aligned", () => {
    const en = Object.keys(dashboardTranslations.en).sort();
    const ar = Object.keys(dashboardTranslations.ar).sort();
    expect(ar).toEqual(en);
    expect(en.length).toBeGreaterThan(80);
    for (const key of en) {
      expect(dashboardTranslations.en[key as keyof typeof dashboardTranslations.en].trim()).not.toBe("");
      expect(dashboardTranslations.ar[key as keyof typeof dashboardTranslations.ar].trim()).not.toBe("");
    }
  });
});
