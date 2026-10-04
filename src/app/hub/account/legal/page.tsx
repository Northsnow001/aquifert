import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { btnSecondary } from "@/components/app/form";
import { AccountIntro } from "@/components/hub/kit";
import { LegalContents, LegalSections } from "@/components/legal/legal-document";
import { LEGAL_CONTACT, LEGAL_DOCS, LEGAL_UPDATED, legalDoc } from "@/lib/legal/documents";

export const metadata: Metadata = { title: "Legal" };

export default async function LegalPage({ searchParams }: PageProps<"/hub/account/legal">) {
  const { doc: requested } = await searchParams;
  const doc = legalDoc(typeof requested === "string" ? requested : undefined) ?? LEGAL_DOCS[0];

  return (
    <div className="flex flex-col gap-6 pb-2">
      <AccountIntro
        description={`The terms that apply to your account, your trades and your data. Effective ${LEGAL_UPDATED}.`}
        actions={
          <a href={`/legal/${doc.slug}`} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
            Public page <ExternalLink className="h-4 w-4" />
          </a>
        }
      />

      <nav aria-label="Legal documents" className="flex flex-wrap gap-2">
        {LEGAL_DOCS.map((item) => {
          const active = item.slug === doc.slug;
          return (
            <Link
              key={item.slug}
              href={`/hub/account/legal?doc=${item.slug}`}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-[14px] font-semibold no-underline transition ${
                active ? "border-navy-700 bg-navy-700 text-white" : "border-border bg-white text-mid hover:border-navy-300 hover:text-ink"
              }`}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[250px_1fr]">
        <aside className="aq-card p-5 lg:sticky lg:top-20">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-dim">Contents</p>
          <LegalContents doc={doc} />
        </aside>

        <article className="aq-card min-w-0 p-5 md:p-8">
          <header className="mb-8 border-b border-border pb-6">
            <h2 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] text-ink">{doc.title}</h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-mid">{doc.summary}</p>
            <p className="mt-3 text-[13px] text-dim">
              Effective and last updated {LEGAL_UPDATED} · {LEGAL_CONTACT}
            </p>
          </header>
          <div className="max-w-3xl">
            <LegalSections doc={doc} />
          </div>
        </article>
      </div>
    </div>
  );
}
