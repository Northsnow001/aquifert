import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomeHero } from "@/components/hub/home-hero";
import { HomeTelex } from "@/components/hub/home-telex";
import { FeedThumb } from "@/components/hub/kit";
import { PaperForwardBrief } from "@/components/hub/paper-forward";
import { getHubAccess } from "@/lib/aq-modules/access";
import { getPrefs } from "@/lib/aq-modules/members";
import { publishedAnalysis } from "@/lib/aq-modules/store";
import { publishedTelex } from "@/lib/aq-modules/telex";
import { productOf, TELEX_PRODUCTS, type AnalysisNote } from "@/lib/aq-modules/types";
import { deskNow, formatDay } from "@/lib/content-types";
import { getHubContent, sortHedge } from "@/lib/hub-content";

export const dynamic = "force-dynamic";

/** AQ View and TELEX sit side by side; TELEX drops to four rows when AQ View is short, so the columns stay close in height. */
const FEED_COUNT = 5;
const TELEX_MIN = 4;

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

export default async function HomePage() {
  const { user, admin, modules } = await getHubAccess();
  const [content, prefs] = await Promise.all([getHubContent(), getPrefs(user)]);

  const readable = publishedTelex(content.telex, admin ? "all" : user.plan).filter((item) => item.readable);
  const saved = TELEX_PRODUCTS.filter((item) => prefs.telexProducts.includes(item));
  const shown = saved.length ? readable.filter((item) => saved.includes(item.product)) : readable;

  const notes = publishedAnalysis(modules).slice(0, FEED_COUNT);
  const telexCount = notes.length >= FEED_COUNT ? FEED_COUNT : TELEX_MIN;
  const hedgeReports = sortHedge(content.hedgeReports).filter((item) => item.status === "published");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 pb-2">
      <HomeHero name={user.name} variant="hub" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AqViewCard notes={notes} />
        <HomeTelex items={shown.slice(0, telexCount)} latest={readable[0]?.publishedAt} now={deskNow()} filter={saved} />
      </div>

      {hedgeReports.length ? (
        <PaperForwardBrief reports={hedgeReports} />
      ) : (
        <section className="aq-card p-5">
          <h2 className="text-[16.5px] font-semibold text-ink">Direct Hedge</h2>
          <p className="mt-1 text-[14px] text-mid">The desk has not published a paper forward curve yet.</p>
        </section>
      )}
    </div>
  );
}
