import { describe, expect, it } from "vitest";
import {
  InventoryBelowCommittedError,
  assertInventoryFits,
  editionSlug,
  packageSku,
  slugify,
} from "@/lib/catalog/manage";
import { contentTypeForKey, mediaKey, mediaUrl } from "@/lib/catalog/media";

describe("slugify", () => {
  it("normalises names into url-safe slugs", () => {
    expect(slugify("Mexico City Grand Prix")).toBe("mexico-city-grand-prix");
    expect(slugify("  São Paulo  ")).toBe("sao-paulo");
    expect(slugify("Miami / GP '27")).toBe("miami-gp-27");
  });
});

describe("identifiers", () => {
  it("derives edition slugs and package skus", () => {
    expect(editionSlug("miami", 2026)).toBe("miami-2026");
    expect(packageSku({ slug: "miami-2026" }, "Trackside Lounge")).toBe(
      "MIAMI-2026-TRACKSIDE-LOUNGE",
    );
  });
});

describe("assertInventoryFits", () => {
  it("allows inventory at or above what is sold and held", () => {
    expect(() => assertInventoryFits(40, 5, 35)).not.toThrow();
  });

  it("rejects shrinking inventory under live allocations", () => {
    expect(() => assertInventoryFits(40, 6, 35)).toThrow(InventoryBelowCommittedError);
  });
});

describe("media keys", () => {
  it("round-trips urls and resolves content types", () => {
    expect(mediaKey(mediaUrl("abc.webp"))).toBe("abc.webp");
    expect(mediaKey("/brand/races/miami-2026.jpg")).toBeNull();
    expect(contentTypeForKey("abc.webp")).toBe("image/webp");
    expect(contentTypeForKey("abc.txt")).toBe("application/octet-stream");
  });
});
