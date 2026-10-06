import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AquibotBriefing, type BriefRow } from "@/components/hub/aquibot-briefing";
import { HomeHero } from "@/components/hub/home-hero";
import { TelexLead } from "@/components/hub/home-telex";
import { HomeTelexFilter } from "@/components/hub/home-telex-filter";
import { FeedThumb } from "@/components/hub/kit";
import { PaperForwardBrief } from "@/components/hub/paper-forward";
import { TelexWire, type WireRow } from "@/components/hub/telex-wire";
import { getHubAccess } from "@/lib/aq-modules/access";
import { getPrefs } from "@/lib/aq-modules/members";
import { publishedAnalysis } from "@/lib/aq-modules/store";
import { publishedTelex } from "@/lib/aq-modules/telex";
import { productOf, TELEX_PRODUCTS, toneOf, type AnalysisNote, type TelexProduct } from "@/lib/aq-modules/types";
import { deskNow, formatDay, plainText } from "@/lib/content-types";
import { getHubContent, sortHedge } from "@/lib/hub-content";

export const dynamic = "force-dynamic";

/** The newest flashes fill the lead box and the four boxes beside it; the list starts after them. */
const LEAD_COUNT = 5;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** No `p` means "open on the saved default"; `p=all` means the member cleared it. Same rule as the TELEX page. */
function parseProducts(raw: string | undefined, fallback: TelexProduct[]): TelexProduct[] {
  if (raw === undefined) return fallback;
  if (raw === "all" || !raw.trim()) return [];
  const picked = raw.split(",").map((item) => item.trim());
  return TELEX_PRODUCTS.filter((item) => picked.includes(item));
}

const noteProduct = (note: AnalysisNote) => productOf(`${note.products.join(" ")} ${note.title}`);

/** AQ View on the hub: the newest Market Analysis notes the desk publishes in admin. */
function AqViewCard({ notes }: { notes: AnalysisNote[] }) {
  return (
    <section aria-labelledby="aq-view-title" className="aq-card min-w-0 overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[12px] font-black text-white shadow" style={{ background: "var(--aq-ai-gradient)" }}>
            AQ
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-dim">AQ View</p>
            <h2 id="aq-view-title" className="text-[15.5px] font-bold leading-tight text-ink">
              Market Analysis
            </h2>
          </div>
        </div>
        <Link
          href="/hub/analysis"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-[12px] font-semibold text-navy-700 no-underline transition hover:border-navy-400 hover:bg-s2"
        >
          Open feed <ArrowRight className="h-3 w-3" />
        </Link>
      </header>
      <div className="space-y-2.5 p-3.5">
        {notes.length === 0 ? <p className="py-4 text-center text-[13px] text-mid">No entries yet. The desk publishes most weekday mornings.</p> : null}
        {notes.map((note, index) => (
          <Link
            key={note.id}
            href={`/hub/analysis/${note.slug}`}
            className="group flex items-start gap-3 rounded-xl border border-border bg-s2/40 p-2.5 no-underline transition hover:border-navy-400/50 hover:bg-s2"
          >
            <FeedThumb product={noteProduct(note)} pick={index} size={56} className="rounded-lg" />
            <div className="min-w-0 flex-1">
              {note.products.length ? (
                <div className="flex flex-wrap gap-1">
                  {note.products.slice(0, 3).map((product) => (
                    <span key={product} className="rounded-md bg-s2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mid">
                      {product}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="mt-1 line-clamp-2 text-[13.5px] font-semibold leading-snug text-ink group-hover:underline">{note.title}</p>
              <p className="mt-0.5 text-[11.5px] text-dim">
                {note.author || "Aquifert Desk"} · {formatDay(note.publishedAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { user, admin, modules } = await getHubAccess();
  const [content, prefs] = await Promise.all([getHubContent(), getPrefs(user)]);
  const now = deskNow();

  const readable = publishedTelex(content.telex, admin ? "all" : user.plan).filter((item) => item.readable);
  const saved = TELEX_PRODUCTS.filter((item) => prefs.telexProducts.includes(item));
  const selected = parseProducts(first(params.p), saved);
  const shown = selected.length ? readable.filter((item) => selected.includes(item.product)) : readable;
  const lead = shown.slice(0, LEAD_COUNT);
  const wire: WireRow[] = shown.slice(LEAD_COUNT).map(({ id, headline, excerpt, tags, product, access, readable: canRead, publishedAt, updatedAt, thumb, pick }) => ({
    id,
    headline,
    excerpt,
    tags,
    product,
    access,
    readable: canRead,
    publishedAt,
    updatedAt,
    thumb,
    pick,
  }));

  const notes = publishedAnalysis(modules);
  const brief: BriefRow[] = [
    ...readable.slice(0, 3).map((item) => ({ id: `t-${item.id}`, headline: item.headline, product: item.product, tone: item.tone, source: "Telex", href: `/hub/telex/${item.id}`, thumb: item.thumb, pick: item.pick })),
    ...notes.slice(0, 2).map((note, index) => ({
      id: `a-${note.id}`,
      headline: note.title,
      product: noteProduct(note),
      tone: toneOf(`${note.title} ${plainText(note.body)}`),
      source: "AQ View",
      href: `/hub/analysis/${note.slug}`,
      pick: index,
    })),
  ];
  const hedgeReports = sortHedge(content.hedgeReports).filter((item) => item.status === "published");
  const briefLatest = [readable[0]?.publishedAt, notes[0]?.publishedAt].filter((stamp): stamp is string => Boolean(stamp)).sort().at(-1);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 pb-2">
      <TelexWire
        items={wire}
        total={shown.length}
        latest={readable[0]?.publishedAt}
        now={now}
        filters={readable.length ? <HomeTelexFilter selected={selected} saved={saved} /> : null}
      />

      <TelexLead items={lead} />

      <HomeHero name={user.name} variant="hub" />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        <AqViewCard notes={notes.slice(0, 5)} />
        {hedgeReports.length ? (
          <PaperForwardBrief reports={hedgeReports} />
        ) : (
          <section className="aq-card p-5">
            <h2 className="text-[16.5px] font-semibold text-ink">Direct Hedge</h2>
            <p className="mt-1 text-[14px] text-mid">The desk has not published a paper forward curve yet.</p>
          </section>
        )}
        <AquibotBriefing rows={brief} persona={prefs.persona} variant="hub" latest={briefLatest} now={now} />
      </div>
    </div>
  );
}
