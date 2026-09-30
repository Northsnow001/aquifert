import type { NetbackLog } from "@/lib/netback-desk/types";

export type NetbackLogFilters = { q: string; plan: string; month: string; mode: string };

export function readNetbackFilters(params: Record<string, string | undefined>): NetbackLogFilters {
  return {
    q: (params.q ?? "").trim().slice(0, 120),
    plan: ["core", "growth", "enterprise", "admin"].includes(params.plan ?? "") ? params.plan! : "",
    month: /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : "",
    mode: ["netback", "forward"].includes(params.mode ?? "") ? params.mode! : "",
  };
}

export function filterNetbackLogs(logs: NetbackLog[], filters: NetbackLogFilters) {
  const needle = filters.q.toLowerCase();
  return logs.filter((log) => {
    if (filters.month && !log.at.startsWith(filters.month)) return false;
    if (filters.mode && log.mode !== filters.mode) return false;
    if (filters.plan === "admin" ? !log.user.admin : filters.plan && (log.user.admin || log.user.plan !== filters.plan)) return false;
    if (!needle) return true;
    return [log.user.name, log.user.email, log.destination.name, log.destination.code, log.destination.country, log.destination.region, log.output.best.label].some((value) =>
      value.toLowerCase().includes(needle),
    );
  });
}

export const MODE_LABEL = { netback: "On-farm to FOB", forward: "FOB to on-farm" } as const;

const cell = (value: unknown) => {
  const raw = String(value ?? "");
  const text = /^[=+\-@\t\r]/.test(raw) && !/^-?\d+(\.\d+)?$/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function netbackLogsToCsv(logs: NetbackLog[]) {
  const header = [
    "ID", "Date (UTC)", "Member", "Email", "Plan", "Mode", "Destination", "LOCODE", "Country", "Region", "Cargo (MT)", "Basis", "Packaging",
    "Currency", "FX", "Farm price (local)", "Farm price (USD)", "Inland (USD)", "Duty %", "AFRMM", "Benchmark week",
    "Best origin", "Best value (USD/MT)", "Margin vs FOB", "Status", "Freight (USD/MT)", "Distance (nm)", "Input JSON", "Output JSON",
  ];
  const rows = logs.map((log) => [
    log.id,
    log.at.replace("T", " ").slice(0, 19),
    log.user.name,
    log.user.email,
    log.user.admin ? "admin" : log.user.plan,
    MODE_LABEL[log.mode],
    log.destination.name,
    log.destination.code,
    log.destination.country,
    log.destination.region,
    log.input.cargoMt,
    log.input.basis,
    log.input.packaging,
    log.input.currency,
    log.input.fx,
    log.mode === "netback" ? log.input.farmLocal : "",
    log.mode === "netback" ? log.input.farmUsd.toFixed(2) : "",
    log.input.inlandUsd,
    log.input.dutyEnabled ? log.input.dutyPercent : 0,
    log.input.afrmm ? "yes" : "no",
    log.output.week,
    log.output.best.label,
    log.output.best.value.toFixed(2),
    log.output.best.margin ?? "",
    log.output.best.status ?? "",
    log.output.best.freightMt.toFixed(2),
    log.output.best.nauticalMiles,
    JSON.stringify(log.input),
    JSON.stringify(log.output),
  ]);
  return [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}
