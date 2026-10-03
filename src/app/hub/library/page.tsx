import type { Metadata } from "next";
import Link from "next/link";
import { X } from "lucide-react";
import { btnSecondary } from "@/components/app/form";
import { EmptyPanel, HubPageHeader } from "@/components/hub/kit";
import { LibraryCard } from "@/components/hub/library/library-card";
import { LibraryControls } from "@/components/hub/library/library-controls";
import { LibraryPagination } from "@/components/hub/library/library-pagination";
import { loadLibrary } from "@/components/hub/library/load";
import { PAGE_SIZE, isFiltered, libraryHref, matchFiles, readFilters, shelfTree, sortFiles } from "@/components/hub/library/model";

export const metadata: Metadata = { title: "Library" };
export const dynamic = "force-dynamic";

export default async function LibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [raw, { files, collections }] = await Promise.all([searchParams, loadLibrary()]);
  const tree = shelfTree(collections, files);
  const shelf = tree.map((row) => row.item);
  const years = [...new Set(files.map((file) => file.day.slice(0, 4)).filter((year) => /^\d{4}$/.test(year)))].sort().reverse();
  const filters = readFilters(raw, shelf, years);
  const filtered = isFiltered(filters);

  const matched = sortFiles(matchFiles(files, filters, shelf), filters.sort);
  const featured = filtered ? null : (sortFiles(files, "newest").find((file) => file.readable) ?? null);
  const rest = featured ? matched.filter((file) => file.id !== featured.id) : matched;
  const pages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const shown = rest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const clearHref = libraryHref({ sort: filters.sort });

  return (
    <div className="flex flex-col pb-2">
      <HubPageHeader
        title="Library"
        description="Weekly market reports and research from the Aquifert desk."
        tip="Every report and research file the desk publishes. Files outside your plan stay listed so you can see what an upgrade includes."
        guide="library"
      />

      <LibraryControls
        filters={filters}
        years={years}
        collections={tree.map(({ item, depth }) => ({ id: item.id, label: `${"\u00a0\u00a0\u00a0".repeat(depth)}${depth ? "└ " : ""}${item.name}` }))}
      />

      {files.length > 0 ? (
        <div className="mt-4 flex min-h-8 flex-wrap items-center justify-between gap-2">
          <p role="status" className="text-[14.5px] text-mid">
            {matched.length} {matched.length === 1 ? "file" : "files"}
            {filtered ? " match your filters" : " in the library"}
            {pages > 1 ? ` · page ${page} of ${pages}` : ""}
          </p>
          {filtered ? (
            <Link href={clearHref} className="inline-flex items-center gap-1 text-[14.5px] font-semibold text-blue no-underline hover:underline">
              <X className="h-3.5 w-3.5" aria-hidden />
              Clear filters
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-col gap-4">
        {files.length === 0 ? (
          <EmptyPanel title="No files in the library yet" body="The desk adds weekly market reports and research here. Check back after the next issue." />
        ) : matched.length === 0 ? (
          <EmptyPanel
            title="No files match these filters"
            body="Try a shorter search, another collection or a different year."
            action={
              <Link href={clearHref} className={btnSecondary}>
                Clear filters
              </Link>
            }
          />
        ) : (
          <>
            {featured && page === 1 ? <LibraryCard file={featured} featured /> : null}
            <div className="aq-stagger flex flex-col gap-3">
              {shown.map((file) => (
                <LibraryCard key={file.id} file={file} />
              ))}
            </div>
            <LibraryPagination filters={filters} page={page} pages={pages} />
          </>
        )}
      </div>
    </div>
  );
}
