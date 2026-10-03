"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { ACCESS_OPTIONS, SORTS, libraryHref, type LibraryFilters, type LibrarySort } from "./model";
import type { TelexAccess } from "@/lib/content-types";

const control =
  "h-11 w-full rounded-xl border border-border bg-white px-3 text-[15px] text-ink outline-none hover:border-[#cdd7e1] sm:w-auto";

export function LibraryControls({
  filters,
  collections,
  years,
}: {
  filters: LibraryFilters;
  collections: { id: string; label: string }[];
  years: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useOptimistic(filters, (state, next: Partial<LibraryFilters>) => ({ ...state, ...next }));
  const [query, setQuery] = useState(filters.q);
  const [sent, setSent] = useState(filters.q);
  const [seen, setSeen] = useState(filters.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (filters.q !== seen) {
    setSeen(filters.q);
    if (filters.q !== sent) {
      setQuery(filters.q);
      setSent(filters.q);
    }
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const go = (next: Partial<LibraryFilters>, q: string, replace = false) => {
    if (timer.current) clearTimeout(timer.current);
    setSent(q);
    const href = libraryHref({ ...view, ...next, q, page: 1 });
    startTransition(() => {
      setView({ ...next, q });
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  };

  const onSearch = (value: string) => {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => go({}, value, true), 350);
  };

  return (
    <form
      role="search"
      aria-label="Library files"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        go({}, query);
      }}
      className="aq-rise flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <div className="relative min-w-0 sm:min-w-[16rem] sm:flex-1">
        <label htmlFor="library-search" className="sr-only">
          Search files
        </label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" aria-hidden />
        <input
          id="library-search"
          type="search"
          value={query}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search titles, summaries, collections…"
          autoComplete="off"
          className={`${control} pl-10 sm:w-full`}
        />
        {pending ? <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-dim" aria-label="Updating results" /> : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <label htmlFor="library-collection" className="sr-only">
          Filter by collection
        </label>
        <select
          id="library-collection"
          value={view.collection}
          onChange={(event) => go({ collection: event.target.value }, query)}
          className={`${control} col-span-2 sm:max-w-[15rem]`}
        >
          <option value="">All collections</option>
          {collections.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>

        <label htmlFor="library-year" className="sr-only">
          Filter by year
        </label>
        <select id="library-year" value={view.year} onChange={(event) => go({ year: event.target.value }, query)} className={control}>
          <option value="">Any year</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <label htmlFor="library-access" className="sr-only">
          Filter by access
        </label>
        <select
          id="library-access"
          value={view.access}
          onChange={(event) => go({ access: event.target.value as TelexAccess | "" }, query)}
          className={control}
        >
          <option value="">All access</option>
          {ACCESS_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <label htmlFor="library-sort" className="sr-only">
          Sort files
        </label>
        <select
          id="library-sort"
          value={view.sort}
          onChange={(event) => go({ sort: event.target.value as LibrarySort }, query)}
          className={`${control} col-span-2 sm:col-span-1`}
        >
          {SORTS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
