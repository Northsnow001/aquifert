import { format, formatDistanceToNow } from "date-fns";

export const gbp = (n: number | null | undefined) =>
  `£${(n ?? 0).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

export const usd = (n: number | null | undefined) =>
  `$${(n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export const fmtDate = (d: Date | string | null | undefined) =>
  d ? format(new Date(d), "dd MMM yyyy") : "N/A";

export const fmtDateTime = (d: Date | string | null | undefined) =>
  d ? format(new Date(d), "dd MMM, HH:mm") : "N/A";

export const timeAgo = (d: Date | string | null | undefined) =>
  d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : "N/A";

export const tons = (n: number | null | undefined) =>
  `${(n ?? 0).toLocaleString("en-GB")}t`;

/** Consistent status → badge styling */
export const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  QUOTED: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  ACCEPTED: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  SHIPPED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  IN_TRANSIT: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  DELIVERED: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  DISPUTED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  DRAFT: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  SENT: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  EXPIRED: "bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400",
  PARTIAL: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  REFUNDED: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  REPAID: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  CANCELLED: "bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400",
  PROCESSED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  SPAM: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  CLARIFICATION: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  HELD: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  BOOKED: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  GATE_IN: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  LOADED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  DEPARTURE: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  ARRIVAL: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  CUSTOMS: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  CLEARED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  OUT_FOR_DELIVERY: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
};

export const statusLabel = (s: string) => s.replace(/_/g, " ");

export function confidenceStyle(c: number | null | undefined) {
  if (c == null) return "bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400";
  if (c > 85) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
  if (c >= 70) return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
  return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
}

export const SOURCE_META: Record<string, { label: string; color: string }> = {
  WHATSAPP: { label: "WhatsApp", color: "text-emerald-500" },
  WECHAT: { label: "WeChat", color: "text-green-600" },
  EMAIL: { label: "Email", color: "text-sky-500" },
  PORTAL: { label: "Portal", color: "text-teal-500" },
};

export const TIER_STYLES: Record<string, string> = {
  SPROUT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  HARVEST: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  SCALE: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
};
