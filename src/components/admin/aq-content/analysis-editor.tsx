"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import { saveAnalysisNote } from "@/app/admin/aq-content/actions";
import { ANALYSIS_PRODUCTS, ANALYSIS_REGIONS, DEFAULT_AUTHOR, type TelexOption } from "@/components/admin/aq-content/options";
import { MarkdownField, StatusToggle } from "@/components/admin/aq-content/shared";
import { btnPrimary, field, input, label } from "@/components/admin/ui";
import type { AnalysisNote, PublishState } from "@/lib/aq-modules/types";
import { formatStamp, slugify } from "@/lib/content-types";

const panel = "rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(26,58,92,0.05)]";

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold transition ${active ? "border-blue bg-blue-light text-blue" : "border-border bg-white text-mid hover:border-blue/40 hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

export function AnalysisEditor({
  note,
  defaultPublishedAt,
  slugs,
  telex,
}: {
  note?: AnalysisNote;
  defaultPublishedAt: string;
  slugs: { id: string; slug: string }[];
  telex: TelexOption[];
}) {
  const router = useRouter();
  const [saving, start] = useTransition();
  const [title, setTitle] = useState(note?.title ?? "");
  const [slugDraft, setSlugDraft] = useState(note?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(note));
  const [products, setProducts] = useState<string[]>(note?.products ?? []);
  const [productDraft, setProductDraft] = useState("");
  const [regions, setRegions] = useState<string[]>(note?.regions ?? []);
  const [body, setBody] = useState(note?.body ?? "");
  const [status, setStatus] = useState<PublishState>(note?.status ?? "draft");
  const [publishedAt, setPublishedAt] = useState(note?.publishedAt ?? defaultPublishedAt);
  const [author, setAuthor] = useState(note?.author ?? DEFAULT_AUTHOR);
  const [related, setRelated] = useState<string[]>(note?.relatedTelexIds ?? []);
  const [telexQuery, setTelexQuery] = useState("");

  const slugValue = slugEdited ? slugDraft : slugify(title);
  const slug = slugify(slugValue).replace(/^-+|-+$/g, "");
  const clash = Boolean(slug) && slugs.some((item) => item.id !== note?.id && item.slug === slug);
  const customProducts = products.filter((item) => !ANALYSIS_PRODUCTS.includes(item));
  const needle = telexQuery.trim().toLowerCase();
  const telexById = new Map(telex.map((item) => [item.id, item]));
  const matches = telex.filter((item) => !needle || item.headline.toLowerCase().includes(needle));
  const words = body.split(/\s+/).filter(Boolean).length;

  const addProducts = (raw: string) => {
    const next = raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (next.length) setProducts((current) => Array.from(new Set([...current, ...next])));
    setProductDraft("");
  };

  const save = () => {
    if (clash) {
      toast.error("Another note already uses that slug.");
      return;
    }
    start(async () => {
      const result = await saveAnalysisNote({ id: note?.id, title, slug, body, products, regions, status, publishedAt, author, relatedTelexIds: related });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSlugDraft(result.slug);
      setSlugEdited(true);
      toast.success(status === "published" ? "Published. Members see this note on the hub now." : "Draft saved. Members do not see it until you publish.");
      if (note) router.refresh();
      else router.replace(`/admin/analysis/${result.id}`);
    });
  };

  const primaryLabel = status === "published" ? (note?.status === "published" ? "Update" : "Publish") : "Save draft";

  return (
    <form
      className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="flex min-w-0 flex-col gap-5">
        <section className={panel}>
          <label className={label} htmlFor="title">
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            placeholder="India's tender sets the floor for urea into Q4"
            className={`${field} mt-1.5 h-11 w-full text-[15px] font-semibold`}
          />

          <div className="mt-4 flex items-end justify-between gap-2">
            <label className={label} htmlFor="slug">
              Slug
            </label>
            {slugEdited && !note ? (
              <button type="button" onClick={() => setSlugEdited(false)} className="text-[12px] font-semibold text-blue">
                Use title
              </button>
            ) : null}
          </div>
          <div className={`mt-1.5 flex h-10 items-center rounded-xl border bg-white pl-3 ${clash ? "border-red-300" : "border-border"}`}>
            <span className="shrink-0 font-mono text-[12px] text-dim">/hub/analysis/</span>
            <input
              id="slug"
              value={slugValue}
              onChange={(event) => {
                setSlugEdited(true);
                setSlugDraft(event.target.value.toLowerCase().replace(/\s+/g, "-"));
              }}
              placeholder="urea-india-tender"
              className="h-full min-w-0 flex-1 bg-transparent pr-3 font-mono text-[12.5px] text-ink outline-none placeholder:text-dim"
            />
          </div>
          {clash ? (
            <p className="mt-1 text-[12px] font-medium text-danger">Another note already uses this slug. Change it before saving.</p>
          ) : note && slug !== note.slug ? (
            <p className="mt-1 text-[12px] text-[#9a5b00]">Changing the slug breaks links members may have saved.</p>
          ) : null}

          <div className="mt-5">
            <MarkdownField
              id="body"
              title="Note"
              value={body}
              onChange={setBody}
              rows={20}
              meta={`${words} words · ${Math.max(1, Math.round(words / 200))} min read`}
              placeholder={"Lead with what happened.\n\n**What it means:** …\n\n**What to watch:** …"}
            />
          </div>
        </section>

        <section className={panel}>
          <div className="flex items-end justify-between gap-2">
            <p className={label}>Related Telex</p>
            <span className="font-mono text-[11px] text-dim">{related.length} linked</span>
          </div>
          {related.length ? (
            <ul className="mt-2 flex flex-col gap-1.5">
              {related.map((id) => {
                const item = telexById.get(id);
                return (
                  <li key={id} className="flex items-center justify-between gap-2 rounded-lg bg-blue-light/60 px-3 py-1.5">
                    <span className="min-w-0 truncate text-[12.5px] font-semibold uppercase tracking-wide text-blue">{item ? item.headline : `Removed message (${id})`}</span>
                    <button type="button" aria-label="Unlink" onClick={() => setRelated(related.filter((value) => value !== id))} className="rounded p-0.5 text-blue hover:bg-blue/10">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <label className="relative mt-3 block">
            <span className="sr-only">Search Telex</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim" />
            <input value={telexQuery} onChange={(event) => setTelexQuery(event.target.value)} placeholder="Search the latest 50 Telex by headline" className={`${field} h-9 w-full pl-8`} />
          </label>
          <ul className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-border">
            {matches.length ? (
              matches.map((item) => {
                const checked = related.includes(item.id);
                return (
                  <li key={item.id} className="border-b border-border last:border-b-0">
                    <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2 hover:bg-s2/50">
                      <input type="checkbox" checked={checked} onChange={() => setRelated(toggle(related, item.id))} className="mt-0.5 h-4 w-4 shrink-0 accent-[#2e6da4]" />
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-semibold uppercase tracking-wide text-ink">{item.headline}</span>
                        <span className="block font-mono text-[11px] text-dim">{formatStamp(item.publishedAt)}</span>
                      </span>
                    </label>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-6 text-center text-[12.5px] text-dim">No Telex matches.</li>
            )}
          </ul>
        </section>
      </div>

      <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
        <section className={panel}>
          <p className={label}>Status</p>
          <StatusToggle value={status} onChange={setStatus} />

          <label className={`${label} mt-4`} htmlFor="publishedAt">
            Publish time
          </label>
          <input
            id="publishedAt"
            type="datetime-local"
            value={publishedAt}
            onChange={(event) => setPublishedAt(event.target.value.slice(0, 16))}
            required
            className={`${input} mt-1.5 font-mono text-[12.5px]`}
          />

          <label className={`${label} mt-4`} htmlFor="author">
            Author
          </label>
          <input id="author" value={author} onChange={(event) => setAuthor(event.target.value)} className={`${input} mt-1.5`} />

          <div className="mt-5 border-t border-border pt-4">
            <button type="submit" disabled={saving || clash} className={`${btnPrimary} w-full`}>
              {saving ? "Saving…" : primaryLabel}
            </button>
          </div>
        </section>

        <section className={panel}>
          <p className={label}>Products</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ANALYSIS_PRODUCTS.map((item) => (
              <Chip key={item} active={products.includes(item)} onClick={() => setProducts(toggle(products, item))}>
                {item}
              </Chip>
            ))}
            {customProducts.map((item) => (
              <span key={item} className="inline-flex items-center gap-1 rounded-full border border-blue bg-blue-light py-1 pl-2.5 pr-1.5 text-[12px] font-semibold text-blue">
                {item}
                <button type="button" aria-label={`Remove ${item}`} onClick={() => setProducts(products.filter((value) => value !== item))} className="rounded-full p-0.5 hover:bg-blue/10">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <input
            value={productDraft}
            onChange={(event) => setProductDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addProducts(productDraft);
              }
            }}
            onBlur={() => productDraft && addProducts(productDraft)}
            placeholder="Add another, e.g. TSP"
            aria-label="Add a product"
            className={`${field} mt-2.5 h-9 w-full`}
          />

          <p className={`${label} mt-5`}>Regions</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ANALYSIS_REGIONS.map((item) => (
              <Chip key={item} active={regions.includes(item)} onClick={() => setRegions(toggle(regions, item))}>
                {item}
              </Chip>
            ))}
          </div>
        </section>
      </aside>
    </form>
  );
}
