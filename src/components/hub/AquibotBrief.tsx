import { useMemo, useState } from "react";
import { Bot, ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { PanelHeader, PanelSkeleton, PanelError } from "./FreshnessBadge";
import { FeedThumb } from "./FeedThumb";
import { PRODUCT_LABEL } from "./TelexFeed";
import { useProfile } from "@/hooks/useProfile";

type Audience = "farmer" | "importer" | "buyer";

const AUDIENCES: { key: Audience; label: string }[] = [
  { key: "farmer", label: "Farmer / grower" },
  { key: "importer", label: "Importer" },
  { key: "buyer", label: "Buyer / trader" },
];

type Tone = "UP" | "DOWN" | "NEUTRAL";

const FIRM = /\b(up|firm|firms|firmer|firmed|higher|edge|edges|sold out|tight|tighter|premium|bullish|rally|tender|short|capped|commit)/i;
const SOFT = /\b(down|soft|softer|soften|softens|softened|lower|quiet|flat|ease|eased|eases|calm|rangebound|bearish|ample|wind down|winds down)/i;

function toneOf(text: string): Tone {
  if (SOFT.test(text)) return "DOWN";
  if (FIRM.test(text)) return "UP";
  return "NEUTRAL";
}

/** Plain-language "what this means for you", per audience. Deterministic, desk-style. */
function interpret(tone: Tone, productLabel: string, audience: Audience): string {
  const p = productLabel.toLowerCase();
  if (audience === "farmer") {
    if (tone === "UP") return `For your farm: ${p} costs are creeping up. If you will need it this season, covering your requirement sooner is likely cheaper than waiting.`;
    if (tone === "DOWN") return `For your farm: ${p} prices are easing. There is no rush — holding off could mean a better price when you are ready to buy.`;
    return `For your farm: ${p} is steady. No urgent action — plan around your normal application window.`;
  }
  if (audience === "importer") {
    if (tone === "UP") return `For your imports: ${p} looks firmer, so landed costs are likely to rise. Check coverage on nearby laycans before offers are revised.`;
    if (tone === "DOWN") return `For your imports: ${p} is softening. Import economics are improving — a window to cover forward at better levels may be opening.`;
    return `For your imports: ${p} is rangebound. Watch freight and origin spreads rather than chasing the flat market.`;
  }
  if (tone === "UP") return `For your book: expect firmer offers and shorter quote validity on ${p}. If a number works, move quickly.`;
  if (tone === "DOWN") return `For your book: ${p} is turning into a buyer's market. Negotiate, ask for validity, and compare origins.`;
  return `For your book: ${p} is balanced. Keep quotes short-dated and watch the next tender or contract signal.`;
}

function BriefRow({
  imageUrl, product, text, tone, audience, href, source,
}: {
  imageUrl?: string | null; product: string; text: string; tone: Tone; audience: Audience; href?: string; source: string;
}) {
  const productLabel = PRODUCT_LABEL[product] ?? product;
  const toneLabel = tone === "UP" ? "Firmer" : tone === "DOWN" ? "Softer" : "Steady";
  const toneCls = tone === "UP"
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
    : tone === "DOWN"
      ? "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300"
      : "bg-muted text-muted-foreground";
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${toneCls}`}>{toneLabel}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{source}</span>
      </div>
      <p className="mt-1 text-[13px] font-semibold leading-snug text-foreground">{text}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-navy-700 dark:text-navy-200">
        {interpret(tone, productLabel, audience)}
      </p>
    </>
  );
  return (
    <li className="flex items-start gap-3 py-3">
      <FeedThumb imageUrl={imageUrl} product={product} size={48} alt="" />
      <div className="min-w-0 flex-1">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="block">{body}</a>
        ) : body}
      </div>
    </li>
  );
}

/**
 * Aquibot briefing widget: reads the latest TELEX flashes and Global News
 * and restates them in plain language, tuned to how the reader works —
 * farmer, importer or buyer. Deterministic desk rules, no data leaves the app.
 */
export function AquibotBrief() {
  const { portalRole } = useProfile();
  const [audience, setAudience] = useState<Audience>("buyer");
  const effective = audience;

  const telex = trpc.hub.telex.useInfiniteQuery(
    { products: [], regions: [], limit: 4 },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  );
  const news = trpc.hub.news.useQuery({ products: [], regions: [], limit: 4 });

  const rows = useMemo(() => {
    const t = (telex.data?.pages.flatMap((p) => p.items) ?? []).slice(0, 3).map((it) => ({
      key: `t${it.id}`,
      imageUrl: it.imageUrl,
      product: it.product,
      text: it.title,
      tone: toneOf(`${it.title} ${it.body}`),
      source: "TELEX",
      href: undefined as string | undefined,
    }));
    const n = (news.data?.items ?? []).slice(0, 2).map((it) => ({
      key: `n${it.id}`,
      imageUrl: it.imageUrl,
      product: it.product,
      text: it.headline,
      tone: toneOf(`${it.headline} ${it.snippet ?? ""}`),
      source: it.sourceName ?? "News",
      href: it.url as string | undefined,
    }));
    return [...t, ...n];
  }, [telex.data, news.data]);

  const loading = telex.isLoading || news.isLoading;
  const failed = telex.isError && news.isError;

  return (
    <Card>
      <CardContent className="p-5">
        <PanelHeader
          title="Aquibot briefing"
          sub="Today's TELEX and news, translated into plain language"
          freshness={news.data?.freshness}
        />
        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Interpret updates for">
          <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <Bot className="h-3.5 w-3.5 text-teal-600" aria-hidden="true" /> I am a
          </span>
          {AUDIENCES.map((a) => (
            <button
              key={a.key}
              type="button"
              aria-pressed={effective === a.key}
              onClick={() => setAudience(a.key)}
              className={`min-h-8 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                effective === a.key
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-border bg-background text-muted-foreground hover:border-teal-500/60 hover:text-foreground"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {loading && <div className="mt-3"><PanelSkeleton rows={4} /></div>}
        {failed && <div className="mt-3"><PanelError label="Aquibot briefing" onRetry={() => { telex.refetch(); news.refetch(); }} /></div>}
        {!loading && !failed && rows.length > 0 && (
          <ul className="mt-1 divide-y divide-border">
            {rows.map((r) => (
              <BriefRow key={r.key} {...r} audience={effective} />
            ))}
          </ul>
        )}
        {!loading && !failed && rows.length === 0 && (
          <p className="mt-3 text-[13px] text-muted-foreground">
            No fresh flashes to interpret yet — the desk publishes through the trading day.
          </p>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Aquibot restates desk content in plain language. Indicative only, not advice.
          </p>
          <Link
            to="/aquibot"
            className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-teal-700 underline-offset-4 hover:underline dark:text-teal-300"
          >
            Ask Aquibot <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
