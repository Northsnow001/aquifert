"use client";

import { createContext, useContext, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { feedViewCookie, type FeedName, type FeedView } from "@/lib/feed-view";

const ViewContext = createContext<{ view: FeedView; choose: (next: FeedView) => void } | null>(null);

/** Holds one hub card's list or tile choice; items style themselves from `data-view` on the `group/feed` wrapper. */
export function FeedViewFrame({ feed, initial, labelledBy, className = "", children }: { feed: FeedName; initial: FeedView; labelledBy: string; className?: string; children: React.ReactNode }) {
  const [view, setView] = useState(initial);
  const choose = (next: FeedView) => {
    setView(next);
    document.cookie = `${feedViewCookie(feed)}=${next}; path=/; max-age=31536000; samesite=lax`;
  };
  return (
    <ViewContext.Provider value={{ view, choose }}>
      <section aria-labelledby={labelledBy} data-view={view} className={`group/feed ${className}`}>
        {children}
      </section>
    </ViewContext.Provider>
  );
}

const OPTIONS = [
  { value: "list", label: "List view", Icon: List },
  { value: "grid", label: "Tile view", Icon: LayoutGrid },
] as const;

export function FeedViewToggle() {
  const context = useContext(ViewContext);
  if (!context) return null;
  return (
    <div role="group" aria-label="Layout" className="inline-flex shrink-0 rounded-lg border border-border bg-white p-0.5">
      {OPTIONS.map(({ value, label, Icon }) => {
        const on = context.view === value;
        return (
          <button
            key={value}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={on}
            onClick={() => context.choose(value)}
            className={`flex h-7 w-8 items-center justify-center rounded-md transition ${on ? "bg-navy-800 text-white shadow-sm" : "text-mid hover:bg-s2 hover:text-ink"}`}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
