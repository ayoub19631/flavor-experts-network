import { describe, expect, it } from "vitest";
import { canAccessPublicationFile, canAuthorEditPublication, canPublishPublication, canReadPublication } from "./visibility";

const draft = { status: "draft" as const, visibility: "public" as const, created_by: "author-1" };
const publishedPublic = { status: "published" as const, visibility: "public" as const, created_by: "author-1" };
const publishedMembers = { status: "published" as const, visibility: "members" as const, created_by: "author-1" };
const privateFile = { visibility: "private" as const, uploaded_by: "author-1" };

describe("publication visibility", () => {
  it("hides drafts from visitors and other members", () => {
    expect(canReadPublication(draft, {})).toBe(false);
    expect(canReadPublication(draft, { userId: "member-2" })).toBe(false);
    expect(canReadPublication(draft, { userId: "author-1" })).toBe(true);
    expect(canReadPublication(draft, { userId: "member-2", isAdmin: true })).toBe(true);
  });

  it("lets visitors read only published public items", () => {
    expect(canReadPublication(publishedPublic, {})).toBe(true);
    expect(canReadPublication(publishedMembers, {})).toBe(false);
    expect(canReadPublication(publishedMembers, { userId: "member-2" })).toBe(true);
  });

  it("blocks ordinary users from publishing", () => {
    expect(canPublishPublication({ userId: "author-1" })).toBe(false);
    expect(canPublishPublication({ userId: "author-1", isAdmin: true })).toBe(true);
    expect(canAuthorEditPublication(publishedPublic, { userId: "author-1" })).toBe(false);
    expect(canAuthorEditPublication(draft, { userId: "member-2" })).toBe(false);
  });

  it("keeps private files away from unauthorized users", () => {
    expect(canAccessPublicationFile(publishedPublic, privateFile, {})).toBe(false);
    expect(canAccessPublicationFile(publishedPublic, privateFile, { userId: "member-2" })).toBe(false);
    expect(canAccessPublicationFile(publishedPublic, privateFile, { userId: "author-1" })).toBe(true);
    expect(canAccessPublicationFile(draft, privateFile, { userId: "member-2" })).toBe(false);
  });
});
