import type { MemberDoc } from "@/lib/buyer-trades/member";

export function DocActions({ doc }: { doc: MemberDoc }) {
  return (
    <div className="flex items-center gap-3">
      <a href={doc.href} target="_blank" rel="noreferrer" className="text-[12.5px] font-semibold text-blue no-underline">
        View
      </a>
      <a href={`${doc.href}?download=1`} className="text-[12.5px] font-semibold text-ink no-underline">
        Download
      </a>
    </div>
  );
}
