import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { currentSession } from "@/lib/auth/session";
import { can, type Capability } from "@/lib/auth/rbac";
import { logoutAction } from "@/app/actions/admin";

const NAV: Array<{ href: string; label: string; capability?: Capability }> = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/crm", label: "CRM" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/catalog", label: "Catalog" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/marketing", label: "Marketing" },
  { href: "/admin/integrations", label: "Integrations" },
  { href: "/admin/sponsor-lounge", label: "Sponsor Lounge", capability: "lounge:read" },
];

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const session = await currentSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-paper/10 p-6 md:block">
        <Link href="/admin" className="text-xs uppercase tracking-[0.35em]">
          Off Grid
        </Link>
        <nav className="mt-10 flex flex-col gap-4">
          {NAV.filter(
            (item) => !item.capability || can(session.role, item.capability),
          ).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="eyebrow text-paper/50 hover:text-paper"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-paper/10 px-6 py-4">
          <p className="eyebrow text-paper/40">
            {session.name} — {session.role.replace("_", " ")}
          </p>
          <form action={logoutAction}>
            <button className="eyebrow text-paper/50 hover:text-accent" type="submit">
              Sign out
            </button>
          </form>
        </header>
        <div className="flex-1 p-6 md:p-10">{children}</div>
      </div>
    </div>
  );
}
