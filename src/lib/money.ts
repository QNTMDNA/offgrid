/** Currencies with no minor unit; amounts are stored as whole units. */
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "CLP", "ISK"]);

export function minorUnitFactor(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 1 : 100;
}

export function toMinor(amount: number, currency: string): number {
  return Math.round(amount * minorUnitFactor(currency));
}

export function fromMinor(minor: number, currency: string): number {
  return minor / minorUnitFactor(currency);
}

export function formatMoney(
  minor: number,
  currency: string,
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2,
  }).format(fromMinor(minor, currency));
}
