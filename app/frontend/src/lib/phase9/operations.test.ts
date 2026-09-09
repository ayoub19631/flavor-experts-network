import { describe, expect, it } from "vitest";
import { canGrantRole, canSelfAssign, hasCapability } from "@/lib/phase4/roles";
import { extractMentionIds, insertMentionToken, isAllowedVerificationFile, mentionIdempotencyKey } from "@/lib/phase5/mentions";
import { shouldSkipSelfNotify } from "@/lib/phase5/security";
import {
  buildProfileSavePayload,
  profileViewFromPayload,
} from "@/lib/profile-details";
import { profileCompletionPercent } from "@/lib/profile-completion";
import {
  canAccessPublicationFile,
  canAuthorEditPublication,
  canChangeEditorialStatus,
  canPublishPublication,
  canReadPublication,
} from "@/lib/publications/visibility";
import { validateForPublish } from "@/lib/publications/validation";
import { sniffPublicationMime } from "@/lib/publications/files";
import { buildPublicationStoragePath } from "@/lib/publications/slug";
import {
  quoteCanRevise,
  quoteCanWithdraw,
  rfqAcceptsQuotes,
  rfqIsTerminal,
} from "@/lib/marketplace/status";
import { stripPrivateMarketplaceFields } from "@/lib/marketplace/privacy";

const author = "11111111-1111-1111-1111-111111111111";
const peer = "22222222-2222-2222-2222-222222222222";
const staff = "33333333-3333-3333-3333-333333333333";

describe("profile edit save reload", () => {
  it("rejects an empty name and rebuilds the same payload after reload", () => {
    expect(buildProfileSavePayload({ full_name: "   " })).toEqual({ error: "full_name_required" });

    const saved = buildProfileSavePayload({
      full_name: "  Amina Flavor  ",
      role: "Flavor Scientist",
      company: "Arabian Labs",
      location: "Riyadh",
      bio: "Sensory and natural flavors.",
      specialty: "vanilla, citrus",
      years_experience: 12.4,
      skills_text: "GC-MS, QDA",
      education_text: "King Saud University | BSc Food Science | 2018",
      work_text: "Scientist | Acme | 2020-Present | Formulation",
      projects_text: "Vanilla map | Sensory study | https://example.com",
      linkedin_url: "https://linkedin.com/in/amina",
      website_url: "https://example.com",
      phone: "+966500000000",
      avatar_url: "https://cdn.example/a.jpg",
      cover_url: "https://cdn.example/c.jpg",
    });
    expect("error" in saved).toBe(false);
    if ("error" in saved) return;

    expect(saved.full_name).toBe("Amina Flavor");
    expect(saved.years_experience).toBe(12);
    expect(saved.skills).toEqual(["GC-MS", "QDA"]);
    expect(saved.education[0]).toMatchObject({ school: "King Saud University", year: "2018" });

    const view = profileViewFromPayload(saved);
    const reloaded = buildProfileSavePayload(view);
    expect(reloaded).toEqual(saved);
    expect(profileCompletionPercent(view)).toBe(100);
  });
});

describe("posts comments mentions notifications messaging", () => {
  it("extracts mention ids and skips self-notify", () => {
    const body = `Hello @[Amina](${author}) and @[Peer](${peer})`;
    expect(extractMentionIds(body)).toEqual([author, peer]);
    expect(shouldSkipSelfNotify(author, author)).toBe(true);
    expect(shouldSkipSelfNotify(author, peer)).toBe(false);
    expect(mentionIdempotencyKey("comment", "c1", peer)).toBe(`mention:comment:c1:${peer}`);
  });

  it("inserts a mention token at the caret", () => {
    const next = insertMentionToken("See @am", 6, { profile_id: peer, full_name: "Peer" });
    expect(next.text).toContain(`@[Peer](${peer})`);
  });
});

describe("verification request and review", () => {
  it("accepts pdf/jpeg/png and keeps review staff-only", () => {
    expect(isAllowedVerificationFile(new File(["x"], "id.pdf", { type: "application/pdf" })).ok).toBe(true);
    expect(isAllowedVerificationFile(new File(["x"], "id.exe", { type: "application/octet-stream" })).ok).toBe(false);
    expect(hasCapability(["member"], "review_verification")).toBe(false);
    expect(hasCapability(["platform_admin"], "review_verification")).toBe(true);
    expect(canSelfAssign("verified_professional")).toBe(false);
    expect(canGrantRole(["member"], "verified_professional")).toBe(false);
  });
});

describe("publication draft pdf submit revision approve publish", () => {
  const draft = { status: "draft" as const, visibility: "public" as const, created_by: author };
  const submitted = { status: "submitted" as const, visibility: "public" as const, created_by: author };
  const revision = { status: "revision_requested" as const, visibility: "public" as const, created_by: author };
  const published = { status: "published" as const, visibility: "public" as const, created_by: author };
  const privateFile = { visibility: "private" as const, uploaded_by: author };

  it("keeps drafts and private PDFs away from visitors and peers", () => {
    expect(canReadPublication(draft, {})).toBe(false);
    expect(canReadPublication(draft, { userId: peer })).toBe(false);
    expect(canReadPublication(draft, { userId: author })).toBe(true);
    expect(canAccessPublicationFile(draft, privateFile, { userId: peer })).toBe(false);
    expect(canAccessPublicationFile(published, privateFile, { userId: peer })).toBe(false);
    expect(canAccessPublicationFile(published, privateFile, { userId: author })).toBe(true);
  });

  it("lets the author edit draft/revision and only staff publish", () => {
    expect(canAuthorEditPublication(draft, { userId: author })).toBe(true);
    expect(canAuthorEditPublication(submitted, { userId: author })).toBe(true);
    expect(canAuthorEditPublication(revision, { userId: author })).toBe(true);
    expect(canAuthorEditPublication(published, { userId: author })).toBe(false);
    expect(canPublishPublication({ userId: author })).toBe(false);
    expect(canPublishPublication({ userId: staff, isAdmin: true })).toBe(true);
    expect(canChangeEditorialStatus({ userId: peer })).toBe(false);
    expect(canChangeEditorialStatus({ isEditor: true })).toBe(true);
  });

  it("rejects an incomplete scholarly payload and accepts a complete one", () => {
    expect(validateForPublish({
      publication: { title: "", slug: "", type: "technical_article", primary_language: "en", abstract: "", description: "", cover_image_path: null },
      authors: [],
      categories: [],
    }).map((row) => row.field)).toEqual(expect.arrayContaining(["title", "slug", "authors", "categories", "abstract"]));

    expect(validateForPublish({
      publication: {
        title: "Vanilla stability",
        slug: "vanilla-stability",
        type: "technical_article",
        primary_language: "en",
        abstract: "A sensory note.",
        description: "",
        cover_image_path: null,
      },
      authors: [{ full_name: "Amina Flavor" }],
      categories: ["research"],
    })).toEqual([]);
  });

  it("sniffs PDF bytes and scopes storage to the owner", async () => {
    const header = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const pdf = {
      name: "paper.pdf",
      type: "application/pdf",
      size: header.byteLength,
      slice: () => ({ arrayBuffer: async () => header.buffer }),
    } as unknown as File;
    expect(await sniffPublicationMime(pdf)).toBe("application/pdf");
    const path = buildPublicationStoragePath(author, "44444444-4444-4444-4444-444444444444", "paper.pdf");
    expect(path.startsWith(`${author}/`)).toBe(true);
    expect(path).not.toContain("paper");
  });
});

describe("rfq quote revision compare close", () => {
  it("follows the existing RFQ/quote state machine", () => {
    expect(rfqAcceptsQuotes("receiving_quotes")).toBe(true);
    expect(quoteCanRevise("submitted", "receiving_quotes")).toBe(true);
    expect(quoteCanRevise("accepted", "accepted")).toBe(false);
    expect(quoteCanWithdraw("submitted", "receiving_quotes")).toBe(true);
    expect(rfqIsTerminal("closed")).toBe(true);
    expect(rfqAcceptsQuotes("closed")).toBe(false);
    expect(quoteCanRevise("revised", "closed")).toBe(false);
  });

  it("strips private quote fields from public payloads", () => {
    expect(stripPrivateMarketplaceFields({
      title: "Vanillin RFQ",
      price: 12.5,
      storage_path: "private/quote.pdf",
      buyer_id: author,
      supplier_owner_id: peer,
    })).toEqual({ title: "Vanillin RFQ" });
  });
});

describe("admin hide restore and cross-party denial", () => {
  it("keeps hide/restore staff-only", () => {
    expect(hasCapability(["member"], "moderate_community")).toBe(false);
    expect(hasCapability(["community_moderator"], "moderate_community")).toBe(true);
    expect(hasCapability(["member"], "review_marketplace")).toBe(false);
    expect(hasCapability(["platform_admin"], "review_marketplace")).toBe(true);
  });

  it("rejects owner_id / company_id / supplier_id spoofing in the client contract", () => {
    expect(author).not.toBe(peer);
    expect(canReadPublication({ status: "draft", visibility: "private", created_by: author }, { userId: peer })).toBe(false);
    expect(canAuthorEditPublication({ status: "draft", created_by: author }, { userId: peer })).toBe(false);
    expect(canPublishPublication({ userId: peer })).toBe(false);
    expect(hasCapability(["verified_company"], "admin")).toBe(false);
    expect(stripPrivateMarketplaceFields({ buyer_id: author, supplier_owner_id: peer, price: 9 })).toEqual({});
  });
});
