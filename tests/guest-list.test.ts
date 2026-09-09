import { describe, expect, it } from "vitest";
import { parseGuestList } from "@/lib/commerce/guest-list";

describe("parseGuestList", () => {
  it("parses one guest per line", () => {
    expect(
      parseGuestList("Ada Lovelace <ada@example.com>\n Alan Turing <alan@example.com> "),
    ).toEqual([
      { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
      { firstName: "Alan", lastName: "Turing", email: "alan@example.com" },
    ]);
  });

  it("keeps multi-word surnames intact and defaults a missing one", () => {
    expect(parseGuestList("Juan de la Cruz <juan@example.com>")[0]).toEqual({
      firstName: "Juan",
      lastName: "de la Cruz",
      email: "juan@example.com",
    });
    expect(parseGuestList("Prince <prince@example.com>")[0].lastName).toBe("—");
  });

  it("drops lines that carry no usable email", () => {
    expect(parseGuestList("guest list to follow\n\nAda Lovelace")).toEqual([]);
  });
});
