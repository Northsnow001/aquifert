"use client";

import { Printer } from "lucide-react";
import { btnSecondary } from "@/components/app/form";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`${btnSecondary} h-10 px-4 text-[14.5px] print:hidden`}>
      <Printer className="h-4 w-4" aria-hidden /> {label}
    </button>
  );
}
