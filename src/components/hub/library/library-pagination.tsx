import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { libraryHref, type LibraryFilters } from "./model";

const step =
  "inline-flex h-11 items-center gap-1 rounded-full border border-border bg-white px-4 text-[13px] font-semibold text-ink no-underline transition hover:border-blue/35 hover:text-blue sm:h-10";
const off = "inline-flex h-11 items-center gap-1 rounded-full border border-border bg-s2 px-4 text-[13px] font-semibold text-dim sm:h-10";

function pageList(page: number, pages: number) {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

export function LibraryPagination({ filters, page, pages }: { filters: LibraryFilters; page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (n: number) => libraryHref({ ...filters, page: n });
  return (
    <nav aria-label="Library pages" className="mt-2 flex items-center justify-between gap-2 sm:justify-center">
      {page > 1 ? (
        <Link href={href(page - 1)} className={step} rel="prev">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Previous
        </Link>
      ) : (
        <span className={off} aria-disabled="true">
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Previous
        </span>
      )}

      <p className="text-[13px] text-mid sm:hidden">
        Page {page} of {pages}
      </p>
      <ol className="hidden items-center gap-1.5 sm:flex">
        {pageList(page, pages).map((n, i) =>
          n === "gap" ? (
            <li key={`gap-${i}`} className="px-1 text-[13px] text-dim" aria-hidden>
              …
            </li>
          ) : (
            <li key={n}>
              <Link
                href={href(n)}
                aria-label={`Page ${n}`}
                aria-current={n === page ? "page" : undefined}
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-[13px] font-semibold no-underline transition ${
                  n === page ? "bg-blue text-white" : "border border-border bg-white text-ink hover:border-blue/35 hover:text-blue"
                }`}
              >
                {n}
              </Link>
            </li>
          ),
        )}
      </ol>

      {page < pages ? (
        <Link href={href(page + 1)} className={step} rel="next">
          Next
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span className={off} aria-disabled="true">
          Next
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}
