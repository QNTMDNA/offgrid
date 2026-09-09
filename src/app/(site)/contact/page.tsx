import Link from "next/link";
import type { Metadata } from "next";
import { Eyebrow, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach the Off Grid team about access, existing bookings, partnerships or press.",
};

const ROUTES = [
  {
    heading: "Access and bookings",
    body: "Availability, pricing and the programme for an upcoming round.",
    email: "info@offgridrace.com",
    action: { href: "/request-access", label: "Request access" },
  },
  {
    heading: "Existing reservations",
    body: "Guest names, invoices, payment references and arrival details. Quote your reservation number.",
    email: "guests@offgridrace.com",
  },
  {
    heading: "Sponsorship and partnerships",
    body: "Brand activations, venue and hospitality partnerships.",
    email: "partners@offgridrace.com",
    action: { href: "/sponsor-inquiry", label: "Sponsor inquiry" },
  },
  {
    heading: "Press",
    body: "Media requests and accreditation.",
    email: "press@offgridrace.com",
  },
  {
    heading: "Privacy",
    body: "Data access, deletion and opt-out requests.",
    email: "privacy@offgridrace.com",
    action: { href: "/legal/privacy", label: "Privacy policy" },
  },
];

export default function ContactPage() {
  return (
    <Section>
      <Eyebrow>Contact</Eyebrow>
      <h1 className="display mt-6 text-4xl">Talk to the team</h1>
      <p className="mt-6 max-w-2xl text-paper/60">
        We answer every message. For the fastest response on a specific weekend, use the
        access request form — it reaches the team handling that round.
      </p>

      <div className="mt-16 grid gap-px border border-paper/10 bg-paper/10 md:grid-cols-2">
        {ROUTES.map((route) => (
          <div key={route.heading} className="bg-ink p-8">
            <h2 className="text-xl font-light">{route.heading}</h2>
            <p className="mt-3 text-sm text-paper/60">{route.body}</p>
            <a
              href={`mailto:${route.email}`}
              className="mt-6 block text-sm text-accent hover:underline"
            >
              {route.email}
            </a>
            {route.action ? (
              <Link
                href={route.action.href}
                className="eyebrow mt-4 block text-paper/50 hover:text-paper"
              >
                {route.action.label}
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </Section>
  );
}
