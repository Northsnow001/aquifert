import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { InfoTip } from "@/components/aq1/InfoTip";
import { useAq1Tips } from "@/components/aq1/tips";
import { AQ1_MENU } from "@contracts/aq1";
import { Label } from "@/components/ui/label";

const GUIDE_SECTIONS: { id: string; title: string; body: string[] }[] = [
  {
    id: "telex", title: "Market TELEX Feed",
    body: [
      "The TELEX feed is a running log of market events written by the Aquifert desk: tenders being announced, prices moving, plants going down for maintenance, policy changes, and cargoes on the move. Newest items sit at the top and items are grouped by day.",
      "Each entry carries a product tag (like NITROGEN or PHOSPHATE) and a region tag. Use the chips above the feed to filter, and 'Save as my default' to make your filter stick between visits. The freshness badge tells you when the feed was last updated; if it drifts amber or red, the date shown is the last genuine update, not an implied 'now'.",
    ],
  },
  {
    id: "analysis", title: "AQ Market Analysis Feed",
    body: [
      "TELEX tells you what happened; the analysis feed tells you what it means. Each note is a short desk-written piece that links back to the TELEX items it interprets.",
    ],
  },
  {
    id: "signal", title: "AQ Signal",
    body: [
      "AQ Signal shows rolling price windows of 7, 30, 60 and 90 days. For each product you see the price at the start of the window, the price now, the change in absolute and percentage terms (arrow, sign and colour together — never colour alone), the high and low, and a sparkline of the whole window.",
      "Use 7 days when timing a purchase and 90 days to see the real trend through the noise. 'What drove it' lists the events inside the window with links to their sources. Where a product doesn't have enough data in a window, we say so rather than show a misleading zero.",
    ],
  },
  {
    id: "nitrogen", title: "Nitrogen Report Generator",
    body: [
      "Ask Aquibot for an on-demand report across the nitrogen complex: urea (granular and prilled), ammonia, AN, CAN, UAN and ammonium sulphate. Pick products, regions and a period, and add anything specific you want covered.",
      "Every figure in the report is checked against Aquifert's own price records before you see it; if any figure cannot be verified the report is held back and the desk is notified, rather than you seeing something we can't stand behind. Reports are saved to My Reports and are AI-drafted from Aquifert data, desk-reviewed — they are market information, not advice.",
    ],
  },
  {
    id: "library", title: "Market Report Library & Resources",
    body: [
      "Every weekly report and research note the desk has published. Reports marked 'free' open in full. Member and premium reports show their title, week, period, summary and a preview paragraph, with a lock badge — the body itself is never sent to your browser until your plan covers it.",
    ],
  },
  {
    id: "ureaCalc", title: "Urea Cost Calculator",
    body: [
      "The calculator answers two questions. Forward: given an FOB price at an origin, what does a tonne of urea actually cost delivered to farm, once freight, discharge, bagging, duty and finance are added? Backward (netback): given the price you're being offered on-farm, what FOB does that imply at origin?",
      "FOB means 'free on board' — the price loaded onto the ship at origin. Freight, discharge at the destination port, bagging, import duty and finance costs all stack on top; the full ladder is shown line by line. The origin ranking applies your logistics inputs to every origin's latest Aquifert FOB assessment so you can see which origin lands cheapest on the same assumptions. Confirm your currency before calculating — mixing currencies is the most common way these numbers go wrong.",
    ],
  },
  {
    id: "freight", title: "Freight Analytics (AQ Analytics)",
    body: [
      "AQ Analytics is the paid add-on covering trade flows by corridor, freight-rate benchmarks, lane history and seasonality, and corridor anomaly alerts. The teaser page shows what it covers; none of the live analytics data reaches your browser on the free plan.",
    ],
  },
  {
    id: "orderNow", title: "Order Fertilizer Now",
    body: [
      "Two steps. Step 1 captures what you need — product, quantity, ports of entry and destination (they are not always the same port), packing and delivery window — and saves it immediately, so the desk has a qualified brief even if you stop there. Step 2 unlocks ordering on the AQ0 plan through the existing checkout, carrying your requirement forward so nothing is re-typed.",
    ],
  },
  {
    id: "community", title: "Community Call",
    body: [
      "A free 45-minute call where the desk walks through the current market and takes questions. Register with your account details, add a calendar hold from the .ics file we email you, and cancel any time from the same page.",
    ],
  },
  {
    id: "limits", title: "Plans and limits",
    body: [
      "Reading is unlimited on the free plan — TELEX, the analysis feed, AQ Signal and the free Library reports. Generation and calculation are metered because each one costs real money to produce: the Plan & Usage page shows exactly what you've used, the limit, and when it resets. When you run out we say so plainly and show the upgrade path — you never get a bare error.",
    ],
  },
  {
    id: "contact", title: "Contact Us",
    body: [
      "Four ways to reach a person: WhatsApp the desk, book a call, send a message, or request a callback. We state response-time expectations honestly on the page.",
    ],
  },
];

export default function Aq1UserGuide({ onRestartTour }: { onRestartTour?: () => void }) {
  const tips = useAq1Tips();
  const [q, setQ] = useState("");
  const sections = useMemo(() => {
    if (!q.trim()) return GUIDE_SECTIONS;
    const needle = q.toLowerCase();
    return GUIDE_SECTIONS.filter((s) => s.title.toLowerCase().includes(needle) || s.body.some((b) => b.toLowerCase().includes(needle)));
  }, [q]);

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <PageHeader
        title={<span className="inline-flex items-center">User Guide <InfoTip label="User Guide" text={tips.userGuide} /></span>}
        description="Every part of Aquifert explained — including what the numbers mean, not just where the buttons are."
      />
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <aside className="md:sticky md:top-20 md:self-start">
          <Label htmlFor="guide-search" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Search the guide</Label>
          <Input id="guide-search" className="mt-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. FOB, quota, report…" />
          <nav aria-label="Guide contents" className="mt-4 space-y-1">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="block rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">{s.title}</a>
            ))}
          </nav>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => (onRestartTour ? onRestartTour() : window.dispatchEvent(new Event("aq1:restart-tour")))}>
            Take the tour again
          </Button>
        </aside>
        <div className="space-y-8">
          {sections.length === 0 && <p className="text-sm text-muted-foreground">Nothing matches “{q}”. Try a different term, or ask the desk via Contact Us.</p>}
          {sections.map((s) => (
            <section key={s.id} id={s.id} aria-label={s.title} className="scroll-mt-24">
              <h2 className="text-lg font-semibold">{s.title}</h2>
              {s.body.map((p, i) => <p key={i} className="mt-2 text-sm leading-relaxed text-muted-foreground">{p}</p>)}
            </section>
          ))}
        </div>
      </div>
      <p className="mt-8 text-xs text-muted-foreground">{AQ1_MENU.length} features covered.</p>
    </div>
  );
}
