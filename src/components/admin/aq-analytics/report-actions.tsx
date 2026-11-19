"use client";

import { recordReportRunAction } from "@/app/admin/aq-analytics/actions";
import { btnSecondary } from "@/components/admin/ui";

export function DownloadReport({ market, period }: { market: string; period: string }) {
  return (
    <button
      type="button"
      className={btnSecondary}
      onClick={() => {
        void recordReportRunAction(market, period).then(() => window.print());
      }}
    >
      Download / print
    </button>
  );
}
