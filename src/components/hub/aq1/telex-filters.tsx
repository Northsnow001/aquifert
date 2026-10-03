"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Check, Loader2, Save, Search, X } from "lucide-react";
import { toast } from "sonner";
import { saveTelexDefault } from "@/app/hub/prefs-actions";
import { btnSecondary } from "@/components/app/form";
import { TELEX_PRODUCTS, type TelexProduct } from "@/lib/aq-modules/types";

const ordered = (list: TelexProduct[]) => TELEX_PRODUCTS.filter((item) => list.includes(item));
const sameSet = (a: TelexProduct[], b: TelexProduct[]) => a.length === b.length && a.every((item) => b.includes(item));
const describe = (list: TelexProduct[]) => (list.length ? ordered(list).join(", ") : "every product");

const chipClass = (active: boolean) =>
  `inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1 text-[13.5px] font-semibold transition-colors ${
    active ? "border-teal-600 bg-teal-600 text-white shadow-sm" : "border-border bg-white text-mid hover:border-teal-500/60 hover:text-ink"
  }`;

/** Product chips, search and "save as my default" for the Telex feed. Filters live in the URL so the list renders on the server. */
export function TelexFilters({
  selected,
  query,
  saved,
  counts,
  matching,
  total,
}: {
  selected: TelexProduct[];
  query: string;
  saved: TelexProduct[];
  counts: Record<TelexProduct, number>;
  matching: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [saving, startSaving] = useTransition();
  const [chips, setChips] = useOptimistic(selected);
  const [text, setText] = useState(query);
  const [seenQuery, setSeenQuery] = useState(query);
  const [sentQuery, setSentQuery] = useState(query);
  const [savedDefault, setSavedDefault] = useState(saved);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (query !== seenQuery) {
    setSeenQuery(query);
    if (query !== sentQuery) {
      setText(query);
      setSentQuery(query);
    }
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const go = (nextChips: TelexProduct[], nextText: string) => {
    if (timer.current) clearTimeout(timer.current);
    const params = new URLSearchParams();
    params.set("p", nextChips.length ? ordered(nextChips).join(",") : "all");
    if (nextText.trim()) params.set("q", nextText.trim());
    setSentQuery(nextText.trim());
    startTransition(() => {
      setChips(nextChips);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const toggle = (product: TelexProduct) => go(chips.includes(product) ? chips.filter((item) => item !== product) : [...chips, product], text);

  const onType = (value: string) => {
    setText(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go(chips, value), 350);
  };

  const save = () => {
    const next = ordered(chips);
    startSaving(async () => {
      const result = await saveTelexDefault(next);
      if (result.ok) {
        setSavedDefault(next);
        toast.success(`Saved. The feed now opens on ${describe(next)}.`);
      } else toast.error(result.message);
    });
  };

  const isDefault = sameSet(chips, savedDefault);

  return (
    <section className="aq-card aq-rise p-4 sm:p-5" aria-label="Filter the Telex">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by product">
        <button type="button" aria-pressed={chips.length === 0} onClick={() => go([], text)} className={chipClass(chips.length === 0)}>
          All products
        </button>
        {TELEX_PRODUCTS.map((product) => {
          const active = chips.includes(product);
          return (
            <button key={product} type="button" aria-pressed={active} onClick={() => toggle(product)} className={chipClass(active)}>
              {product}
              <span className={`rounded-full px-1.5 text-[11.5px] tabular-nums ${active ? "bg-white/25 text-white" : "bg-s3 text-dim"}`} aria-hidden>
                {counts[product]}
              </span>
              <span className="sr-only">, {counts[product]} flashes</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          role="search"
          className="relative min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            go(chips, text);
          }}
        >
          <label htmlFor="telex-search" className="sr-only">
            Search the Telex
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" aria-hidden />
          <input
            id="telex-search"
            type="search"
            value={text}
            maxLength={120}
            onChange={(event) => onType(event.target.value)}
            placeholder="Search headlines, tags and text, e.g. India tender"
            className="block h-11 w-full rounded-xl border border-border bg-white pl-10 pr-10 text-[15.5px] text-ink shadow-[inset_0_1px_2px_rgb(16_38_59/0.04)] outline-none placeholder:text-dim hover:border-[#cdd7e1] [&::-webkit-search-cancel-button]:hidden"
          />
          {text ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setText("");
                go(chips, "");
              }}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-dim hover:bg-s3 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </form>
        <button type="button" onClick={save} disabled={saving || isDefault} className={`${btnSecondary} shrink-0`}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isDefault ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {isDefault ? "Your default" : "Save as my default"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[13.5px]">
        <p className="text-mid" aria-live="polite">
          {pending ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating the feed
            </span>
          ) : (
            <>
              <strong className="font-semibold text-ink tabular-nums">{matching}</strong> of <span className="tabular-nums">{total}</span> flashes match
            </>
          )}
        </p>
        {!isDefault ? (
          <p className="text-dim">
            Your saved default is {describe(savedDefault)}.{" "}
            <button type="button" onClick={() => go(savedDefault, text)} className="font-semibold text-blue hover:underline">
              Use my default
            </button>
          </p>
        ) : (
          <p className="text-dim">The feed opens on this view every time you visit.</p>
        )}
      </div>
    </section>
  );
}
