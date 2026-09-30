"use client";

import { useMemo, useState } from "react";
import { Download, Eye, FileText, Files, Lock, Search, SquareArrowOutUpRight } from "lucide-react";
import { toast } from "sonner";
import { FILE_ACCESS_LABEL, canReadTelex, type Collection, type LibraryDocument } from "@/lib/content-types";
import type { Plan } from "@/lib/session-shared";

const ACCESS_STYLE = {
  public: "border-[#d7e6db] bg-[#eef8f0] text-[#2f6f44]",
  growth: "border-[#f5dfb3] bg-[#fff6e5] text-[#9a5b00]",
  enterprise: "border-[#d8d3f0] bg-[#f3f1fc] text-[#5040a0]",
} as const;

export function LibraryBoard({ documents, collections, plan }: { documents: LibraryDocument[]; collections: Collection[]; plan: Plan }) {
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("");
  const [openFileId, setOpenFileId] = useState<string | null>(null);
  const names = useMemo(() => new Map(collections.map((item) => [item.id, item.name])), [collections]);
  const collectionLabel = (file: LibraryDocument) => file.collectionIds.map((id) => names.get(id)).filter(Boolean).join(", ") || "Library";

  const tree = useMemo(() => {
    const children = new Map<string | null, Collection[]>();
    for (const item of collections) {
      const parent = item.parentId && collections.some((other) => other.id === item.parentId) ? item.parentId : null;
      children.set(parent, [...(children.get(parent) ?? []), item]);
    }
    const ordered: { item: Collection; depth: number }[] = [];
    const walk = (parent: string | null, depth: number, seen: Set<string>) => {
      for (const item of children.get(parent) ?? []) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        ordered.push({ item, depth });
        walk(item.id, depth + 1, seen);
      }
    };
    const seen = new Set<string>();
    walk(null, 0, seen);
    for (const item of collections) if (!seen.has(item.id)) ordered.push({ item, depth: 0 });
    return { ordered, children };
  }, [collections]);

  const selectedIds = useMemo(() => {
    if (!collection) return null;
    const ids = new Set<string>();
    const add = (id: string) => {
      if (ids.has(id)) return;
      ids.add(id);
      for (const child of tree.children.get(id) ?? []) add(child.id);
    };
    add(collection);
    return ids;
  }, [collection, tree]);

  const files = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return documents.filter((file) => {
      if (selectedIds && !file.collectionIds.some((id) => selectedIds.has(id))) return false;
      if (!needle) return true;
      const labels = file.collectionIds.map((id) => names.get(id) ?? "");
      return [file.title, file.filename, ...labels].some((value) => value.toLowerCase().includes(needle));
    });
  }, [selectedIds, documents, names, query]);

  const openFile = documents.find((file) => file.id === openFileId) ?? null;

  const unavailable = (file: LibraryDocument) => {
    toast.message(`${file.title} is being prepared by the desk and is not downloadable yet.`);
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
                onChange={(event) => setCollection(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-ink outline-none focus:border-blue/40 focus:ring-2 focus:ring-blue/15"
              >
                <option value="">All collections</option>
                {tree.ordered.map(({ item, depth }) => (
                  <option key={item.id} value={item.id}>
                    {`${"\u00a0\u00a0\u00a0".repeat(depth)}${depth ? "└ " : ""}${item.name}`}
                  </option>
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
                const allowed = canReadTelex(file.access, plan);
                const href = `/hub/library/file/${file.id}`;
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
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${ACCESS_STYLE[file.access]}`}>
                            {allowed ? null : <Lock className="h-2.5 w-2.5" />}
                            {FILE_ACCESS_LABEL[file.access]}
                          </span>
                        </div>
                        <p className="mt-1 truncate font-mono text-[11px] text-dim">{file.filename}</p>
                        <p className="mt-1 text-[11px] text-mid">
                          {[collectionLabel(file), file.type, file.size, file.updated].filter((part) => part && part !== "—").join(" · ")}
                        </p>
                      </div>
                    </div>
                    {selected ? (
                      <div className="mt-3 rounded-lg bg-s2 px-3 py-3">
                        <p className="text-[13px] leading-relaxed text-ink">{file.summary || "No summary for this file yet."}</p>
                        {!allowed ? (
                          <p className="mt-2 flex items-center gap-1.5 text-[12px] leading-relaxed text-[#9a5b00]">
                            <Lock className="h-3.5 w-3.5" />
                            Included with the {FILE_ACCESS_LABEL[file.access]} plan.{" "}
                            <a href="/hub/account" className="font-semibold underline underline-offset-2">
                              See plans
                            </a>
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setOpenFileId(selected ? null : file.id)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-[12px] font-semibold text-ink hover:border-blue/40 hover:text-blue"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {selected ? "Hide details" : "Details"}
                      </button>
                      {allowed && file.storedName && file.type === "PDF" ? (
                        <a
                          href={`${href}?inline=1`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue bg-white px-3 text-[12px] font-semibold text-blue no-underline hover:bg-blue-light"
                        >
                          <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                          Open
                        </a>
                      ) : null}
                      {!allowed ? (
                        <a
                          href="/hub/account"
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#9a5b00] px-3 text-[12px] font-semibold text-white no-underline hover:bg-[#7f4b00]"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          Upgrade to download
                        </a>
                      ) : file.storedName ? (
                        <a
                          href={href}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue px-3 text-[12px] font-semibold text-white no-underline hover:bg-blue-dim"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => unavailable(file)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue/60 px-3 text-[12px] font-semibold text-white"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                      )}
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
