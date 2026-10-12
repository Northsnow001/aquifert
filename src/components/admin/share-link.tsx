"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Link2, Share2 } from "lucide-react";
import { linkedInShare, shareUrl, type ShareKind } from "@/lib/share-links";

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Copy the share link", text);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return { copied, copy };
}

/** The public link for a published post, with copy and LinkedIn buttons. */
export function ShareLinkPanel({ kind, shareKey, published }: { kind: ShareKind; shareKey: string; published: boolean }) {
  const url = shareUrl(kind, shareKey);
  const { copied, copy } = useCopy(url);

  if (!published) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-xl border border-dashed border-border bg-s2/40 px-4 py-3 text-[13px] text-mid">
        <Link2 className="h-4 w-4 shrink-0 text-dim" aria-hidden />
        Publish this to get a share link for LinkedIn, X or Instagram.
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-[#2e6da4]/25 bg-[#f3f8fd] px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink">
          <Share2 className="h-4 w-4 text-blue" aria-hidden /> Share link
        </span>
        <input
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          aria-label="Share link"
          className="h-9 min-w-0 flex-1 basis-64 rounded-lg border border-border bg-white px-3 font-mono text-[12.5px] text-ink"
        />
        <div className="flex gap-1.5">
          <button type="button" onClick={copy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue px-3 text-[13px] font-semibold text-white hover:brightness-110">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
          <a
            href={linkedInShare(url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center rounded-lg border border-border bg-white px-3 text-[13px] font-semibold text-ink no-underline hover:bg-s2"
          >
            LinkedIn
          </a>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open the public page in a private window to see what visitors see"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-[13px] font-semibold text-ink no-underline hover:bg-s2"
          >
            <ExternalLink className="h-4 w-4" /> Preview
          </a>
        </div>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-mid">
        Anyone with the link sees the picture and the title. Reading the post needs a free account, and new members land on it straight after signing up.
      </p>
    </div>
  );
}

/** One-click copy for list rows. */
export function CopyShareLink({ kind, shareKey, className = "" }: { kind: ShareKind; shareKey: string; className?: string }) {
  const { copied, copy } = useCopy(shareUrl(kind, shareKey));
  return (
    <button type="button" onClick={copy} className={className} title={copied ? "Share link copied" : "Copy share link"} aria-label="Copy share link">
      {copied ? <Check className="h-3.5 w-3.5 text-[#178a4c]" /> : <Link2 className="h-3.5 w-3.5" />}
    </button>
  );
}
