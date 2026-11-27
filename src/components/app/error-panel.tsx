"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { btnPrimary, btnSecondary } from "@/components/app/form";

/**
 * Shown in place of a page that failed to load. Most failures are brief (a slow database read or a
 * request that ran out of time), so trying again usually works; the reference matches the server log.
 */
export function ErrorPanel({ error, retry, compact = false }: { error: Error & { digest?: string }; retry: () => void; compact?: boolean }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={`mx-auto flex max-w-lg flex-col items-center text-center ${compact ? "py-12" : "min-h-[60vh] justify-center px-5 py-16"}`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff6e5] text-[#9a5b00]">
        <TriangleAlert className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-[20px] font-bold tracking-tight text-ink">This page didn&apos;t finish loading</h1>
      <p className="mt-2 text-[14.5px] leading-relaxed text-mid">
        The records took too long to come back, so the page stopped. That wait is what makes the screen feel stuck. Go back to the list, wait a few seconds, and open the record once. If it fails again, wait a minute before trying.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => retry()} className={btnPrimary}>
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
        <button type="button" onClick={() => window.history.back()} className={btnSecondary}>
          Go back
        </button>
      </div>
      {error.digest ? <p className="mt-5 font-mono text-[12px] text-dim">If you tell the desk, quote {error.digest}</p> : null}
    </div>
  );
}
