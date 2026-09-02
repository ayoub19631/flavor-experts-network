import { describe, expect, it } from "vitest";
import { buildCompanyDirectory, slugsEqual } from "./companies";
import type { Member } from "./types";

function member(partial: Partial<Member>): Member {
  return {
    id: partial.id || "1",
    full_name: partial.full_name || "Member",
    role: partial.role || "",
    specialty: null,
    linkedin_url: null,
    joined_at: "2026-01-01",
    avatar_url: partial.avatar_url || null,
    is_featured: false,
    ...partial,
  };
}

describe("company directory", () => {
  it("lists only accounts that registered as a company", () => {
    const rows = buildCompanyDirectory([
      member({ id: "a", full_name: "Amin Morani", member_type: "company", company: "Poonja foods", location: "Pakistan" }),
      member({ id: "t", full_name: "Talal Reyad", member_type: "individual", company: "AL SHAM FOOD FACTORY LLC", location: "United Arab Emirates" }),
      member({ id: "x", full_name: "No Company", member_type: "individual" }),
    ]);
    expect(rows.map((row) => row.name)).toEqual(["Poonja foods"]);
    expect(rows[0]?.is_company_account).toBe(true);
    expect(rows[0]?.member_count).toBe(1);
    expect(rows[0]?.profile_path).toBe("/companies/poonja%20foods");
    expect(slugsEqual("poonja foods", "poonja%20foods")).toBe(true);
  });
});
