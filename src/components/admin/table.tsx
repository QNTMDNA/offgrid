import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-light">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-paper/50">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink p-6">
      <p className="eyebrow text-paper/40">{label}</p>
      <p className="mt-3 text-2xl font-light">{value}</p>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-px bg-paper/10 md:grid-cols-4">{children}</div>;
}

export function Table({
  columns,
  children,
}: {
  columns: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-paper/15">
            {columns.map((column) => (
              <th
                key={column}
                className="eyebrow px-3 py-3 text-left font-normal text-paper/40"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-paper/10">{children}</tbody>
      </table>
    </div>
  );
}

export function Cell({
  children,
  muted,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <td className={`px-3 py-4 align-top ${muted ? "text-paper/50" : ""}`}>{children}</td>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="mt-10 text-sm text-paper/40">{children}</p>;
}
