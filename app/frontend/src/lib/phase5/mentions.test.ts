import { describe, expect, it } from "vitest";
import {
  extractMentionIds,
  insertMentionToken,
  isAllowedVerificationFile,
  mentionCaretQuery,
  mentionIdempotencyKey,
  MENTION_ENTITY_TYPES,
  renderMentionSegments,
  sanitizeUploadName,
} from "./mentions";

describe("mentions", () => {
  it("extracts profile ids from mention tokens", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    expect(extractMentionIds(`Hello @[Ada](${id}) and more`)).toEqual([id]);
  });

  it("does not treat raw HTML as a mention", () => {
    expect(extractMentionIds('<a href="javascript:alert(1)">@x</a>')).toEqual([]);
  });

  it("rejects invalid profile ids in mention tokens", () => {
    expect(extractMentionIds("Hello @[Ada](not-a-uuid)")).toEqual([]);
    expect(extractMentionIds("Hello @[Ada](11111111-1111-1111-1111-11111111111)")).toEqual([]);
  });

  it("finds an @ query at the caret", () => {
    expect(mentionCaretQuery("Hi @ada", 7)).toEqual({ query: "ada", start: 3 });
  });

  it("inserts a mention token without HTML", () => {
    const id = "22222222-2222-2222-2222-222222222222";
    const next = insertMentionToken("Hi @ad", 6, { profile_id: id, full_name: "Ada" });
    expect(next.text).toBe(`Hi @[Ada](${id}) `);
  });

  it("renders mention segments as data, not HTML", () => {
    const id = "33333333-3333-3333-3333-333333333333";
    const parts = renderMentionSegments(`See @[Ada](${id})`);
    expect(parts).toEqual([
      { type: "text", value: "See " },
      { type: "mention", value: "Ada", profileId: id },
    ]);
  });

  it("supports forum topic and reply mention entities", () => {
    expect(MENTION_ENTITY_TYPES).toEqual(["post", "comment", "forum_topic", "forum_reply"]);
    const id = "44444444-4444-4444-4444-444444444444";
    expect(extractMentionIds(`Forum note @[Ada](${id})`)).toEqual([id]);
    expect(mentionIdempotencyKey("forum_topic", "topic-1", id)).toBe(`mention:forum_topic:topic-1:${id}`);
    expect(mentionIdempotencyKey("forum_reply", "reply-1", id)).toBe(`mention:forum_reply:reply-1:${id}`);
  });
});

describe("verification files", () => {
  it("rejects svg, html, and oversized files", () => {
    expect(isAllowedVerificationFile(new File(["x"], "a.svg", { type: "image/svg+xml" })).ok).toBe(false);
    expect(isAllowedVerificationFile(new File(["x"], "a.html", { type: "text/html" })).ok).toBe(false);
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "a.pdf", { type: "application/pdf" });
    expect(isAllowedVerificationFile(big).reason).toBe("too_large");
  });

  it("accepts pdf jpeg png", () => {
    expect(isAllowedVerificationFile(new File(["x"], "doc.pdf", { type: "application/pdf" })).ok).toBe(true);
    expect(isAllowedVerificationFile(new File(["x"], "pic.jpg", { type: "image/jpeg" })).ok).toBe(true);
    expect(isAllowedVerificationFile(new File(["x"], "pic.png", { type: "image/png" })).ok).toBe(true);
  });

  it("sanitizes filenames", () => {
    expect(sanitizeUploadName("../../evil name.PDF")).toBe("evil-name.pdf");
  });
});
