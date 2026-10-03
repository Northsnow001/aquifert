"use client";

import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { saveSignalWindow } from "@/app/hub/prefs-actions";

/** 7/30/60/90-day switch. The choice goes in the URL and is saved as the member's default window. */
export function SignalWindow({ windows, value }: { windows: readonly number[]; value: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(value);

  const choose = (days: number) => {
    if (days === current) return;
    startTransition(async () => {
      setCurrent(days);
      router.replace(`${pathname}?w=${days}`, { scroll: false });
      const result = await saveSignalWindow(days);
      if (!result.ok) toast.error(result.message, { id: "signal-window" });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Signal window" className="inline-flex rounded-full border border-border bg-white p-1 shadow-[inset_0_1px_2px_rgb(16_38_59/0.04)]">
        {windows.map((days) => {
          const on = current === days;
          return (
            <button
              key={days}
              type="button"
              aria-pressed={on}
              onClick={() => choose(days)}
              className={`min-h-9 rounded-full px-3.5 text-[14.5px] font-semibold tabular-nums transition-colors sm:px-4 ${on ? "bg-navy-700 text-white shadow-sm" : "text-mid hover:text-ink"}`}
            >
              {days} days
            </button>
          );
        })}
      </div>
      <span className="inline-flex items-center gap-1.5 text-[13px] text-dim" aria-live="polite">
        {pending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Recalculating
          </>
        ) : (
          "Your choice is remembered for next time."
        )}
      </span>
    </div>
  );
}
