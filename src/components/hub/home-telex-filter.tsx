"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { Check, Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { saveTelexDefault } from "@/app/hub/prefs-actions";
import { TELEX_PRODUCTS, type TelexProduct } from "@/lib/aq-modules/types";

const ordered = (list: TelexProduct[]) => TELEX_PRODUCTS.filter((item) => list.includes(item));
const sameSet = (a: TelexProduct[], b: TelexProduct[]) => a.length === b.length && a.every((item) => b.includes(item));

/** Product chips for the hub's TELEX boxes and list. Shares the saved default with the TELEX page. */
export function HomeTelexFilter({ selected, saved }: { selected: TelexProduct[]; saved: TelexProduct[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, startSaving] = useTransition();
  const [chips, setChips] = useOptimistic(selected);
  const [savedDefault, setSavedDefault] = useState(saved);

  const go = (next: TelexProduct[]) =>
    startTransition(() => {
      setChips(next);
      router.replace(`/hub?p=${next.length ? ordered(next).join(",") : "all"}`, { scroll: false });
    });

  const save = () =>
    startSaving(async () => {
      const result = await saveTelexDefault(ordered(chips));
      if (result.ok) {
        setSavedDefault(ordered(chips));
        toast.success("Saved. TELEX now opens on this filter.");
      } else toast.error(result.message);
    });

  const isDefault = sameSet(chips, savedDefault);

  return (
    <div className="rounded-lg border border-border bg-s2/60 p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2" role="group" aria-label="Filter TELEX by product">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-dim">Filter</span>
        <div className="flex flex-wrap gap-1.5">
          {TELEX_PRODUCTS.map((product) => {
            const active = chips.includes(product);
            return (
              <button
                key={product}
                type="button"
                aria-pressed={active}
                onClick={() => go(active ? chips.filter((item) => item !== product) : [...chips, product])}
                className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                  active ? "border-navy-700 bg-navy-700 text-white" : "border-border bg-white text-mid hover:border-navy-400 hover:text-ink"
                }`}
              >
                {product}
              </button>
            );
          })}
        </div>
        {chips.length ? (
          <button type="button" onClick={() => go([])} className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-mid hover:bg-white hover:text-ink">
            <RotateCcw className="h-3 w-3" /> Show everything
          </button>
        ) : null}
        <button
          type="button"
          onClick={save}
          disabled={saving || isDefault}
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-white px-2.5 text-[12px] font-semibold text-ink transition hover:border-blue/40 disabled:cursor-default disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : isDefault ? <Check className="h-3 w-3" /> : <Save className="h-3 w-3" />}
          {isDefault ? "Your default" : "Save as my default"}
        </button>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-dim" aria-label="Updating" /> : null}
      </div>
    </div>
  );
}
