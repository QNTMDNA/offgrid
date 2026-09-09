/** Imagery lifted from the marketing site, keyed by race edition slug. */
const RACE_IMAGES: Record<string, string> = {
  "abu-dhabi-2026": "/brand/races/abu-dhabi-2026.jpg",
  "austin-2026": "/brand/races/austin-2026.jpg",
  "las-vegas-2026": "/brand/races/las-vegas-2026.jpg",
  "madrid-2026": "/brand/races/madrid-2026.jpg",
  "mexico-city-2026": "/brand/races/mexico-city-2026.jpg",
  "miami-2026": "/brand/races/miami-2026.jpg",
  "miami-2027": "/brand/races/miami-2027.jpg",
  "monaco-2026": "/brand/races/monaco-2026.jpg",
  "monza-2026": "/brand/races/monza-2026.jpg",
};

export const HERO_IMAGE = "/brand/hero.jpg";

export const EDITORIAL_IMAGES = [
  "/brand/editorial/img-4.jpg",
  "/brand/editorial/img-28.jpg",
  "/brand/editorial/img-49.jpg",
  "/brand/editorial/img-94.jpg",
  "/brand/editorial/img-106.jpg",
  "/brand/editorial/img-196.jpg",
  "/brand/editorial/img-300.jpg",
  "/brand/editorial/img-347.jpg",
  "/brand/editorial/img-460.jpg",
] as const;

export const SPONSOR_LOGOS = [2, 3, 4, 6, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20].map(
  (n) => `/brand/sponsors/sponsor-${n}.png`,
);

/** Artwork uploaded in the admin console wins over the bundled photography. */
export function raceImage(
  slug: string,
  fallbackIndex = 0,
  uploaded?: string | null,
): string {
  return (
    uploaded ||
    RACE_IMAGES[slug] ||
    EDITORIAL_IMAGES[fallbackIndex % EDITORIAL_IMAGES.length]
  );
}
