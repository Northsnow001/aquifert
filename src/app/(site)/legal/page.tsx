import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { MarketingLayout } from "@/marketing/components/MarketingLayout";
import { LEGAL_CONTACT, LEGAL_DOCS, LEGAL_UPDATED } from "@/lib/legal/documents";

export const metadata: Metadata = {
  title: "Legal, Aquifert",
  description:
    "Aquifert's trading terms, platform terms of use, privacy policy, data protection and GDPR notice, and payment and refund policy.",
  alternates: { canonical: "/legal" },
};

export default function LegalIndexPage() {
  return (
    <MarketingLayout>
      <section className="bg-navy-900" aria-labelledby="legal-heading">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-300">Legal</p>
          <h1 id="legal-heading" className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
            The terms we trade on.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
            Plain-English policies for trading with Aquifert and using the platform. Effective {LEGAL_UPDATED}.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-label="Legal documents">
        <ul className="grid gap-4 sm:grid-cols-2">
          {LEGAL_DOCS.map((doc) => (
            <li key={doc.slug}>
              <Link
                href={`/legal/${doc.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 no-underline shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <FileText className="h-5 w-5" aria-hidden />
                </span>
                <span className="mt-4 text-lg font-bold text-navy-900">{doc.title}</span>
                <span className="mt-2 flex-1 text-[15px] leading-relaxed text-slate-600">{doc.summary}</span>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700">
                  Read
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-sm text-slate-500">{LEGAL_CONTACT}</p>
      </section>
    </MarketingLayout>
  );
}
