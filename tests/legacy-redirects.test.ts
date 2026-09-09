import { describe, expect, it } from "vitest";
import { legacyRedirects } from "@/lib/legacy-redirects";

/** URLs taken from the live Shopify sitemap and navigation. */
const LIVE_URLS = [
  "/collections/frontpage",
  "/collections/monza",
  "/collections/monaco",
  "/collections/austin",
  "/collections/abu-dhabi",
  "/collections/madrid",
  "/collections/las-vegas",
  "/collections/mexico-city",
  "/collections/miami-26",
  "/collections/miami-27",
  "/collections/all",
  "/pages/contact",
  "/pages/data-sharing-opt-out",
  "/pages/sponsors",
  "/pages/madrid",
  "/pages/las-vegas",
  "/policies/privacy-policy",
  "/policies/terms-of-service",
  "/blogs/news",
];

function firstMatch(url: string) {
  return legacyRedirects.find((redirect) => {
    const pattern = redirect.source
      .replace(/:\w+\*/g, ".+")
      .replace(/:\w+/g, "[^/]+");
    return new RegExp(`^${pattern}$`).test(url);
  });
}

describe("legacy Shopify redirects", () => {
  it.each(LIVE_URLS)("covers %s", (url) => {
    expect(firstMatch(url)).toBeDefined();
  });

  it("sends each race collection to its edition", () => {
    expect(firstMatch("/collections/miami-27")?.destination).toBe("/races/miami-2027");
    expect(firstMatch("/collections/monza")?.destination).toBe("/races/monza-2026");
  });

  it("prefers the specific page mapping over the catch-all", () => {
    expect(firstMatch("/pages/sponsors")?.destination).toBe("/partners");
    expect(firstMatch("/pages/anything-else")?.destination).toBe("/");
  });

  it("uses 301 throughout", () => {
    expect(legacyRedirects.every((redirect) => redirect.statusCode === 301)).toBe(true);
  });
});
