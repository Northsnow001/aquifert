"use client";

import { useMemo, useState } from "react";
import { Download, Eye, FileText, Files, Search } from "lucide-react";
import { toast } from "sonner";
import { libraryCollections, libraryDocuments, type LibraryDocument } from "@/data/library";

export function LibraryBoard() {
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<(typeof libraryCollections)[number]>("All collections");
  const [openFileId, setOpenFileId] = useState<string | null>(null);

  const files = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return libraryDocuments.filter((file) => {
      const inCollection = collection === "All collections" || file.collection === collection;
      if (!inCollection) return false;
      if (!needle) return true;
      return [file.title, file.filename, file.collection].some((value) => value.toLowerCase().includes(needle));
    });
  }, [collection, query]);

  const openFile = libraryDocuments.find((file) => file.id === openFileId) ?? null;

  const download = (file: LibraryDocument) => {
    toast.message(`${file.filename}.pdf is not attached in this preview.`);
  };

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[40rem] flex-col gap-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Library</h1>
        <p className="mt-1 text-sm text-mid">Desk documents.</p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(26,58,92,0.04)]">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
            <h2 className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
              <Files className="h-4 w-4 text-blue" />
              Document library
            </h2>
            <p className="font-mono text-[11px] uppercase tracking-wide text-dim">
              {files.length} {files.length === 1 ? "file" : "files"}
            </p>
          </div>

          <div className="grid gap-2 border-b border-border p-3">
            <label className="relative block">
              <span className="sr-only">Search files or collections</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                type="search"
                placeholder="Search files or collections"
                className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-[13px] text-ink outline-none placeholder:text-dim focus:border-blue/40 focus:ring-2 focus:ring-blue/15"
              />
            </label>
            <label className="block">
              <span className="sr-only">Filter by collection</span>
              <select
                value={collection}
                onChange={(event) => setCollection(event.target.value as (typeof libraryCollections)[number])}
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-ink outline-none focus:border-blue/40 focus:ring-2 focus:ring-blue/15"
              >
                {libraryCollections.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {files.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-mid">No files match that search.</p>
            ) : (
              files.map((file) => {
                const selected = openFile?.id === file.id;
                return (
                  <article
                    key={file.id}
                    className={`border-b border-border px-4 py-3.5 last:border-b-0 ${selected ? "bg-blue-light/70" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue/10 text-blue">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[13px] font-semibold leading-snug text-ink">{file.title}</h3>
                          <span className="rounded-full border border-[#d7e6db] bg-[#eef8f0] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#2f6f44]">
                            Free
                          </span>
                        </div>
                        <p className="mt-1 truncate font-mono text-[11px] text-dim">{file.filename}</p>
                        <p className="mt-1 text-[11px] text-mid">
                          {file.collection} · {file.type} · {file.size} · {file.updated}
                        </p>
                      </div>
                    </div>
                    {selected ? (
                      <div className="mt-3 rounded-lg bg-s2 px-3 py-3">
                        <p className="text-[13px] leading-relaxed text-ink">{file.summary}</p>
                        <p className="mt-2 text-[12px] leading-relaxed text-mid">
                          The PDF itself is not attached in this preview. Download will be wired when the library files are connected.
                        </p>
                      </div>
                    ) : null}
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setOpenFileId(selected ? null : file.id)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue px-3 text-[12px] font-semibold text-white hover:bg-blue-dim"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {selected ? "Hide" : "View"}
                      </button>
                      <button
                        type="button"
                        onClick={() => download(file)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue bg-white px-3 text-[12px] font-semibold text-blue hover:bg-blue-light"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
