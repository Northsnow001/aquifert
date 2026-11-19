export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function KpiCard({
  label,
  value,
  hint,
  dark,
}: {
  label: string;
  value: string;
  hint?: string;
  dark?: boolean;
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3.5 ${dark ? "border-[#123] bg-[#10263b] text-white" : "border-border bg-white"}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${dark ? "text-white/60" : "text-dim"}`}>{label}</p>
      <p className="mt-1 text-[22px] font-semibold tracking-[-0.03em]">{value}</p>
      {hint ? <p className={`mt-1 text-[12px] ${dark ? "text-white/70" : "text-mid"}`}>{hint}</p> : null}
    </div>
  );
}

export function BarList({ rows, unit = "MT" }: { rows: { key: string; qty: number; count: number }[]; unit?: string }) {
  const max = Math.max(...rows.map((row) => row.qty), 1);
  if (!rows.length) return <p className="px-5 py-6 text-[13px] text-mid">Not enough observations (n ≥ 3) to show this aggregate.</p>;
  return (
    <ul className="space-y-2 px-5 py-4">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="mb-1 flex justify-between text-[12.5px]">
            <span className="font-medium text-ink">{row.key}</span>
            <span className="font-mono text-mid">
              {Math.round(row.qty).toLocaleString("en-GB")} {unit} · {row.count}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-s2">
            <div className="h-full rounded-full bg-blue" style={{ width: `${(row.qty / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export const PACE_FILL: Record<string, string> = {
  ahead: "#1f9d60",
  on: "#c98712",
  behind: "#d14b3f",
  gap: "#94a3b8",
};
