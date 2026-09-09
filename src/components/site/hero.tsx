import Image from "next/image";
import type { ReactNode } from "react";

export function Hero({
  image,
  eyebrow,
  title,
  children,
  priority = false,
  height = "tall",
}: {
  image: string;
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  priority?: boolean;
  height?: "tall" | "short";
}) {
  return (
    <section
      className={`relative flex w-full items-center justify-center overflow-hidden ${
        height === "tall" ? "min-h-[86vh]" : "min-h-[52vh]"
      }`}
    >
      <Image
        src={image}
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/40 to-ink" />
      <div className="relative mx-auto w-full max-w-6xl px-6 py-28 text-center">
        {eyebrow ? <p className="eyebrow text-paper/70">{eyebrow}</p> : null}
        <h1 className="display mt-6 text-5xl sm:text-7xl lg:text-8xl">{title}</h1>
        {children ? (
          <div className="mx-auto mt-8 max-w-2xl text-paper/75">{children}</div>
        ) : null}
      </div>
    </section>
  );
}
