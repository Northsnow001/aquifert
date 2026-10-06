import { cookies } from "next/headers";
import { DeskConnect } from "@/components/hub/desk-connect";
import { FeedCardHeader, FeedGrid, FeedItem, tileSizes } from "@/components/hub/feed-card";
import { FeedViewFrame } from "@/components/hub/feed-view";
import { HomeHero } from "@/components/hub/home-hero";
import { HomeTelex } from "@/components/hub/home-telex";
import { FeedThumb, StoryImage } from "@/components/hub/kit";
import { PaperForwardBrief } from "@/components/hub/paper-forward";
import { getHubAccess } from "@/lib/aq-modules/access";
import { getPrefs } from "@/lib/aq-modules/members";
import { publishedAnalysis } from "@/lib/aq-modules/store";
import { publishedTelex } from "@/lib/aq-modules/telex";
import { productOf, TELEX_PRODUCTS, type AnalysisNote } from "@/lib/aq-modules/types";
import { deskNow, formatDay } from "@/lib/content-types";
import { feedViewCookie, parseFeedView, type FeedView } from "@/lib/feed-view";
import { getHubContent, sortHedge } from "@/lib/hub-content";

export const dynamic = "force-dynamic";

/** TELEX and AQ View sit side by side; TELEX drops to four rows when AQ View is short, so the columns stay close in height. */
const FEED_COUNT = 5;
const TELEX_MIN = 4;

const noteProduct = (note: AnalysisNote) => productOf(`${note.products.join(" ")} ${note.title}`);

/** AQ View on the hub: the newest Market Analysis notes the desk publishes in admin. */
function AqViewCard({ notes, view }: { notes: AnalysisNote[]; view: FeedView }) {
  const odd = notes.length % 2 === 1;
  return (
    <FeedViewFrame feed="analysis" initial={view} labelledBy="aq-view-title" className="aq-card flex min-w-0 flex-col overflow-hidden">
      <FeedCardHeader id="aq-view-title" title="AQ View" subtitle="Market Analysis" href="/hub/analysis" />
      <FeedGrid>
        {notes.length === 0 ? <p className="col-span-full py-4 text-center text-[13px] text-mid">No entries yet. The desk publishes most weekday mornings.</p> : null}
        {notes.map((note, index) => {
          const lead = odd && index === 0;
          return (
            <FeedItem
              key={note.id}
              href={`/hub/analysis/${note.slug}`}
              lead={lead}
              thumb={<FeedThumb product={noteProduct(note)} pick={index} size={56} className="rounded-lg" />}
              image={<StoryImage product={noteProduct(note)} pick={index} sizes={tileSizes(lead)} />}
              chips={
                note.products.length
                  ? note.products.slice(0, 3).map((product) => (
                      <span key={product} className="rounded-md bg-s2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mid">
                        {product}
                      </span>
                    ))
                  : null
              }
              title={note.title}
              meta={`${note.author || "Aquifert Desk"} · ${formatDay(note.publishedAt)}`}
            />
          );
        })}
      </FeedGrid>
    </FeedViewFrame>
  );
}

export default async function HomePage() {
  const { user, admin, modules } = await getHubAccess();
  const [content, prefs, jar] = await Promise.all([getHubContent(), getPrefs(user), cookies()]);

  const readable = publishedTelex(content.telex, admin ? "all" : user.plan).filter((item) => item.readable);
  const saved = TELEX_PRODUCTS.filter((item) => prefs.telexProducts.includes(item));
  const shown = saved.length ? readable.filter((item) => saved.includes(item.product)) : readable;

  const notes = publishedAnalysis(modules).slice(0, FEED_COUNT);
  const telexCount = notes.length >= FEED_COUNT ? FEED_COUNT : TELEX_MIN;
  const hedgeReports = sortHedge(content.hedgeReports).filter((item) => item.status === "published");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 pb-2">
      <HomeHero name={user.name} variant="hub" />
      <DeskConnect name={user.name} email={user.email} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <HomeTelex items={shown.slice(0, telexCount)} latest={readable[0]?.publishedAt} now={deskNow()} filter={saved} view={parseFeedView(jar.get(feedViewCookie("telex"))?.value)} />
        <AqViewCard notes={notes} view={parseFeedView(jar.get(feedViewCookie("analysis"))?.value)} />
      </div>

      {hedgeReports.length ? (
        <PaperForwardBrief reports={hedgeReports} />
      ) : (
        <section className="aq-card px-5 py-4">
          <h2 className="text-[19px] font-extrabold uppercase leading-none tracking-[0.12em] text-navy-800">Direct Hedge</h2>
          <p className="mt-2 text-[14px] text-mid">The desk has not published a paper forward curve yet.</p>
        </section>
      )}
    </div>
  );
}
