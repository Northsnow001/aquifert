import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { MarketingLayout } from "@/marketing/components/MarketingLayout";
import { LegalContents, LegalSections } from "@/components/legal/legal-document";
import { LEGAL_CONTACT, LEGAL_DOCS, LEGAL_UPDATED, legalDoc } from "@/lib/legal/documents";

export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_DOCS.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const doc = legalDoc((await params).slug);
  if (!doc) return {};
  return {
    title: `${doc.title}, Aquifert`,
    description: doc.summary,
    alternates: { canonical: `/legal/${doc.slug}` },
  };
}

export default async function LegalDocumentPage({ params }: PageProps<"/legal/[slug]">) {
  const doc = legalDoc((await params).slug);
  if (!doc) notFound();
  const others = LEGAL_DOCS.filter((other) => other.slug !== doc.slug);

  return (
    <MarketingLayout>
      <section className="bg-navy-900" aria-labelledby="legal-heading">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <Link href="/legal" className="inline-flex items-center gap-1 text-[13px] font-semibold text-teal-300 no-underline hover:text-teal-200">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            All legal documents
          </Link>
          <h1 id="legal-heading" className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-[44px]">
            {doc.title}
          </h1>
          <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-slate-300">{doc.summary}</p>
          <p className="mt-5 text-[13px] text-slate-400">
            Effective and last updated {LEGAL_UPDATED} · {LEGAL_CONTACT}
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[260px_1fr] lg:gap-14">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="Contents" className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Contents</p>
            <LegalContents doc={doc} />
          </nav>
          <nav aria-label="Other legal documents" className="mt-6 hidden lg:block">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Other documents</p>
            <ul className="space-y-1.5 text-[14px]">
              {others.map((other) => (
                <li key={other.slug}>
                  <Link href={`/legal/${other.slug}`} className="text-slate-600 no-underline hover:text-teal-700">
                    {other.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0 max-w-3xl">
          <LegalSections doc={doc} />
          <p className="mt-12 border-t border-border pt-6 text-sm text-slate-500">
            Last updated: {LEGAL_UPDATED}. Questions about this document? Email{" "}
            <a href="mailto:enquiry@aquifert.com" className="font-medium text-teal-700">
              enquiry@aquifert.com
            </a>
            .
          </p>
        </article>
      </div>
    </MarketingLayout>
  );
}
