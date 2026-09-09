/**
 * Bank details printed on customer invoices.
 *
 * These mirror the receiving accounts on the Off Grid Wise business profile.
 * They are configuration rather than API data: Wise account details are stable
 * per currency, and an invoice must keep working if the API is unavailable.
 * A snapshot is stored on each invoice at issue time.
 */

export type BankDetails = {
  currency: string;
  accountHolder: string;
  bankName: string;
  /** Ordered rows rendered on the invoice, e.g. IBAN / BIC or routing / account. */
  fields: Array<{ label: string; value: string }>;
  address: string;
};

const HOLDER = "Off Grid Race Ltd";

const DETAILS: Record<string, BankDetails> = {
  USD: {
    currency: "USD",
    accountHolder: HOLDER,
    bankName: "Community Federal Savings Bank",
    fields: [
      { label: "Routing number (ACH & Wire)", value: "REPLACE_ME" },
      { label: "Account number", value: "REPLACE_ME" },
      { label: "Account type", value: "Checking" },
    ],
    address: "89-16 Jamaica Ave, Woodhaven, NY 11421, United States",
  },
  EUR: {
    currency: "EUR",
    accountHolder: HOLDER,
    bankName: "Wise Europe SA",
    fields: [
      { label: "IBAN", value: "REPLACE_ME" },
      { label: "BIC", value: "TRWIBEB1XXX" },
    ],
    address: "Rue du Trône 100, 3rd floor, Brussels, 1050, Belgium",
  },
  GBP: {
    currency: "GBP",
    accountHolder: HOLDER,
    bankName: "Wise Payments Limited",
    fields: [
      { label: "Sort code", value: "REPLACE_ME" },
      { label: "Account number", value: "REPLACE_ME" },
    ],
    address: "1st Floor, Worship Square, 65 Clifton Street, London, EC2A 4JE",
  },
  AED: {
    currency: "AED",
    accountHolder: HOLDER,
    bankName: "Wise",
    fields: [{ label: "IBAN", value: "REPLACE_ME" }],
    address: "Dubai, United Arab Emirates",
  },
};

export function bankDetailsForCurrency(currency: string): BankDetails {
  return DETAILS[currency.toUpperCase()] ?? DETAILS.USD;
}

export function supportedInvoiceCurrencies(): string[] {
  return Object.keys(DETAILS);
}
