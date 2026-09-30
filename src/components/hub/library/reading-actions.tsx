"use client";

import { Download, ExternalLink, Link2, Printer } from "lucide-react";
import { toast } from "sonner";
import { btnPrimary, btnSecondary } from "@/components/app/form";

export function ReadingActions({ download, inline }: { download: string | null; inline: string | null }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <div className="mt-5 flex flex-wrap gap-2 print:hidden">
      {download ? (
        <a href={download} className={btnPrimary}>
          <Download className="h-4 w-4" aria-hidden />
          Download
        </a>
      ) : null}
      {inline ? (
        <a href={inline} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
          <ExternalLink className="h-4 w-4" aria-hidden />
          Open in new tab
          <span className="sr-only"> (opens a new tab)</span>
        </a>
      ) : null}
      <button type="button" onClick={() => window.print()} className={btnSecondary}>
        <Printer className="h-4 w-4" aria-hidden />
        Print
      </button>
      <button type="button" onClick={copy} className={btnSecondary}>
        <Link2 className="h-4 w-4" aria-hidden />
        Copy link
      </button>
    </div>
  );
}
