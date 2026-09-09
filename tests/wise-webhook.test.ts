import { generateKeyPairSync, createSign } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/lib/env";
import { verifySignature } from "@/lib/integrations/wise/webhook";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });

function sign(body: string): string {
  return createSign("RSA-SHA256").update(body).sign(privateKey, "base64");
}

beforeAll(() => {
  process.env.DATABASE_URL = "postgresql://localhost:5432/test";
  process.env.SESSION_SECRET = "x".repeat(32);
  process.env.JOB_TOKEN = "test-job-token";
  process.env.WISE_WEBHOOK_PUBLIC_KEY = publicKey.export({
    type: "spki",
    format: "pem",
  }) as string;
  resetEnvCache();
});

describe("wise webhook signature", () => {
  const body = JSON.stringify({ event_type: "transfers#state-change" });

  it("accepts a delivery signed by Wise", () => {
    expect(verifySignature(body, sign(body))).toBe(true);
  });

  it("rejects a tampered body or a malformed signature", () => {
    expect(verifySignature(`${body} `, sign(body))).toBe(false);
    expect(verifySignature(body, "not-base64-signature")).toBe(false);
  });
});
