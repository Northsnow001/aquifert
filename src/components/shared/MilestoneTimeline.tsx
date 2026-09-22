import { Check } from "lucide-react";
import { fmtDateTime } from "@/lib/format";

export type Milestone = {
  key: string;
  label: string;
  done: boolean;
  current: boolean;
  timestamp?: string | null;
  location?: string;
};

export function MilestoneTimeline({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className="aqf-scroll overflow-x-auto pb-2">
      <div className="flex min-w-[720px] items-start">
        {milestones.map((m, i) => (
          <div key={m.key} className="relative flex-1">
            {i > 0 && (
              <div
                className={`absolute left-[-50%] right-[50%] top-[13px] h-0.5 ${
                  m.done ? "bg-emerald-500" : "bg-border"
                }`}
              />
            )}
            <div className="relative z-10 flex flex-col items-center text-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold ${
                  m.current
                    ? "border-blue-500 bg-blue-500 text-white aqf-pulse-dot"
                    : m.done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-border bg-card text-muted-foreground"
                }`}
              >
                {m.done && !m.current ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <p className={`mt-2 text-[10px] font-semibold leading-tight ${m.done ? "text-foreground" : "text-muted-foreground"}`}>
                {m.label}
              </p>
              {m.timestamp && (
                <p className="mt-0.5 text-[9px] text-muted-foreground">{fmtDateTime(m.timestamp)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
