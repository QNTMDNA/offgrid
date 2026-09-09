import type { GuestInput } from "@/lib/commerce/orders";

/**
 * Guests are entered as one `First Last <email>` per line — bookings at this
 * value are placed by assistants who paste a list rather than fill a row per
 * guest. Lines without a usable name and email are dropped rather than
 * rejected, so a trailing note never blocks a checkout.
 */
export function parseGuestList(raw: string): GuestInput[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^(.*?)\s*<([^>]+)>$/.exec(line);
      const name = (match?.[1] ?? "").trim();
      const email = match?.[2]?.trim() ?? "";
      const [firstName, ...rest] = name.split(/\s+/).filter(Boolean);
      return {
        firstName: firstName ?? "",
        lastName: rest.join(" ") || "—",
        email,
      };
    })
    .filter((guest) => guest.firstName !== "" && guest.email.includes("@"));
}
