import { Crown, Lock } from "lucide-react";
import { FILE_ACCESS_LABEL, type TelexAccess } from "@/lib/content-types";

const STYLE: Record<TelexAccess, string> = {
  public: "bg-teal-100 text-teal-800",
  growth: "bg-navy-50 text-navy-700 ring-1 ring-navy-100",
  enterprise: "bg-[#fff4df] text-[#9a5b00] ring-1 ring-[#f5dfb3]",
};

export function AccessBadge({ access, className = "" }: { access: TelexAccess; className?: string }) {
  const Icon = access === "growth" ? Lock : access === "enterprise" ? Crown : null;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STYLE[access]} ${className}`}>
      {Icon ? <Icon className="h-3 w-3" aria-hidden /> : null}
      <span className="sr-only">Access: </span>
      {FILE_ACCESS_LABEL[access]}
    </span>
  );
}
