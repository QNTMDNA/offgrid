import { describe, expect, it } from "vitest";
import { parseRules, rulesToWhere } from "@/lib/marketing/segments";

describe("segment rules", () => {
  it("defaults to confirmed subscribers only", () => {
    expect(rulesToWhere(parseRules({}))).toEqual({ status: { in: ["SUBSCRIBED"] } });
  });

  it("rejects a grammar the compiler cannot express", () => {
    expect(() => parseRules({ status: ["EVERYONE"] })).toThrow();
  });

  it("compiles tag rules into a single where clause", () => {
    const where = rulesToWhere(
      parseRules({ allTags: ["vip"], anyTags: ["monaco-26", "monza-26"], noneTags: ["staff"] }),
    );
    expect(where.tags).toEqual({ hasEvery: ["vip"] });
    expect(where.AND).toEqual([{ tags: { hasSome: ["monaco-26", "monza-26"] } }]);
    expect(where.NOT).toEqual({ tags: { hasSome: ["staff"] } });
  });

  it("scopes an edition audience to buyers of that edition", () => {
    const where = rulesToWhere(parseRules({ editionId: "edition-1", hasPurchased: true }));
    expect(where.contact).toEqual({
      is: { orders: { some: { items: { some: { package: { editionId: "edition-1" } } } } } },
    });
  });
});
