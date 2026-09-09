import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Member documents are private, so they are never served from /public. The
 * local driver keeps them outside the build output and is the only driver for
 * now; a hosted deployment needs an object-store driver behind this interface.
 */
const ROOT = path.resolve(
  process.env.LOUNGE_STORAGE_DIR ?? path.join(process.cwd(), "storage/lounge"),
);

const MAX_BYTES = 64 * 1024 * 1024;

export const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export class UnsupportedDocumentError extends Error {}

export function safeFilename(name: string): string {
  const base = path
    .basename(name)
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[-.]+|-+$/g, "");
  return base.slice(-120) || "document";
}

function resolveKey(key: string): string {
  const resolved = path.resolve(ROOT, key);
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    throw new Error("Storage key escapes the member storage root");
  }
  return resolved;
}

export async function putDocument(file: File): Promise<{
  key: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}> {
  if (!ALLOWED_CONTENT_TYPES.includes(file.type as (typeof ALLOWED_CONTENT_TYPES)[number])) {
    throw new UnsupportedDocumentError("Upload a PDF, PowerPoint or Excel file");
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    throw new UnsupportedDocumentError("File must be between 1 byte and 64 MB");
  }

  const filename = safeFilename(file.name);
  const key = `${randomUUID()}-${filename}`;
  const target = resolveKey(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await file.arrayBuffer()));

  return { key, filename, contentType: file.type, sizeBytes: file.size };
}

export async function readDocument(key: string): Promise<Buffer> {
  return readFile(resolveKey(key));
}

export async function deleteDocument(key: string): Promise<void> {
  await unlink(resolveKey(key)).catch(() => undefined);
}
