"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, Info, X } from "lucide-react";
import { saveTelex } from "@/app/admin/actions";
import { PendingButton } from "@/components/admin/form-controls";
import { Markdown } from "@/components/hub/markdown";
import { btnPrimary, btnSecondary, field, input, label, textarea } from "@/components/admin/ui";
import {
  PUBLISH_STATUS,
  TELEX_ACCESS,
  deskNow,
  formatTelexDay,
  splitParagraphs,
  telexHeadline,
  type PublishStatus,
  type TelexAccess,
  type TelexItem,
} from "@/lib/content-types";

const ACCESS_AUDIENCE: Record<TelexAccess, string> = {
  public: "AQ ONE, AQ Analytics and AQ ZERO members",
  growth: "AQ Analytics and AQ ZERO members",
  enterprise: "AQ ZERO members only",
};

export function TelexEditor({ item, knownTags, defaultAuthor }: { item?: TelexItem; knownTags: string[]; defaultAuthor: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [headline, setHeadline] = useState(item?.headline ?? "");
  const [body, setBody] = useState(item?.paragraphs.join("\n\n") ?? "");
  const [status, setStatus] = useState<PublishStatus>(item?.status ?? "published");
  const [access, setAccess] = useState<TelexAccess>(item?.access ?? "public");
  const [publishedAt, setPublishedAt] = useState(item?.publishedAt ?? deskNow());
  const [tags, setTags] = useState<string[]>(item?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");

  const paragraphs = useMemo(() => splitParagraphs(body), [body]);
  const words = body.split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const addTag = (raw: string) => {
    const next = raw
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (next.length) setTags((current) => Array.from(new Set([...current, ...next])));
    setTagDraft("");
  };

  const suggestions = knownTags.filter((tag) => !tags.includes(tag) && tag.toLowerCase().includes(tagDraft.toLowerCase())).slice(0, 8);
  const primaryLabel = status === "published" ? (item?.status === "published" ? "Update" : "Publish") : status === "private" ? "Save private" : "Save draft";

  return (
    <form ref={formRef} action={saveTelex} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="access" value={access} />
      <input type="hidden" name="tags" value={tags.join(",")} />

      <div className="flex min-w-0 flex-col gap-5">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
          <label className={label} htmlFor="headline">
            Headline
          </label>
          <input
            id="headline"
            name="headline"
            value={headline}
            onChange={(event) => setHeadline(event.target.value)}
            placeholder="Leave empty to use the first words of the message"
            className={`${field} mt-1.5 h-11 w-full text-[15px] font-semibold uppercase tracking-wide placeholder:normal-case placeholder:font-normal placeholder:tracking-normal`}
          />
          <div className="mt-5 flex items-end justify-between">
            <label className={label} htmlFor="body">
              Message
            </label>
            <span className="font-mono text-[11px] text-dim">
              {words} words · {paragraphs.length} {paragraphs.length === 1 ? "paragraph" : "paragraphs"} · {Math.max(1, Math.round(words / 200))} min read
            </span>
          </div>
          <textarea
            id="body"
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={16}
            required
            placeholder="Paste or write the intel. Leave a blank line between paragraphs."
            className={`${textarea} mt-1.5 min-h-[22rem] font-[450]`}
          />
          <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-relaxed text-dim">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            A blank line starts a new paragraph. Markdown works: **bold**, *italic*, # headings, lists, &gt; quotes, [links](https://…), ![images](https://…), --- rules and | pipe | tables |. Ctrl+S saves.
          </p>
        </section>

        <section className="overflow-hidden aq-card">
          <div className="flex items-center gap-2 border-b border-border bg-s2/50 px-5 py-2.5">
            <Eye className="h-4 w-4 text-blue" />
            <p className="text-[12.5px] font-semibold text-ink">Hub preview</p>
            <span className="ml-auto text-[12px] text-dim">{status === "published" ? `Visible to ${ACCESS_AUDIENCE[access]}` : "Hidden from members until published"}</span>
          </div>
          <article className="px-5 py-4">
            <p className="font-mono text-[11px] uppercase tracking-wide text-dim">{formatTelexDay(publishedAt)}</p>
            <h3 className="mt-2 text-[15px] font-bold uppercase leading-snug tracking-wide text-ink">{telexHeadline({ headline, paragraphs })}</h3>
            {paragraphs.length ? (
              <Markdown text={paragraphs.join("\n\n")} images className="mt-3 text-[13.5px] text-ink" />
            ) : (
              <p className="mt-3 text-[13.5px] text-dim">The message body shows here.</p>
            )}
            {tags.length ? (
              <div className="mt-3 flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-blue-light px-1.5 py-0.5 text-[11px] font-semibold text-blue">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        </section>
      </div>

      <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
          <p className={label}>Status</p>
          <div className="mt-1.5 grid grid-cols-3 rounded-lg border border-border bg-s2/60 p-0.5">
            {PUBLISH_STATUS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                className={`rounded-md py-1.5 text-[12.5px] font-semibold transition ${
                  status === option.value ? "bg-white text-ink shadow-sm" : "text-mid hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className={`${label} mt-4`} htmlFor="publishedAt">
            Publish time
          </label>
          <input
            id="publishedAt"
            name="publishedAt"
            type="datetime-local"
            value={publishedAt}
            onChange={(event) => setPublishedAt(event.target.value)}
            className={`${input} mt-1.5 font-mono text-[12.5px]`}
          />

          <p className={`${label} mt-4`}>Access</p>
          <div className="mt-1.5 grid gap-1.5">
            {TELEX_ACCESS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAccess(option.value)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                  access === option.value ? "border-blue bg-blue-light/60 ring-1 ring-blue/30" : "border-border bg-white hover:border-blue/40"
                }`}
              >
                <span className="text-[13px] font-semibold text-ink">{option.label}</span>
                <span className="text-[11.5px] text-mid">{option.hint}</span>
              </button>
            ))}
          </div>

          <label className={`${label} mt-4`} htmlFor="author">
            Author
          </label>
          <input id="author" name="author" defaultValue={item?.author ?? defaultAuthor} className={`${input} mt-1.5`} />

          <div className="mt-5 flex gap-2 border-t border-border pt-4">
            <PendingButton type="submit" className={`${btnPrimary} flex-1`} pendingLabel="Saving…">
              {primaryLabel}
            </PendingButton>
            {status !== "draft" ? (
              <PendingButton type="submit" name="intent" value="draft" className={btnSecondary}>
                Save draft
              </PendingButton>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(26,58,92,0.05)]">
          <label className={label} htmlFor="tag-input">
            Tags
          </label>
          <div className="mt-1.5 flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-white px-2 py-1.5 focus-within:border-blue/50 focus-within:ring-2 focus-within:ring-blue/15">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-blue-light py-0.5 pl-2 pr-1 text-[12px] font-semibold text-blue">
                {tag}
                <button type="button" aria-label={`Remove ${tag}`} onClick={() => setTags(tags.filter((t) => t !== tag))} className="rounded p-0.5 hover:bg-blue/10">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              id="tag-input"
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  addTag(tagDraft);
                } else if (event.key === "Backspace" && !tagDraft && tags.length) {
                  setTags(tags.slice(0, -1));
                }
              }}
              onBlur={() => tagDraft && addTag(tagDraft)}
              placeholder={tags.length ? "" : "Urea, China, Brazil"}
              className="min-w-[6rem] flex-1 bg-transparent px-1 text-[13px] text-ink outline-none placeholder:text-dim"
            />
          </div>
          {suggestions.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="rounded-md border border-dashed border-border px-1.5 py-0.5 text-[11.5px] text-mid transition hover:border-blue/40 hover:text-blue"
                >
                  + {tag}
                </button>
              ))}
            </div>
          ) : null}
          <p className="mt-2 text-[12px] text-dim">Press Enter or comma to add. Tags filter the Telex list here.</p>
        </section>
      </aside>
    </form>
  );
}
