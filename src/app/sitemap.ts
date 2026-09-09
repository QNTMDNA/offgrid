import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { LEGAL_DOCUMENTS } from "@/content/legal";

export const dynamic = "force-dynamic";

const STATIC_PATHS = [
  "/",
  "/races",
  "/partners",
  "/contact",
  "/request-access",
  "/sponsor-inquiry",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL ?? "https://offgridrace.com").replace(/\/$/, "");
  const editions = await prisma.raceEdition.findMany({
    where: { status: { notIn: ["DRAFT", "CANCELLED"] } },
    select: { slug: true, updatedAt: true },
  });

  return [
    ...STATIC_PATHS.map((path) => ({ url: `${base}${path}` })),
    ...editions.map((edition) => ({
      url: `${base}/races/${edition.slug}`,
      lastModified: edition.updatedAt,
    })),
    ...LEGAL_DOCUMENTS.map((doc) => ({ url: `${base}/legal/${doc.slug}` })),
  ];
}
