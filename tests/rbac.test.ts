import { describe, expect, it } from "vitest";
import { CAPABILITIES, can } from "@/lib/auth/rbac";

describe("rbac", () => {
  it("gives read-only accounts no write capability at all", () => {
    expect(CAPABILITIES.filter((c) => can("READ_ONLY", c)).every((c) => c.endsWith(":read"))).toBe(
      true,
    );
  });

  it("keeps payouts away from sales and marketing", () => {
    expect(can("SALES", "payouts:write")).toBe(false);
    expect(can("MARKETING", "payouts:write")).toBe(false);
    expect(can("OPERATIONS", "payouts:write")).toBe(true);
  });

  it("reserves the investor room for admins", () => {
    expect(can("ADMIN", "investors:read")).toBe(true);
    expect(can("ADMIN", "investors:write")).toBe(true);
    for (const role of ["SALES", "OPERATIONS", "MARKETING", "READ_ONLY"] as const) {
      expect(can(role, "investors:read")).toBe(false);
      expect(can(role, "investors:write")).toBe(false);
    }
  });

  it("reserves settings for admins", () => {
    expect(can("ADMIN", "settings:write")).toBe(true);
    expect(can("OPERATIONS", "settings:write")).toBe(false);
  });
});
