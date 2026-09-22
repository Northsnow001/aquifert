import { useEffect, useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { TelexFeed } from "@/components/hub/TelexFeed";
import { PageHeader } from "@/components/shared/PageHeader";
import { InfoTip } from "@/components/aq1/InfoTip";
import { useAq1Tips } from "@/components/aq1/tips";

function Chip({ active, label, onToggle }: { active: boolean; label: string; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={active}
      className={`min-h-11 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${active
        ? "border-navy-700 bg-navy-700 text-white dark:border-navy-300 dark:bg-navy-300 dark:text-navy-900"
        : "border-border bg-background text-muted-foreground hover:border-navy-400 hover:text-foreground"}`}>
      {label}
    </button>
  );
}

/** AQ1 landing view — the existing TELEX engine with saved default filters. */
export default function Aq1Telex() {
  const tips = useAq1Tips();
  const [products, setProducts] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [init, setInit] = useState(false);
  const prefs = trpc.hub.prefs.useQuery();
  const taxonomies = trpc.hub.taxonomies.useQuery();
  const savePrefs = trpc.hub.savePrefs.useMutation({
    onSuccess: () => { prefs.refetch(); toast.success("Saved as your default TELEX filter"); },
    onError: (e) => toast.error(e.message),
  });
  useEffect(() => {
    if (init || !prefs.isSuccess) return;
    if (prefs.data) { setProducts(prefs.data.products); setRegions(prefs.data.regions); }
    setInit(true);
  }, [init, prefs.isSuccess, prefs.data]);
  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
      <PageHeader
        title={<span className="inline-flex items-center">Market TELEX Feed <InfoTip label="Market TELEX Feed" text={tips.telex} /></span>}
        description="Desk-issued market intelligence, newest first. Prices and assessments are indicative; Aquifert does not provide investment advice."
      />
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by product">
          {(taxonomies.data?.products ?? []).map((p) => (
            <Chip key={p} active={products.includes(p)} label={p.replace("_", " ")} onToggle={() => toggle(products, setProducts, p)} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by region">
          {(taxonomies.data?.regions ?? []).map((r) => (
            <Chip key={r} active={regions.includes(r)} label={r.replaceAll("_", " ")} onToggle={() => toggle(regions, setRegions, r)} />
          ))}
          <Button size="sm" variant="outline" className="ml-2" onClick={() => savePrefs.mutate({ products, regions })} disabled={savePrefs.isPending}>
            <Save className="mr-1 h-3.5 w-3.5" /> Save as my default
          </Button>
        </div>
      </div>
      <TelexFeed products={products} regions={regions} onClearFilters={() => { setProducts([]); setRegions([]); }} />
    </div>
  );
}
