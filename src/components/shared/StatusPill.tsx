import { STATUS_STYLES, TIER_STYLES, confidenceStyle, statusLabel } from "@/lib/format";
import { Leaf, Sprout, Rocket } from "lucide-react";

export function StatusPill({ status, className = "" }: { status: string; className?: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT;
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${style} ${className}`}>
      {statusLabel(status)}
    </span>
  );
}

export function ConfidenceBadge({ score }: { score: number | null | undefined }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold font-data ${confidenceStyle(score)}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      AI {score ?? "N/A"}%
    </span>
  );
}

export function MembershipBadge({ tier }: { tier?: string | null }) {
  if (!tier) return null;
  const Icon = tier === "SPROUT" ? Sprout : tier === "HARVEST" ? Leaf : Rocket;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TIER_STYLES[tier] ?? TIER_STYLES.SPROUT}`}>
      <Icon className="h-3 w-3" />
      {tier.charAt(0) + tier.slice(1).toLowerCase()} member
    </span>
  );
}
