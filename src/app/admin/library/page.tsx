import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, EyeOff, FileText, FolderTree, PenLine, Search, Trash2, TriangleAlert, UploadCloud } from "lucide-react";
import { bulkLibrary, deleteLibraryFile } from "@/app/admin/actions";
import { BulkApply, BulkBar, ConfirmSubmit, FilterSelect, SelectAll } from "@/components/admin/form-controls";
import { LibraryFileForm } from "@/components/admin/library-file-form";
import { Card, CardHeader, EmptyState, Flash, PageHeader, Pill, btnGhost, btnPrimary, btnSecondary, field } from "@/components/admin/ui";
import { FILE_ACCESS_LABEL, TELEX_ACCESS, collectionTree, isFileListed } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type Search = {
  edit?: string;
  new?: string;
  q?: string;
  collection?: string;
  access?: string;
  show?: string;
  page?: string;
  saved?: string;
  done?: string;
  count?: string;
};

function doneMessage(done: string | undefined, count: number) {
  if (!done) return undefined;
  const files = `${count} ${count === 1 ? "file" : "files"}`;
  if (done === "delete") return `${files} deleted.`;
  if (done === "private") return `${files} hidden from members.`;
  if (done === "listed") return `${files} listed in the member library.`;
  if (done.startsWith("access:")) return `${files} set to ${FILE_ACCESS_LABEL[done.slice(7) as keyof typeof FILE_ACCESS_LABEL] ?? "new"} access.`;
  if (done.startsWith("add:")) return `${files} added to the collection.`;
  if (done.startsWith("remove:")) return `${files} taken out of the collection.`;
  return `${files} updated.`;
}

export default async function LibraryAdminPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const { libraryDocuments, collections } = await getHubContent();
  const editing = libraryDocuments.find((file) => file.id === params.edit);
  const showForm = Boolean(editing || params.new);
  const byId = new Map(collections.map((item) => [item.id, item]));
  const tree = collectionTree(collections);
  const q = (params.q ?? "").trim().toLowerCase();

  const filtered = libraryDocuments.filter((file) => {
    if (params.collection === "none" ? file.collectionIds.length > 0 : params.collection && !file.collectionIds.includes(params.collection)) return false;
    if (params.access && file.access !== params.access) return false;
    if (params.show === "listed" && !isFileListed(file, collections)) return false;
    if (params.show === "hidden" && isFileListed(file, collections)) return false;
    if (params.show === "missing" && file.storedName) return false;
    if (!q) return true;
    return [file.title, file.filename, file.summary, file.author, ...file.collectionIds.map((id) => byId.get(id)?.name ?? "")].join(" ").toLowerCase().includes(q);
  });

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(params.page) || 1));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const missing = libraryDocuments.filter((file) => !file.storedName).length;

  const query = (patch: Partial<Search>) => {
    const next = new URLSearchParams();
    const merged: Partial<Search> = { q: params.q, collection: params.collection, access: params.access, show: params.show, page: String(page), ...patch };
    Object.entries(merged).forEach(([key, value]) => {
      if (value && !(key === "page" && value === "1")) next.set(key, value);
    });
    const str = next.toString();
    return str ? `/admin/library?${str}` : "/admin/library";
  };
  const withPanel = (panel: string) => {
    const base = query({});
    return `${base}${base.includes("?") ? "&" : "?"}${panel}`;
  };

  const count = Number(params.count ?? 1);
  const flash =
    doneMessage(params.done, count) ??
    (params.saved === "deleted"
      ? "File removed from the library."
      : params.saved === "uploaded"
        ? `${count} ${count === 1 ? "file" : "files"} uploaded. Members can download them now.`
        : params.saved
          ? "File saved. The member library shows this version now."
          : undefined);
  const filtering = Boolean(params.q || params.collection || params.access || params.show);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Library files"
        description="Files in the member Document Library. Access sets which plans can download a file. Private files, and files that sit only in private collections, stay hidden from members."
        actions={
          <>
            <Link href="/admin/collections" className={btnSecondary}>
              <FolderTree className="h-4 w-4" />
              Manage collections
            </Link>
            <Link href={withPanel("new=1")} className={btnPrimary}>
              <UploadCloud className="h-4 w-4" />
              Upload files
            </Link>
          </>
        }
      />
      <Flash saved={flash} message={flash} />

      {missing > 0 && params.show !== "missing" ? (
        <Link
          href={query({ show: "missing", page: "1" })}
          className="mb-5 flex items-center gap-2 rounded-xl border border-[#f5dfb3] bg-[#fff9ee] px-4 py-2.5 text-[13px] font-medium text-[#9a5b00] no-underline hover:border-[#e9c67f]"
        >
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {missing} {missing === 1 ? "file is" : "files are"} listed without an attached file, so members cannot download {missing === 1 ? "it" : "them"}. Show them.
        </Link>
      ) : null}

      <div className={`grid gap-5 ${showForm ? "xl:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
        <Card className="min-w-0">
          <form key={query({ page: "1" })} action="/admin/library" className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <span className="sr-only">Search files</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
                <input name="q" defaultValue={params.q} placeholder="Search files" className={`${field} h-9 w-56 pl-8`} />
              </label>
              <FilterSelect name="collection" defaultValue={params.collection ?? ""} className={`${field} h-9 w-48`} aria-label="Filter by collection">
                <option value="">All collections</option>
                <option value="none">Not in a collection</option>
                {tree.map(({ item, depth }) => (
                  <option key={item.id} value={item.id}>
                    {"— ".repeat(depth)}
                    {item.name}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect name="access" defaultValue={params.access ?? ""} className={`${field} h-9 w-36`} aria-label="Filter by access">
                <option value="">All access</option>
                {TELEX_ACCESS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {FILE_ACCESS_LABEL[item.value]}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect name="show" defaultValue={params.show ?? ""} className={`${field} h-9 w-40`} aria-label="Filter by visibility">
                <option value="">Any visibility</option>
                <option value="listed">Visible to members</option>
                <option value="hidden">Hidden from members</option>
                <option value="missing">No file attached</option>
              </FilterSelect>
              {filtering ? (
                <Link href="/admin/library" className="text-[12.5px] font-semibold text-blue no-underline">
                  Clear
                </Link>
              ) : null}
            </div>
            <span className="font-mono text-[11.5px] text-dim">
              {filtered.length} of {libraryDocuments.length} files
            </span>
          </form>

          {rows.length === 0 ? (
            <EmptyState
              title={libraryDocuments.length ? "No files match these filters" : "The library is empty"}
              body={libraryDocuments.length ? "Clear the filters or search for something else." : "Upload the first files and members will see them straight away."}
              action={
                <Link href={libraryDocuments.length ? "/admin/library" : withPanel("new=1")} className={libraryDocuments.length ? btnSecondary : btnPrimary}>
                  {libraryDocuments.length ? "Clear filters" : "Upload files"}
                </Link>
              }
            />
          ) : (
            <>
              <form action={bulkLibrary}>
                <input type="hidden" name="back" value={query({})} />
                <div className="flex items-center gap-3 border-b border-border bg-s2/40 px-4 py-2">
                  <BulkBar>
                    <select name="bulk" defaultValue="access:public" className={`${field} h-8 w-52 text-[12.5px]`} aria-label="Bulk action">
                      <optgroup label="Access">
                        {TELEX_ACCESS.map((item) => (
                          <option key={item.value} value={`access:${item.value}`}>
                            Set access: {FILE_ACCESS_LABEL[item.value]}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Visibility">
                        <option value="listed">Show to members</option>
                        <option value="private">Make private</option>
                      </optgroup>
                      <optgroup label="Add to collection">
                        {tree.map(({ item, depth }) => (
                          <option key={item.id} value={`add:${item.id}`}>
                            {"— ".repeat(depth)}
                            {item.name}
                          </option>
                        ))}
                      </optgroup>
                      {params.collection && params.collection !== "none" ? (
                        <optgroup label="This collection">
                          <option value={`remove:${params.collection}`}>Remove from {byId.get(params.collection)?.name ?? "collection"}</option>
                        </optgroup>
                      ) : null}
                      <optgroup label="Danger">
                        <option value="delete">Delete files</option>
                      </optgroup>
                    </select>
                    <BulkApply className={`${btnSecondary} h-8`} confirmMessage="Delete the selected files? Members lose access and the uploads are removed." />
                  </BulkBar>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] table-fixed text-left">
                    <thead>
                      <tr className="border-b border-border font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">
                        <th className="w-12 px-4 py-2.5">
                          <SelectAll />
                        </th>
                        <th className="py-2.5 pr-4 font-medium">File</th>
                        <th className="w-52 py-2.5 pr-4 font-medium">Collections</th>
                        <th className="w-28 py-2.5 pr-4 font-medium">Access</th>
                        <th className="w-36 py-2.5 pr-4 font-medium">Added</th>
                        <th className="w-28 py-2.5 pr-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((file) => {
                        const listed = isFileListed(file, collections);
                        return (
                          <tr key={file.id} className={`group border-b border-border align-top last:border-b-0 hover:bg-s2/40 ${editing?.id === file.id ? "bg-blue-light/50" : ""}`}>
                            <td className="px-4 py-3.5">
                              <input type="checkbox" name="ids" value={file.id} aria-label={`Select ${file.title}`} className="h-4 w-4 accent-[#2e6da4]" />
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex items-start gap-3">
                                <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue/10 text-blue">
                                  <FileText className="h-4 w-4" />
                                  <span className="absolute -bottom-1 -right-1 rounded bg-white px-0.5 font-mono text-[8px] font-bold text-mid ring-1 ring-border">{file.type}</span>
                                </span>
                                <div className="min-w-0">
                                  <Link href={withPanel(`edit=${file.id}`)} className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-ink no-underline hover:text-blue">
                                    {file.title}
                                  </Link>
                                  <p className="mt-0.5 truncate font-mono text-[11.5px] text-dim">{file.storedName ?? file.filename}</p>
                                  <div className="mt-1 flex flex-wrap items-center gap-1">
                                    {!listed ? (
                                      <Pill tone="amber">
                                        <EyeOff className="mr-1 h-3 w-3" />
                                        {file.private ? "Private" : "Private collection"}
                                      </Pill>
                                    ) : null}
                                    {!file.storedName ? <Pill tone="amber">No file attached</Pill> : <span className="text-[11.5px] text-mid">{file.size}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 pr-4">
                              <div className="flex flex-wrap gap-1">
                                {file.collectionIds.length ? (
                                  file.collectionIds.map((id) => (
                                    <Link key={id} href={query({ collection: id, page: "1" })} className="no-underline">
                                      <Pill tone={byId.get(id)?.private ? "amber" : "blue"}>{byId.get(id)?.name ?? "Removed"}</Pill>
                                    </Link>
                                  ))
                                ) : (
                                  <span className="text-[12px] text-dim">—</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 pr-4">
                              <Pill tone={file.access === "public" ? "teal" : "amber"}>{FILE_ACCESS_LABEL[file.access]}</Pill>
                            </td>
                            <td className="py-3.5 pr-4">
                              <p className="font-mono text-[11.5px] text-ink">{file.updated}</p>
                              <p className="mt-0.5 truncate text-[11.5px] text-mid">{file.author}</p>
                            </td>
                            <td className="py-3 pr-3">
                              <div className="flex justify-end gap-0.5 opacity-70 transition group-hover:opacity-100">
                                {file.storedName ? (
                                  <a href={`/hub/library/file/${file.id}`} className={btnGhost} title="Download">
                                    <Download className="h-3.5 w-3.5" />
                                  </a>
                                ) : null}
                                <Link href={withPanel(`edit=${file.id}`)} className={btnGhost} title="Edit">
                                  <PenLine className="h-3.5 w-3.5" />
                                </Link>
                                <ConfirmSubmit
                                  form={`del-${file.id}`}
                                  message={`Delete “${file.title}”? Members lose access and the upload is removed.`}
                                  className={`${btnGhost} hover:bg-red-50 hover:text-danger`}
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </ConfirmSubmit>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </form>
              {rows.map((file) => (
                <form key={file.id} id={`del-${file.id}`} action={deleteLibraryFile} hidden>
                  <input type="hidden" name="id" value={file.id} />
                  <input type="hidden" name="back" value={query({})} />
                </form>
              ))}
            </>
          )}

          {pages > 1 ? (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[12.5px] text-mid">
              <span>
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                <Link aria-disabled={page <= 1} href={query({ page: String(page - 1) })} className={`${btnSecondary} h-8 ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}>
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Link>
                <Link aria-disabled={page >= pages} href={query({ page: String(page + 1) })} className={`${btnSecondary} h-8 ${page >= pages ? "pointer-events-none opacity-40" : ""}`}>
                  Next <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : null}
        </Card>

        {showForm ? (
          <Card className="xl:sticky xl:top-6 xl:self-start">
            <CardHeader
              title={editing ? "Edit file" : "Upload files"}
              meta={editing ? `Added ${editing.updated} by ${editing.author}` : undefined}
              actions={
                <Link href={query({})} className="text-[12.5px] font-semibold text-mid no-underline hover:text-ink">
                  Close
                </Link>
              }
            />
            <LibraryFileForm
              key={editing?.id ?? "new"}
              file={editing}
              tree={tree}
              defaultCollection={params.collection && params.collection !== "none" ? params.collection : undefined}
              closeHref={query({})}
            />
          </Card>
        ) : null}
      </div>
    </div>
  );
}
