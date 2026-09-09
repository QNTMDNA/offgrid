import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow text-paper/50">{children}</p>;
}

export function Section({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mx-auto w-full max-w-7xl px-6 py-20 ${className}`}>
      {children}
    </section>
  );
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 px-6 py-3 text-xs uppercase tracking-[0.2em] transition disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_VARIANTS = {
  solid: "bg-accent text-ink hover:bg-paper",
  outline: "border border-paper/30 text-paper hover:border-accent hover:text-accent",
  ghost: "text-paper/70 hover:text-paper",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;

export function Button({
  variant = "solid",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`}
    />
  );
}

export function ButtonLink({
  variant = "solid",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return (
    <Link
      {...props}
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`}
    />
  );
}

/** Plain anchor for links that must not be prefetched, such as the logged
 * document routes: a prefetch would record an access nobody asked for. */
export function AnchorButton({
  variant = "solid",
  className = "",
  ...props
}: ComponentProps<"a"> & { variant?: ButtonVariant }) {
  return (
    <a {...props} className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${className}`} />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="eyebrow text-paper/50">{label}</span>
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-1 text-xs text-paper/40">{hint}</p> : null}
    </label>
  );
}

export const inputClass =
  "w-full border border-paper/20 bg-transparent px-4 py-3 text-sm text-paper outline-none placeholder:text-paper/30 focus:border-accent";

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "error" | "success";
  children: ReactNode;
}) {
  const tones = {
    info: "border-paper/25 text-paper/70",
    error: "border-red-500/60 text-red-300",
    success: "border-accent/60 text-accent",
  } as const;
  return (
    <p className={`border px-4 py-3 text-sm ${tones[tone]}`} role="status">
      {children}
    </p>
  );
}
