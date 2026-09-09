/**
 * Placeholder legal copy replacing the Shopify-hosted policies. Shopify's
 * generated versions name Shopify as processor, which is wrong for this stack
 * (own database, Wise, Salesforce, Speakeasy). Every document below is a draft
 * and must be reviewed by counsel before the site goes live.
 */
export type LegalDocument = {
  slug: string;
  title: string;
  summary: string;
  sections: Array<{ heading: string; body: string[] }>;
};

const CONTACT = "privacy@offgridrace.com";

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: "privacy",
    title: "Privacy policy",
    summary:
      "How Off Grid collects, uses and shares personal data when you request access, book hospitality or subscribe to our list.",
    sections: [
      {
        heading: "Who we are",
        body: [
          "Off Grid is the controller of the personal data described in this policy. Questions and rights requests go to " +
            CONTACT +
            ".",
        ],
      },
      {
        heading: "What we collect",
        body: [
          "Identity and contact details you provide through access requests, sponsor inquiries, checkout and guest lists — name, email, phone, company and country.",
          "Booking and payment records: the packages you reserve, invoices, payment references and the status of bank transfers. We do not store card numbers.",
          "Guest details you submit on behalf of others, used solely to issue credentials and manage the event.",
          "Marketing preferences and engagement, including double opt-in confirmations, campaign opens and unsubscribe events.",
          "Attribution data from your visit — referrer, UTM parameters and a first-party cookie — used to understand which channels bring guests to us.",
        ],
      },
      {
        heading: "Why we use it",
        body: [
          "To review access requests, sell and deliver hospitality, issue invoices and reconcile payments (contract).",
          "To operate our customer relationship management and respond to inquiries (legitimate interests).",
          "To send marketing email, only after you confirm your subscription (consent, withdrawable at any time).",
          "To meet accounting, tax and anti-fraud obligations (legal obligation).",
        ],
      },
      {
        heading: "Who we share it with",
        body: [
          "Salesforce (CRM records), Wise (payments and partner payouts), Speakeasy (ticketing, reservations and on-site spend), our email delivery provider and our hosting and database providers.",
          "Race promoters, circuits and hospitality venues, where your details are required to admit you to the event.",
          "Authorities where we are legally required to disclose.",
        ],
      },
      {
        heading: "International transfers",
        body: [
          "Our events and processors span the EU, the UK, the US, the UAE and Mexico. Transfers outside your jurisdiction rely on standard contractual clauses or equivalent safeguards.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "Booking, invoice and payment records are retained for the period required by tax and accounting law. Marketing records are retained until you unsubscribe, then kept as a suppression record so we do not contact you again. Access requests that do not convert are reviewed periodically and deleted.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "Depending on where you live you may request access, correction, deletion, restriction, portability, or object to processing based on legitimate interests. You may withdraw marketing consent at any time using the unsubscribe link in any email or by writing to " +
            CONTACT +
            ".",
          "You also have the right to complain to your local data protection authority.",
        ],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms of service",
    summary:
      "The terms on which Off Grid offers, sells and delivers hospitality packages.",
    sections: [
      {
        heading: "Access and eligibility",
        body: [
          "Access to Off Grid hospitality is reviewed individually. Submitting a request does not create a booking, and we may decline a request without giving reasons.",
        ],
      },
      {
        heading: "Reservations and holds",
        body: [
          "Selecting a package places a temporary hold on inventory while you complete your details. Holds expire automatically and release the allocation back to general availability.",
          "A reservation becomes a confirmed booking only when the invoice is paid in full and we confirm in writing.",
        ],
      },
      {
        heading: "Prices, invoices and payment",
        body: [
          "Prices are shown in the currency of the race edition and exclude taxes and duties unless stated. A single order covers one race edition.",
          "Invoices are payable by bank transfer quoting the reference we issue. Payments that cannot be matched to a reference may delay confirmation.",
        ],
      },
      {
        heading: "Changes, cancellations and refunds",
        body: [
          "Guest names may be changed up to the deadline stated in your confirmation. Cancellation terms and any refund are as set out in your booking confirmation.",
          "If a race is cancelled, postponed or run without spectators by the promoter, we will offer a transfer to another edition or a refund of amounts we recover, less non-recoverable third-party costs.",
        ],
      },
      {
        heading: "Conduct and event rules",
        body: [
          "Attendance is subject to the rules of the promoter, circuit and venue, including accreditation, security and age restrictions. We may refuse or withdraw access where conduct puts guests, staff or the event at risk, without refund.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "Nothing in these terms limits liability for death or personal injury caused by negligence, fraud, or any liability that cannot lawfully be limited. Subject to that, our total liability in connection with a booking is limited to the amount you paid for it.",
        ],
      },
      {
        heading: "Governing law",
        body: [
          "These terms and any dispute arising from them are governed by the law stated in your booking confirmation, and the courts named there have exclusive jurisdiction.",
        ],
      },
    ],
  },
  {
    slug: "data-sharing",
    title: "Data sharing opt-out",
    summary:
      "How to opt out of the sharing of your personal information for targeted advertising, and of marketing email.",
    sections: [
      {
        heading: "What this covers",
        body: [
          'Some privacy laws — including US state laws such as the CCPA/CPRA — treat the use of advertising and analytics tools as a "sale" or "sharing" of personal information. This page tells you how to opt out.',
        ],
      },
      {
        heading: "Opt out of marketing email",
        body: [
          "Use the unsubscribe link in any email, or the unsubscribe page on this site. Unsubscribes take effect immediately and are kept as a suppression record.",
        ],
      },
      {
        heading: "Opt out of advertising and analytics sharing",
        body: [
          "Decline non-essential cookies in the consent banner, or send a Global Privacy Control signal from your browser and we will honour it.",
          "To submit a request covering data already collected, email " +
            CONTACT +
            " from the address you used with us, stating the request. We do not discriminate against anyone who exercises these rights.",
        ],
      },
      {
        heading: "Authorised agents",
        body: [
          "An authorised agent may submit a request on your behalf with written proof of authorisation. We may still contact you to verify the request.",
        ],
      },
    ],
  },
];

export function legalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((doc) => doc.slug === slug);
}
