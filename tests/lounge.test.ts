import { beforeAll, describe, expect, it } from "vitest";
import { generatePasscode, normalisePasscode } from "@/lib/lounge/passcode";
import { safeFilename } from "@/lib/lounge/storage";
import { InvalidCanvaUrlError, canvaEmbedUrl } from "@/lib/lounge/canva";
import { resetEnvCache } from "@/lib/env";
import {
  signLoungeSession,
  verifyLoungeSession,
} from "@/lib/lounge/session";
import { signSession, verifySession } from "@/lib/auth/session";

describe("member passcodes", () => {
  it("issues readable codes without ambiguous characters", () => {
    for (let i = 0; i < 50; i += 1) {
      const passcode = generatePasscode();
      expect(passcode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(passcode).not.toMatch(/[AEIOU01]/);
    }
  });

  it("accepts the code however it is typed back", () => {
    const passcode = generatePasscode();
    const bare = normalisePasscode(passcode);
    expect(normalisePasscode(passcode.toLowerCase())).toBe(bare);
    expect(normalisePasscode(passcode.replace(/-/g, " "))).toBe(bare);
    expect(bare).toHaveLength(12);
  });
});

describe("member sessions", () => {
  beforeAll(() => {
    process.env.DATABASE_URL = "postgresql://localhost:5432/test";
    process.env.SESSION_SECRET = "x".repeat(40);
    process.env.JOB_TOKEN = "test";
    resetEnvCache();
  });

  it("round-trips its own token", async () => {
    const token = await signLoungeSession({
      memberId: "inv_1",
      email: "lp@example.com",
      name: "LP",
    });
    expect(await verifyLoungeSession(token)).toMatchObject({ memberId: "inv_1" });
  });

  it("is not interchangeable with an admin session", async () => {
    const memberToken = await signLoungeSession({
      memberId: "inv_1",
      email: "lp@example.com",
      name: "LP",
    });
    const adminToken = await signSession({
      userId: "adm_1",
      email: "admin@example.com",
      name: "Admin",
      role: "ADMIN",
    });

    expect(await verifySession(memberToken)).toBeNull();
    expect(await verifyLoungeSession(adminToken)).toBeNull();
  });
});

describe("document storage", () => {
  it("strips path traversal out of uploaded filenames", () => {
    expect(safeFilename("../../etc/passwd")).toBe("passwd");
    expect(safeFilename("Series A / deck v2.pdf")).toBe("deck-v2.pdf");
    expect(safeFilename("")).toBe("document");
  });
});

describe("canvaEmbedUrl", () => {
  const design = "https://www.canva.com/design/DAGabc123/AbCdEf/view";

  it("normalises share, watch and edit links to the embeddable viewer", () => {
    const expected = "https://www.canva.com/design/DAGabc123/AbCdEf/view?embed";
    expect(canvaEmbedUrl(`${design}?utm_campaign=designshare`)).toBe(expected);
    expect(canvaEmbedUrl("https://www.canva.com/design/DAGabc123/AbCdEf/edit")).toBe(
      expected,
    );
    expect(canvaEmbedUrl(" https://canva.com/design/DAGabc123/watch ")).toBe(
      "https://www.canva.com/design/DAGabc123/view?embed",
    );
  });

  it("rejects anything that is not a Canva design", () => {
    expect(() => canvaEmbedUrl("https://example.com/design/DAGabc123/view")).toThrow(
      InvalidCanvaUrlError,
    );
    expect(() => canvaEmbedUrl("http://www.canva.com/design/DAGabc123/view")).toThrow(
      InvalidCanvaUrlError,
    );
    expect(() => canvaEmbedUrl("https://www.canva.com/folder/DAGabc123")).toThrow(
      InvalidCanvaUrlError,
    );
    expect(() => canvaEmbedUrl("not a url")).toThrow(InvalidCanvaUrlError);
  });
});
