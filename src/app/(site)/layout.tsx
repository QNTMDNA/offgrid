import Link from "next/link";
import type { ReactNode } from "react";
import { Attribution } from "@/components/site/attribution";
import { SubscribeForm } from "@/components/site/subscribe-form";

const NAV = [
  { href: "/races", label: "Race Calendar" },
  { href: "/partners", label: "Partners" },
  { href: "/request-access", label: "Request Access" },
  { href: "/sponsor-inquiry", label: "Sponsor Inquiries" },
];

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Attribution />
      <header className="sticky top-0 z-50 border-b border-paper/10 bg-ink/90 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-sm uppercase tracking-[0.4em]">
            Off Grid
          </Link>
          <div className="hidden gap-8 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="eyebrow text-paper/60 transition hover:text-paper"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <Link href="/cart" className="eyebrow text-paper/60 hover:text-paper">
            Cart
          </Link>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-paper/10">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 md:grid-cols-2">
          <div>
            <p className="eyebrow text-paper/50">Secure your access</p>
            <h2 className="mt-4 max-w-sm text-2xl font-light">
              Be first to receive allocations, private events, and special offers.
            </h2>
            <div className="mt-6 max-w-sm">
              <SubscribeForm />
            </div>
          </div>
          <div className="flex flex-col gap-8 md:items-end">
            <div className="flex flex-col gap-3 md:items-end">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="eyebrow text-paper/50 hover:text-paper"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <p className="text-xs text-paper/40">
              info@offgridrace.com — © {new Date().getFullYear()} Off Grid
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
