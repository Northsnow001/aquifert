import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { GaugeCard, type Indicator } from "@/components/hub/GaugeCard";
import { TelexFeed, PRODUCT_LABEL, REGION_LABEL } from "@/components/hub/TelexFeed";
import { NewsFeed } from "@/components/hub/NewsFeed";
import { AquibotBrief } from "@/components/hub/AquibotBrief";
import { PriceBoard } from "@/components/hub/PriceBoard";
import { FreightPanel, CommentaryPanel } from "@/components/hub/SidePanels";
import { PanelSkeleton } from "@/components/hub/FreshnessBadge";
import { EngagementPrompt } from "@/components/hub/EngagementPrompt";

function Chip({
  active, label, onToggle,
}: { active: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
        active
          ? "border-navy-700 bg-navy-700 text-white dark:border-navy-300 dark:bg-navy-300 dark:text-navy-900"
          : "border-border bg-background text-muted-foreground hover:border-navy-400 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export default function Hub() {
  const [products, setProducts] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [personalised, setPersonalised] = useState(false);
  const [init, setInit] = useState(false);

  const prefs = trpc.hub.prefs.useQuery();
  const hints = trpc.hub.interestHints.useQuery();
  const taxonomies = trpc.hub.taxonomies.useQuery();
  const indicators = trpc.hub.indicators.useQuery();
  const savePrefs = trpc.hub.savePrefs.useMutation({
    onSuccess: () => { prefs.refetch(); toast.success("Default filters saved to your account"); },
    onError: (e) => toast.error(e.message),
  });

  // First-load personalisation: saved prefs win; else B4 lead interests.
  useEffect(() => {
    if (init || !prefs.isSuccess || !hints.isSuccess) return;
    if (prefs.data) {
      setProducts(prefs.data.products);
      setRegions(prefs.data.regions);
    } else if (hints.data) {
      setProducts(hints.data.products);
      setRegions(hints.data.regions);
      if (hints.data.products.length || hints.data.regions.length) setPersonalised(true);
    }
    setInit(true);
  }, [init, prefs.isSuccess, prefs.data, hints.isSuccess, hints.data]);

  const filtered = products.length > 0 || regions.length > 0;
  const clear = () => { setProducts([]); setRegions([]); setPersonalised(false); };
  const toggle = (list: string[], v: string, set: (x: string[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const productChips = useMemo(() => taxonomies.data?.products ?? [], [taxonomies.data]);
  const regionChips = useMemo(() => taxonomies.data?.regions ?? [], [taxonomies.data]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Aquifert ONE Hub</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Market indicators, desk intelligence, news and prices, in one view.
          </p>
        </div>
      </div>

      {/* TOP STRIP, market indicator gauges */}
      <section aria-label="Market indicators">
        {indicators.isLoading && (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4"><PanelSkeleton rows={4} /></div>
            ))}
          </div>
        )}
        {indicators.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            Market indicators failed to load.{" "}
            <button type="button" onClick={() => indicators.refetch()} className="font-semibold underline">Retry</button>
          </div>
        )}
        {indicators.isSuccess && (
          <div className="grid gap-4 md:grid-cols-3">
            {(indicators.data as Indicator[]).map((ind) => <GaugeCard key={ind.id} ind={ind} />)}
          </div>
        )}
      </section>

      {/* Filter bar */}
      <section aria-label="Feed filters" className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Filter</span>
          <div className="flex flex-wrap gap-1.5">
            {productChips.map((p) => (
              <Chip key={p} active={products.includes(p)} label={PRODUCT_LABEL[p] ?? p}
                onToggle={() => toggle(products, p, setProducts)} />
            ))}
          </div>
          <span className="hidden h-4 w-px bg-border sm:block" aria-hidden="true" />
          <div className="flex flex-wrap gap-1.5">
            {regionChips.map((r) => (
              <Chip key={r} active={regions.includes(r)} label={REGION_LABEL[r] ?? r}
                onToggle={() => toggle(regions, r, setRegions)} />
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {personalised && filtered && (
            <span className="text-[11px] font-medium text-teal-700 dark:text-teal-400">
              Pre-filtered from your stated interests.
            </span>
          )}
          {filtered && (
            <Button variant="ghost" size="sm" onClick={clear} className="h-7 gap-1 text-[12px]">
              <RotateCcw className="h-3 w-3" aria-hidden="true" /> Show everything
            </Button>
          )}
          <Button
            variant="outline" size="sm" className="h-7 gap-1 text-[12px]"
            disabled={savePrefs.isPending}
            onClick={() => savePrefs.mutate({ products, regions })}
          >
            <Save className="h-3 w-3" aria-hidden="true" /> Save as my default
          </Button>
        </div>
      </section>

      {/* Main grid: 60% TELEX / 40% stacked panels */}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <TelexFeed products={products} regions={regions} onClearFilters={clear} />
        </div>
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <AquibotBrief />
          <NewsFeed products={products} regions={regions} onClearFilters={clear} />
          <PriceBoard />
          <FreightPanel />
          <CommentaryPanel />
        </div>
      </div>
      <EngagementPrompt />
    </div>
  );
}
