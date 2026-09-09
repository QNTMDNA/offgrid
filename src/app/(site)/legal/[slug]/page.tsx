import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LEGAL_DOCUMENTS, legalDocument } from "@/content/legal";
import { Eyebrow, Section } from "@/components/ui";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return LEGAL_DOCUMENTS.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const doc = legalDocument((await params).slug);
  return doc ? { title: doc.title, description: doc.summary } : {};
}

export default async function LegalPage({ params }: Params) {
  const doc = legalDocument((await params).slug);
  if (!doc) notFound();

  return (
    <Section>
      <Eyebrow>Legal</Eyebrow>
      <h1 className="display mt-6 text-4xl">{doc.title}</h1>
      <p className="mt-6 max-w-2xl text-paper/60">{doc.summary}</p>

      <div className="mt-16 max-w-2xl space-y-12">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl font-light">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="mt-4 text-sm leading-relaxed text-paper/60">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </Section>
  );
}
