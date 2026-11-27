"use client";

import { Moon, Sun } from "lucide-react";
import type { Theme } from "@/lib/theme";

export function ThemeToggle({ theme, onChange, tone = "onDark" }: { theme: Theme; onChange: (theme: Theme) => void; tone?: "onDark" | "onLight" }) {
  const dark = theme === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  const look = tone === "onLight" ? "text-ink hover:bg-black/[.05]" : "text-white/85 hover:bg-white/10 hover:text-white";
  return (
    <button
      type="button"
      onClick={() => onChange(dark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${look}`}
    >
      {dark ? <Sun className="h-[18px] w-[18px]" aria-hidden /> : <Moon className="h-[18px] w-[18px]" aria-hidden />}
    </button>
  );
}
