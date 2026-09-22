import { useEffect, useRef, useState, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

export function StatCard({
  title,
  value,
  format = (n: number) => Math.round(n).toLocaleString(),
  icon,
  trend,
  trendUp,
  hint,
  accent = "navy",
}: {
  title: string;
  value: number;
  format?: (n: number) => string;
  icon?: ReactNode;
  trend?: string;
  trendUp?: boolean;
  hint?: string;
  accent?: "navy" | "teal" | "green" | "amber";
}) {
  const animated = useCountUp(value);
  const accents: Record<string, string> = {
    navy: "bg-gradient-to-br from-navy-400 to-navy-700 text-white aqf-chip-3d",
    teal: "bg-gradient-to-br from-teal-300 to-teal-600 text-white aqf-chip-3d",
    green: "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white aqf-chip-3d",
    amber: "bg-gradient-to-br from-amber-400 to-amber-600 text-white aqf-chip-3d",
  };
  return (
    <Card className="aqf-card-hover overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
            <p className="mt-1.5 text-2xl font-bold font-data tabular-nums text-foreground">
              {format(animated)}
            </p>
            {(trend || hint) && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                {trend && (
                  <span className={`inline-flex items-center gap-0.5 font-medium ${trendUp ? "text-emerald-600" : "text-red-500"}`}>
                    {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {trend}
                  </span>
                )}
                {hint && <span className="text-muted-foreground truncate">{hint}</span>}
              </div>
            )}
          </div>
          {icon && <div className={`rounded-xl p-2.5 shrink-0 ${accents[accent]}`}>{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
