import { randomInt } from "node:crypto";

/** Crockford base32 minus vowels: no accidental words, no 0/O or 1/I confusion. */
const ALPHABET = "23456789BCDFGHJKLMNPQRSTVWXZ";
const GROUP = 4;
const GROUPS = 3;

/**
 * Issued passcodes are shown to the operator once and stored only as a hash,
 * so they have to be readable over a phone call.
 */
export function generatePasscode(): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g += 1) {
    let group = "";
    for (let i = 0; i < GROUP; i += 1) {
      group += ALPHABET[randomInt(ALPHABET.length)];
    }
    groups.push(group);
  }
  return groups.join("-");
}

/** Accepts the passcode as typed: any case, spaces or dashes. */
export function normalisePasscode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
