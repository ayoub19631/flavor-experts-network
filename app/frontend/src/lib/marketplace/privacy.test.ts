import { describe, expect, it } from "vitest";
import { isPublicMarketplaceHref, shouldIndexMarketplacePath, showVerifiedBadge, stripPrivateMarketplaceFields } from "./privacy";
import { compareDisclaimer, quoteCanRevise, quoteCanWithdraw, rfqAcceptsQuotes, rfqIsTerminal } from "./status";

describe("marketplace privacy", () => {
  it("strips prices and storage paths from public payloads", () => {
    const clean = stripPrivateMarketplaceFields({
      title: "Vanillin",
      price: 12,
      storage_path: "secret/path.pdf",
      buyer_id: "x",
    });
    expect(clean).toEqual({ title: "Vanillin" });
  });

  it("indexes only public marketplace hubs and listings", () => {
    expect(shouldIndexMarketplacePath("/marketplace")).toBe(true);
    expect(shouldIndexMarketplacePath("/marketplace/suppliers/acme")).toBe(true);
    expect(shouldIndexMarketplacePath("/marketplace/rfq")).toBe(false);
    expect(isPublicMarketplaceHref("/marketplace/materials/vanillin")).toBe(true);
    expect(isPublicMarketplaceHref("/dashboard/rfqs/1")).toBe(false);
  });

  it("never shows Verified unless the flag is explicitly true", () => {
    expect(showVerifiedBadge(true)).toBe(true);
    expect(showVerifiedBadge(false)).toBe(false);
    expect(showVerifiedBadge(null)).toBe(false);
  });
});

describe("marketplace status", () => {
  it("blocks quotes after close and allows withdraw before accept", () => {
    expect(rfqIsTerminal("closed")).toBe(true);
    expect(rfqAcceptsQuotes("receiving_quotes")).toBe(true);
    expect(quoteCanWithdraw("submitted", "receiving_quotes")).toBe(true);
    expect(quoteCanRevise("submitted", "receiving_quotes")).toBe(true);
    expect(quoteCanRevise("accepted", "accepted")).toBe(false);
    expect(quoteCanWithdraw("accepted", "accepted")).toBe(false);
    expect(compareDisclaimer()).not.toMatch(/best offer is the lowest/i);
  });
});
