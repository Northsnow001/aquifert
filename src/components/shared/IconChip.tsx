import type { LucideIcon } from "lucide-react";

const TONES = {
  teal: "bg-teal-600 text-white",
  navy: "bg-navy-600 text-white",
  emerald: "bg-emerald-600 text-white",
} as const;

/**
 * Flat icon tile: solid brand colour, white glyph, soft cast shadow.
 */
export function IconChip({
  icon: Icon,
  tone = "teal",
  size = "md",
  className = "",
}: {
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box =
    size === "lg" ? "h-14 w-14 rounded-2xl" : size === "sm" ? "h-10 w-10 rounded-xl" : "h-12 w-12 rounded-2xl";
  const glyph = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span
      className={`aqf-chip-3d inline-flex shrink-0 items-center justify-center ${box} ${TONES[tone]} transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-105 ${className}`}
    >
      <Icon className={glyph} strokeWidth={2.1} />
    </span>
  );
}
