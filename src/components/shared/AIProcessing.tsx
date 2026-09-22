import { Skeleton } from "@/components/ui/skeleton";
import { Brain } from "lucide-react";

/** Shimmer "AI thinking" state shown while the simulated model processes */
export function AIProcessing({ label = "AQUIFERT AI is processing…" }: { label?: string }) {
  return (
    <div className="space-y-3 rounded-xl border border-teal-500/30 bg-teal-50/50 dark:bg-teal-500/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-teal-700 dark:text-teal-300">
        <Brain className="h-4 w-4 animate-pulse" />
        {label}
      </div>
      <Skeleton className="h-3.5 w-11/12" />
      <Skeleton className="h-3.5 w-8/12" />
      <Skeleton className="h-3.5 w-9/12" />
    </div>
  );
}
