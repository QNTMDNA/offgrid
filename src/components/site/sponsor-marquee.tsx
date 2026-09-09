import Image from "next/image";
import { SPONSOR_LOGOS } from "@/lib/brand";

export function SponsorMarquee() {
  const logos = [...SPONSOR_LOGOS, ...SPONSOR_LOGOS];
  return (
    <div className="bleed overflow-hidden py-10">
      <div className="marquee-track flex w-max items-center gap-16">
        {logos.map((src, index) => (
          <Image
            key={`${src}-${index}`}
            src={src}
            alt=""
            width={160}
            height={64}
            className="h-12 w-auto opacity-60 grayscale transition hover:opacity-100"
          />
        ))}
      </div>
    </div>
  );
}
