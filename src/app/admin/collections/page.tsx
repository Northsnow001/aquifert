import Link from "next/link";
import { EyeOff, PenLine, Search, Trash2 } from "lucide-react";
import { deleteCollection, saveCollection } from "@/app/admin/actions";
import { ConfirmSubmit, PendingButton } from "@/components/admin/form-controls";
import { Card, CardHeader, EmptyState, Flash, PageHeader, Pill, btnGhost, btnPrimary, btnSecondary, field, input, label, textarea } from "@/components/admin/ui";
import { collectionTree as ordered, type Collection } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";

export const dynamic = "force-dynamic";

function descendants(collections: Collection[], id: string): Set<string> {
  const result = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const item of collections) {
      if (item.parentId && result.has(item.parentId) && !result.has(item.id)) {
        result.add(item.id);
        grew = true;
      }
    }
  }
  return result;
}

export default async function CollectionsPage({ searchParams }: { searchParams: Promise<{ edit?: string; q?: string; saved?: string; error?: string }> }) {
  const params = await searchParams;
  const { collections, libraryDocuments } = await getHubContent();
  const editing = collections.find((item) => item.id === params.edit);
  const blocked = editing ? descendants(collections, editing.id) : new Set<string>();
  const q = (params.q ?? "").trim().toLowerCase();
  const rows = ordered(collections).filter(({ item }) => !q || [item.name, item.slug, item.description].join(" ").toLowerCase().includes(q));
  const countFor = (id: string) => libraryDocuments.filter((file) => file.collectionIds.includes(id)).length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Collections"
        description="Collections group files in the member Document Library. Private collections stay out of the member view."
        crumbs={[{ href: "/admin/library", label: "Library" }]}
      />
      <Flash
        saved={params.saved}
        message={params.saved === "deleted" ? "Collection deleted. Its files stay in the library." : "Collection saved."}
      />
      <Flash error={params.error} message="Give the collection a name." />

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="lg:sticky lg:top-6 lg:self-start">
          <CardHeader title={editing ? `Edit “${editing.name}”` : "Add a collection"} />
          <form key={editing?.id ?? "new"} action={saveCollection} className="space-y-4 p-5">
            <input type="hidden" name="id" value={editing?.id ?? ""} />
            <div>
              <label className={label} htmlFor="name">
                Name
              </label>
              <input id="name" name="name" required defaultValue={editing?.name} placeholder="Weekly Market Reports" className={`${input} mt-1.5`} />
            </div>
            <div>
              <label className={label} htmlFor="slug">
                Slug
              </label>
              <input id="slug" name="slug" defaultValue={editing?.slug} placeholder="Generated from the name" className={`${input} mt-1.5 font-mono text-[12.5px]`} />
            </div>
            <div>
              <label className={label} htmlFor="parentId">
                Parent
              </label>
              <select id="parentId" name="parentId" defaultValue={editing?.parentId ?? ""} className={`${input} mt-1.5`}>
                <option value="">None, top level</option>
                {ordered(collections)
                  .filter(({ item }) => !blocked.has(item.id))
                  .map(({ item, depth }) => (
                    <option key={item.id} value={item.id}>
                      {"— ".repeat(depth)}
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="description">
                Description
              </label>
              <textarea id="description" name="description" rows={3} defaultValue={editing?.description} className={`${textarea} mt-1.5`} />
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-s2/40 px-3 py-2.5">
              <input type="checkbox" name="private" defaultChecked={editing?.private} className="mt-0.5 h-4 w-4 accent-[#2e6da4]" />
              <span>
                <span className="block text-[13px] font-semibold text-ink">Private</span>
                <span className="block text-[12px] text-mid">Hidden from the member Document Library.</span>
              </span>
            </label>
            <div className="flex gap-2 pt-1">
              <PendingButton type="submit" className={`${btnPrimary} flex-1`} pendingLabel="Saving…">
                {editing ? "Save changes" : "Add collection"}
              </PendingButton>
              {editing ? (
                <Link href="/admin/collections" className={btnSecondary}>
                  Cancel
                </Link>
              ) : null}
            </div>
          </form>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <form key={params.q ?? ""} action="/admin/collections" className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
              <input name="q" defaultValue={params.q} placeholder="Search collections" className={`${field} h-9 w-64 pl-8`} aria-label="Search collections" />
            </form>
            <span className="font-mono text-[11.5px] text-dim">{collections.length} collections</span>
          </div>
          {rows.length === 0 ? (
            <EmptyState title="No collections match" body="Clear the search to see every collection." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] table-fixed text-left">
                <thead>
                  <tr className="border-b border-border font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">
                    <th className="w-[42%] px-4 py-2.5 font-medium">Name</th>
                    <th className="py-2.5 pr-4 font-medium">Description</th>
                    <th className="w-16 py-2.5 pr-4 text-right font-medium">Files</th>
                    <th className="w-24 py-2.5 pr-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ item, depth }) => {
                    const count = countFor(item.id);
                    return (
                      <tr key={item.id} className={`group border-b border-border last:border-b-0 hover:bg-s2/40 ${editing?.id === item.id ? "bg-blue-light/50" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2" style={{ paddingLeft: depth * 16 }}>
                            {depth ? <span className="text-dim">└</span> : null}
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link href={`/admin/collections?edit=${item.id}`} className="text-[13.5px] font-semibold text-ink no-underline hover:text-blue">
                                  {item.name}
                                </Link>
                                {item.private ? (
                                  <Pill tone="amber">
                                    <EyeOff className="mr-1 h-3 w-3" />
                                    Private
                                  </Pill>
                                ) : null}
                              </div>
                              <p className="mt-0.5 truncate font-mono text-[11px] text-dim">/{item.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-[12.5px] text-mid">
                          <span className="line-clamp-2">{item.description || "—"}</span>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <Link href={`/admin/library?collection=${item.id}`} className="font-mono text-[12.5px] font-semibold text-blue no-underline">
                            {count}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-3">
                          <form className="flex justify-end gap-0.5 opacity-70 transition group-hover:opacity-100">
                            <input type="hidden" name="id" value={item.id} />
                            <Link href={`/admin/collections?edit=${item.id}`} className={btnGhost} title="Edit">
                              <PenLine className="h-3.5 w-3.5" />
                            </Link>
                            <ConfirmSubmit
                              formAction={deleteCollection}
                              message={`Delete “${item.name}”? ${count ? `Its ${count} file${count === 1 ? "" : "s"} stay in the library without this collection.` : ""}`}
                              className={`${btnGhost} hover:bg-red-50 hover:text-danger`}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </ConfirmSubmit>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
