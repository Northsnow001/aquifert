import type { CalcLog } from "@/lib/freight-desk/types";

export type LogFilters = { q: string; plan: string; month: string };

export function readLogFilters(params: Record<string, string | undefined>): LogFilters {
  return {
    q: (params.q ?? "").trim().slice(0, 120),
    plan: ["core", "growth", "enterprise", "admin"].includes(params.plan ?? "") ? params.plan! : "",
    month: /^\d{4}-\d{2}$/.test(params.month ?? "") ? params.month! : "",
  };
}

export function filterLogs(logs: CalcLog[], filters: LogFilters) {
  const needle = filters.q.toLowerCase();
  return logs.filter((log) => {
    if (filters.month && !log.at.startsWith(filters.month)) return false;
    if (filters.plan === "admin" ? !log.user.admin : filters.plan && (log.user.admin || log.user.plan !== filters.plan)) return false;
    if (!needle) return true;
    return [log.user.name, log.user.email, log.load.name, log.load.code, log.discharge.name, log.discharge.code].some((value) => value.toLowerCase().includes(needle));
  });
}

const cell = (value: unknown) => {
  const raw = String(value ?? "");
  const text = /^[=+\-@\t\r]/.test(raw) && !/^-?\d+(\.\d+)?$/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function logsToCsv(logs: CalcLog[]) {
  const header = [
    "Date (UTC)", "Member", "Email", "Plan", "Load port", "Load code", "Discharge port", "Discharge code", "Cargo (MT)", "Cargo type", "Market",
    "VLSFO ($/MT)", "Distance (nm)", "Days", "Vessel", "Route", "BDI", "Algorithm rate ($/MT)", "Final rate ($/MT)", "Benchmark tier",
    "Band low", "Band high", "Band median", "Verification",
  ];
  const rows = logs.map((log) => [
    log.at.replace("T", " ").slice(0, 19),
    log.user.name,
    log.user.email,
    log.user.admin ? "admin" : log.user.plan,
    log.load.name,
    log.load.code,
    log.discharge.name,
    log.discharge.code,
    log.input.cargoMt,
    log.input.cargoType,
    log.input.market,
    log.input.bunkerPrice,
    log.output.nauticalMiles,
    log.output.totalDays.toFixed(1),
    log.output.vessel,
    log.output.routeType,
    log.output.bdi,
    log.output.algorithmRate.toFixed(2),
    log.output.quotedRate.toFixed(2),
    log.output.band?.matchType ?? "",
    log.output.band?.rateMin ?? "",
    log.output.band?.rateMax ?? "",
    log.output.band?.rateMedian ?? "",
    log.output.band ? (log.output.inRange ? "in range" : "outside band") : "no fixtures",
  ]);
  return [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}
