import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Radio } from "lucide-react";
import { btnSecondary } from "@/components/app/form";
import { Disclaimer, EmptyPanel, FeedThumb, HubPageHeader, Tag, ToneBadge } from "@/components/hub/kit";
import { getHubAccess } from "@/lib/aq-modules/access";
import { publishedAnalysis } from "@/lib/aq-modules/store";
import { productOf, THUMBS, TELEX_PRODUCTS, toneOf, type AnalysisNote, type TelexProduct } from "@/lib/aq-modules/types";
import { excerpt, formatDay, plainText } from "@/lib/content-types";

export const metadata: Metadata = { title: "AQ View" };
export const dynamic = "force-dynamic";

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function view(note: AnalysisNote) {
  return {
    note,
    product: productOf(`${note.products.join(" ")} ${note.title}`),
    tone: toneOf(`${note.title} ${plainText(note.body)}`),
    summary: excerpt([note.body], 40),
  };
}

type NoteView = ReturnType<typeof view>;

function NoteTags({ item }: { item: NoteView }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ToneBadge tone={item.tone} />
      {item.note.products.slice(0, 3).map((product) => (
        <Tag key={product} tone="teal">
          {product}
        </Tag>
      ))}
      {item.note.regions.slice(0, 2).map((region) => (
        <span key={region} className="rounded-full border border-border px-2 py-0.5 text-[11.5px] font-medium text-mid">
          {region}
        </span>
      ))}
    </div>
  );
}

const byline = (note: AnalysisNote) => `${note.author || "Aquifert Desk"} · ${formatDay(note.publishedAt)}`;

export default async function AnalysisPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { modules } = await getHubAccess();
  const notes = publishedAnalysis(modules).map(view);
  const present = TELEX_PRODUCTS.filter((product) => notes.some((item) => item.product === product));
  const raw = first(params.p);
  const active = present.find((product) => product === raw) ?? null;
  const shown = active ? notes.filter((item) => item.product === active) : notes;
  const [featured, ...rest] = shown;

  const chip = (label: string, product: TelexProduct | null) => {
    const on = active === product;
    return (
      <Link
        key={label}
        href={product ? `/hub/analysis?p=${product}` : "/hub/analysis"}
        aria-current={on ? "page" : undefined}
        scroll={false}
        className={`inline-flex min-h-9 items-center rounded-full border px-3 py-1 text-[13.5px] font-semibold no-underline transition-colors ${
          on ? "border-teal-600 bg-teal-600 text-white shadow-sm" : "border-border bg-white text-mid hover:border-teal-500/60 hover:text-ink"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="mx-auto max-w-5xl pb-2">
      <HubPageHeader
        eyebrow="AQ ONE Free plan"
        title="AQ View"
        description={
          notes[0]
            ? `What a move means, not just what happened. The desk's interpretation for buyers, with what to watch next. Latest note ${formatDay(notes[0].note.publishedAt)}.`
            : "What a move means, not just what happened. The desk's interpretation for buyers, with what to watch next."
        }
        tip="The Telex reports what happened. AQ View notes explain why it matters, who it affects and what would change the picture. Each note links back to the flashes it interprets."
        guide="analysis"
        actions={
          <Link href="/hub/telex" className={btnSecondary}>
            <Radio className="h-4 w-4" /> TELEX
          </Link>
        }
      />

      {present.length > 1 ? (
        <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Filter notes by product">
          {chip("All notes", null)}
          {present.map((product) => chip(product, product))}
        </nav>
      ) : null}

      {!featured ? (
        <EmptyPanel
          title={active ? `No ${active.toLowerCase()} notes yet` : "No analysis published yet"}
          body={
            active
              ? "The desk has not written on this product recently. The rest of the feed is one click away."
              : "The desk publishes analysis when a move needs explaining. Until then, the Telex carries the latest flashes."
          }
          action={
            <Link href={active ? "/hub/analysis" : "/hub/telex"} className={btnSecondary}>
              {active ? "Show all notes" : "Open the Telex"}
            </Link>
          }
        />
      ) : (
        <div className="aq-stagger flex flex-col gap-4">
          <Link href={`/hub/analysis/${featured.note.slug}`} className="aq-card aq-lift group grid overflow-hidden no-underline md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <div className="relative aspect-[16/9] md:aspect-auto md:min-h-[260px]">
              <Image src={THUMBS[featured.product]} alt="" fill sizes="(min-width: 768px) 420px, 100vw" className="object-cover" priority />
              <span className="absolute left-3 top-3">
                <Tag tone="teal" className="shadow-sm">
                  Latest note
                </Tag>
              </span>
            </div>
            <div className="flex flex-col p-5 sm:p-6">
              <NoteTags item={featured} />
              <h2 className="mt-2.5 text-[21px] font-semibold leading-snug tracking-[-0.015em] text-ink group-hover:text-blue md:text-[24px]">{featured.note.title}</h2>
              <p className="mt-2 text-[15.5px] leading-relaxed text-mid">{featured.summary}</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                <p className="text-[13.5px] text-dim">{byline(featured.note)}</p>
                <span className="inline-flex items-center gap-1 text-[14.5px] font-semibold text-blue">
                  Read the note <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          </Link>

          {rest.length ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {rest.map((item) => (
                <Link key={item.note.id} href={`/hub/analysis/${item.note.slug}`} className="aq-card aq-lift group flex gap-4 p-4 no-underline sm:p-5">
                  <FeedThumb product={item.product} size={64} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <NoteTags item={item} />
                    <h2 className="mt-2 text-[17px] font-semibold leading-snug text-ink group-hover:text-blue">{item.note.title}</h2>
                    <p className="mt-1 line-clamp-3 text-[14.5px] leading-relaxed text-mid">{item.summary}</p>
                    <p className="mt-auto pt-3 text-[13px] text-dim">{byline(item.note)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-6">
        <Disclaimer />
      </div>
    </div>
  );
}
