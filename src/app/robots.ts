import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_URL ?? "https://offgridrace.com").replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/cart", "/checkout", "/orders", "/unsubscribe", "/sponsor-lounge"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
