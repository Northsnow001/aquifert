"use client";

import * as Flags from "country-flag-icons/react/3x2";
import { countryCode } from "@/lib/flags";

const icons = Flags as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>;

export function FlagMark({ country, className = "" }: { country: string; className?: string }) {
  const code = countryCode(country);
  const Icon = code ? icons[code] : undefined;
  if (!Icon) return null;
  return <Icon className={`block rounded-[2px] shadow-[0_0_0_1px_rgba(26,58,92,0.15)] ${className}`} aria-hidden />;
}
