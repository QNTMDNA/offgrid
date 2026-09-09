import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sponsor Lounge",
  robots: { index: false, follow: false },
};

export default function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-paper/10">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-sm uppercase tracking-[0.4em]">
            Off Grid
          </Link>
          <p className="eyebrow text-paper/40">Sponsor Lounge</p>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
