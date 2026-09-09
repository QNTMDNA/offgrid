import { randomBytes } from "node:crypto";

const ALPHABET = "ACDEFGHJKLMNPQRTUVWXY3479";

function code(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export function orderNumber(now = new Date()): string {
  return `OG-${now.getUTCFullYear()}-${code(6)}`;
}

export function invoiceNumber(now = new Date()): string {
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `INV-${now.getUTCFullYear()}${month}-${code(5)}`;
}

/** Reference the payer quotes on a bank transfer; used to match Wise deposits. */
export function paymentReference(now = new Date()): string {
  return `OGR${now.getUTCFullYear() % 100}${code(6)}`;
}

export function payoutReference(now = new Date()): string {
  return `PO-${now.getUTCFullYear()}-${code(6)}`;
}

export function cartToken(): string {
  return randomBytes(24).toString("base64url");
}
