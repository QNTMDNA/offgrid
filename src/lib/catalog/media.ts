import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Race artwork uploaded by operators. It is public, but it is kept out of
 * /public so uploads survive independently of the build output and can move to
 * an object store behind this interface.
 */
const ROOT = path.resolve(
  process.env.MEDIA_STORAGE_DIR ?? path.join(process.cwd(), "storage/media"),
);

const MAX_BYTES = 12 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export class UnsupportedImageError extends Error {}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

function resolveKey(key: string): string {
  const resolved = path.resolve(ROOT, key);
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    throw new Error("Storage key escapes the media root");
  }
  return resolved;
}

export function mediaUrl(key: string): string {
  return `/media/${key}`;
}

/** Reverse of `mediaUrl`; returns null for anything not stored by us. */
export function mediaKey(url: string | null | undefined): string | null {
  if (!url?.startsWith("/media/")) return null;
  return url.slice("/media/".length) || null;
}

export function contentTypeForKey(key: string): string {
  const extension = path.extname(key).slice(1).toLowerCase();
  const match = Object.entries(EXTENSIONS).find(([, ext]) => ext === extension);
  return match?.[0] ?? "application/octet-stream";
}

export async function putImage(file: File): Promise<{ key: string; url: string }> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new UnsupportedImageError("Upload a JPEG, PNG, WebP or AVIF image");
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    throw new UnsupportedImageError("Image must be between 1 byte and 12 MB");
  }

  const key = `${randomUUID()}.${EXTENSIONS[file.type]}`;
  const target = resolveKey(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await file.arrayBuffer()));
  return { key, url: mediaUrl(key) };
}

export async function readImage(key: string): Promise<Buffer> {
  return readFile(resolveKey(key));
}
