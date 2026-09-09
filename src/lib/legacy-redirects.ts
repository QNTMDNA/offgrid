/**
 * Permanent redirects from the Shopify store this site replaces. Sourced from
 * the live sitemap and navigation; every indexed legacy URL must resolve rather
 * than 404 so the domain keeps its search history.
 */
export type LegacyRedirect = { source: string; destination: string; statusCode: 301 };

/** Next's `permanent: true` emits 308; legacy crawlers and links expect 301. */
const MOVED_PERMANENTLY = 301 as const;

/** Shopify collection handle -> race edition slug in this app. */
const COLLECTION_TO_EDITION: Record<string, string> = {
  "miami-26": "miami-2026",
  "miami-27": "miami-2027",
  monaco: "monaco-2026",
  monza: "monza-2026",
  madrid: "madrid-2026",
  austin: "austin-2026",
  "mexico-city": "mexico-city-2026",
  "las-vegas": "las-vegas-2026",
  "abu-dhabi": "abu-dhabi-2026",
};

/** Shopify content pages that have a direct equivalent here. */
const PAGE_REDIRECTS: Record<string, string> = {
  contact: "/contact",
  sponsors: "/partners",
  "data-sharing-opt-out": "/legal/data-sharing",
  madrid: "/races/madrid-2026",
  "las-vegas": "/races/las-vegas-2026",
};

export const legacyRedirects: LegacyRedirect[] = [
  ...Object.entries(COLLECTION_TO_EDITION).map(([handle, slug]) => ({
    source: `/collections/${handle}`,
    destination: `/races/${slug}`,
    statusCode: MOVED_PERMANENTLY,
  })),
  ...Object.entries(PAGE_REDIRECTS).map(([handle, destination]) => ({
    source: `/pages/${handle}`,
    destination,
    statusCode: MOVED_PERMANENTLY,
  })),
  { source: "/collections", destination: "/races", statusCode: MOVED_PERMANENTLY },
  { source: "/collections/all", destination: "/races", statusCode: MOVED_PERMANENTLY },
  { source: "/collections/frontpage", destination: "/races", statusCode: MOVED_PERMANENTLY },
  // Unmapped collections and every product page land on the calendar: packages
  // are not standalone pages in the new information architecture.
  { source: "/collections/:handle", destination: "/races", statusCode: MOVED_PERMANENTLY },
  { source: "/collections/:handle/products/:product", destination: "/races", statusCode: MOVED_PERMANENTLY },
  { source: "/products/:product", destination: "/races", statusCode: MOVED_PERMANENTLY },
  { source: "/pages/:handle", destination: "/", statusCode: MOVED_PERMANENTLY },
  { source: "/policies/privacy-policy", destination: "/legal/privacy", statusCode: MOVED_PERMANENTLY },
  { source: "/policies/terms-of-service", destination: "/legal/terms", statusCode: MOVED_PERMANENTLY },
  { source: "/policies/refund-policy", destination: "/legal/terms", statusCode: MOVED_PERMANENTLY },
  { source: "/policies/shipping-policy", destination: "/legal/terms", statusCode: MOVED_PERMANENTLY },
  { source: "/policies/:handle", destination: "/legal/terms", statusCode: MOVED_PERMANENTLY },
  { source: "/blogs/news/:slug", destination: "/", statusCode: MOVED_PERMANENTLY },
  { source: "/blogs/:blog", destination: "/", statusCode: MOVED_PERMANENTLY },
  { source: "/search", destination: "/races", statusCode: MOVED_PERMANENTLY },
  // Shopify storefront machinery with no counterpart.
  { source: "/account", destination: "/", statusCode: MOVED_PERMANENTLY },
  { source: "/account/:path*", destination: "/", statusCode: MOVED_PERMANENTLY },
  { source: "/apps/:path*", destination: "/", statusCode: MOVED_PERMANENTLY },
  { source: "/a/:path*", destination: "/", statusCode: MOVED_PERMANENTLY },
];
