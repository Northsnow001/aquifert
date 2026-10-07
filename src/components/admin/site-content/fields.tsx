"use client";

import { useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Film, ImageIcon, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { uploadSiteImage } from "@/app/admin/site-content/actions";
import { btnGhost, btnSecondary, input, label as labelClass, textarea } from "@/components/admin/ui";
import { BUILT_IN_IMAGES, BUILT_IN_VIDEOS, LINK_SUGGESTIONS } from "@/lib/site-content/library";
import { SITE_ICON_NAMES, isValidLink, isValidMedia } from "@/lib/site-content/normalize";
import type { LeafField, ListField } from "@/lib/site-content/schema";
import { SiteIcon } from "@/marketing/lib/site-icons";

type Row = Record<string, string>;

function FieldShell({
  id,
  field,
  error,
  counter,
  children,
}: {
  id: string;
  field: { label: string; hint?: string; required?: boolean };
  error?: string;
  counter?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={labelClass}>
          {field.label}
          {field.required ? <span className="ml-0.5 text-danger">*</span> : null}
        </label>
        {counter}
      </div>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1 text-[12px] font-medium text-danger">{error}</p>
      ) : field.hint ? (
        <p className="mt-1 text-[11.5px] leading-relaxed text-dim">{field.hint}</p>
      ) : null}
    </div>
  );
}

function Counter({ value, max }: { value: string; max: number }) {
  const near = value.length > max * 0.9;
  return <span className={`font-mono text-[10.5px] tabular-nums ${value.length > max ? "text-danger" : near ? "text-[#9a5b00]" : "text-dim"}`}>{`${value.length}/${max}`}</span>;
}

const invalid = "border-red-300 hover:border-red-300";

function ImageInput({ id, value, onChange, error }: { id: string; value: string; onChange: (value: string) => void; error?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [picking, setPicking] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.set("file", file);
    const result = await uploadSiteImage(form).catch(() => ({ ok: false as const, message: "The upload failed. Try again." }));
    setUploading(false);
    if (!result.ok) return toast.error(result.message);
    onChange(result.url);
    toast.success("Picture uploaded. Save to publish it.");
  };

  return (
    <div className="flex gap-3">
      <div className="flex h-[76px] w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-s2">
        {value && isValidMedia(value) ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-dim" />}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <input id={id} className={`${input} ${error ? invalid : ""}`} value={value} placeholder="/media/… or https://…" onChange={(event) => onChange(event.target.value)} />
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={btnSecondary} disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <button type="button" className={btnGhost} onClick={() => setPicking((open) => !open)} aria-expanded={picking}>
            Site pictures <ChevronDown className={`h-3.5 w-3.5 transition ${picking ? "rotate-180" : ""}`} />
          </button>
          {value ? (
            <button type="button" className={btnGhost} onClick={() => onChange("")}>
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void upload(file);
            }}
          />
        </div>
        {picking ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {BUILT_IN_IMAGES.map((item) => (
              <button
                key={item.url}
                type="button"
                title={item.label}
                onClick={() => {
                  onChange(item.url);
                  setPicking(false);
                }}
                className={`overflow-hidden rounded-lg border-2 transition ${value === item.url ? "border-blue" : "border-transparent hover:border-blue/40"}`}
              >
                <img src={item.url} alt={item.label} className="aspect-[4/3] w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function VideoInput({ id, value, onChange, error }: { id: string; value: string; onChange: (value: string) => void; error?: string }) {
  const builtIn = BUILT_IN_VIDEOS.find((item) => item.url === value);
  return (
    <div className="flex gap-3">
      <div className="flex h-[76px] w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-s2">
        {value && isValidMedia(value) ? (
          <video key={value} src={value} poster={builtIn?.poster} muted loop playsInline preload="metadata" className="h-full w-full object-cover" onMouseEnter={(e) => void e.currentTarget.play().catch(() => {})} onMouseLeave={(e) => e.currentTarget.pause()} />
        ) : (
          <Film className="h-5 w-5 text-dim" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <select className={input} value={builtIn ? value : value ? "custom" : ""} onChange={(event) => event.target.value !== "custom" && onChange(event.target.value)} aria-label="Site video">
          <option value="">No video</option>
          {BUILT_IN_VIDEOS.map((item) => (
            <option key={item.url} value={item.url}>
              {item.label}
            </option>
          ))}
          <option value="custom" disabled={!value || Boolean(builtIn)}>
            Web address (below)
          </option>
        </select>
        <input id={id} className={`${input} ${error ? invalid : ""}`} value={value} placeholder="https://…/clip.mp4" onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
  );
}

function IconInput({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button id={id} type="button" className={`${input} flex items-center gap-2 text-left`} onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <SiteIcon name={value} className="h-4 w-4 text-[#2f6f57]" />
        <span className="flex-1 capitalize">{value.replace(/-/g, " ") || "Choose an icon"}</span>
        <ChevronDown className={`h-4 w-4 text-dim transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="mt-2 grid grid-cols-8 gap-1 rounded-xl border border-border bg-white p-2 sm:grid-cols-12">
          {SITE_ICON_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              title={name.replace(/-/g, " ")}
              aria-label={name.replace(/-/g, " ")}
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
              className={`flex h-8 items-center justify-center rounded-lg transition ${value === name ? "bg-blue-light text-blue" : "text-mid hover:bg-s2 hover:text-ink"}`}
            >
              <SiteIcon name={name} className="h-4 w-4" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function LeafInput({ field, value, onChange, error }: { field: LeafField; value: string; onChange: (value: string) => void; error?: string }) {
  const id = useId();
  const listId = `${id}-links`;
  switch (field.kind) {
    case "text":
      return (
        <FieldShell id={id} field={field} error={error} counter={<Counter value={value} max={field.max} />}>
          <input id={id} className={`${input} ${error ? invalid : ""}`} value={value} maxLength={field.max} onChange={(event) => onChange(event.target.value)} />
        </FieldShell>
      );
    case "textarea":
    case "lines":
      return (
        <FieldShell id={id} field={field} error={error} counter={<Counter value={value} max={field.max} />}>
          <textarea
            id={id}
            rows={field.kind === "textarea" ? (field.rows ?? 3) : Math.min(8, Math.max(3, value.split("\n").length + 1))}
            className={`${textarea} ${error ? invalid : ""}`}
            value={value}
            maxLength={field.max}
            onChange={(event) => onChange(event.target.value)}
          />
        </FieldShell>
      );
    case "link": {
      const bad = !isValidLink(value.trim());
      return (
        <FieldShell id={id} field={field} error={error ?? (bad ? "Start with /, #, mailto:, tel: or https://" : undefined)}>
          <input id={id} list={listId} className={`${input} ${error || bad ? invalid : ""}`} value={value} placeholder="/membership" onChange={(event) => onChange(event.target.value)} />
          <datalist id={listId}>
            {LINK_SUGGESTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </datalist>
        </FieldShell>
      );
    }
    case "image":
      return (
        <FieldShell id={id} field={field} error={error}>
          <ImageInput id={id} value={value} onChange={onChange} error={error} />
        </FieldShell>
      );
    case "video":
      return (
        <FieldShell id={id} field={field} error={error}>
          <VideoInput id={id} value={value} onChange={onChange} error={error} />
        </FieldShell>
      );
    case "icon":
      return (
        <FieldShell id={id} field={field} error={error}>
          <IconInput id={id} value={value} onChange={onChange} />
        </FieldShell>
      );
  }
}

/** Short fields sit side by side; long text, media and icon pickers take the full width. */
export const isWide = (field: LeafField | ListField) => field.kind === "list" || field.kind === "textarea" || field.kind === "lines" || field.kind === "image" || field.kind === "video";

const emptyRow = (field: ListField): Row => Object.fromEntries(Object.entries(field.item).map(([key, leaf]) => [key, leaf.kind === "icon" ? "check" : ""]));

export function ListInput({
  field,
  rows,
  onChange,
  errors,
  listError,
}: {
  field: ListField;
  rows: Row[];
  onChange: (rows: Row[]) => void;
  errors: (row: number, key: string) => string | undefined;
  listError?: string;
}) {
  const [open, setOpen] = useState<number | null>(rows.length ? null : 0);
  const move = (from: number, to: number) => {
    const next = [...rows];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    onChange(next);
    setOpen(open === from ? to : open);
  };
  const itemEntries = Object.entries(field.item);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className={labelClass}>
          {field.label} <span className="font-mono text-[10.5px] text-dim">{`${rows.length}/${field.max}`}</span>
        </p>
        {field.hint ? <p className="text-[11.5px] text-dim">{field.hint}</p> : null}
      </div>
      {listError ? <p className="mt-1 text-[12px] font-medium text-danger">{listError}</p> : null}
      <ol className="mt-2 space-y-2">
        {rows.map((row, index) => {
          const expanded = open === index;
          const rowHasError = itemEntries.some(([key]) => errors(index, key));
          const title = row[field.itemTitle]?.trim() || "Untitled";
          return (
            <li key={index} className={`rounded-xl border bg-white ${rowHasError ? "border-red-300" : "border-border"}`}>
              <div className="flex items-center gap-2 px-3 py-2">
                <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setOpen(expanded ? null : index)} aria-expanded={expanded}>
                  <span className="font-mono text-[11px] font-semibold text-dim">{String(index + 1).padStart(2, "0")}</span>
                  {"icon" in field.item && row.icon ? <SiteIcon name={row.icon} className="h-3.5 w-3.5 shrink-0 text-[#2f6f57]" /> : null}
                  <span className={`min-w-0 truncate text-[13px] font-semibold ${row[field.itemTitle]?.trim() ? "text-ink" : "text-dim"}`}>{title}</span>
                  {field.itemTitle !== "link" && row.link?.trim() ? <span className="min-w-0 truncate font-mono text-[11px] text-dim">{row.link}</span> : null}
                  <span className="flex-1" />
                  <ChevronDown className={`h-4 w-4 shrink-0 text-dim transition ${expanded ? "rotate-180" : ""}`} />
                </button>
                <div className="flex shrink-0 items-center">
                  <button type="button" className={`${btnGhost} px-1.5`} disabled={index === 0} onClick={() => move(index, index - 1)} aria-label="Move up" title="Move up">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className={`${btnGhost} px-1.5`} disabled={index === rows.length - 1} onClick={() => move(index, index + 1)} aria-label="Move down" title="Move down">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className={`${btnGhost} px-1.5 hover:text-danger`}
                    disabled={rows.length <= field.min}
                    onClick={() => {
                      onChange(rows.filter((_, i) => i !== index));
                      setOpen(null);
                    }}
                    aria-label="Remove"
                    title={rows.length <= field.min ? `Keep at least ${field.min}` : "Remove"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {expanded ? (
                <div className="grid gap-4 border-t border-border px-3 py-3 sm:grid-cols-2">
                  {itemEntries.map(([key, leaf]) => (
                    <div key={key} className={isWide(leaf) ? "sm:col-span-2" : ""}>
                      <LeafInput field={leaf} value={row[key] ?? ""} error={errors(index, key)} onChange={(value) => onChange(rows.map((r, i) => (i === index ? { ...r, [key]: value } : r)))} />
                    </div>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className={`${btnSecondary} mt-2`}
        disabled={rows.length >= field.max}
        onClick={() => {
          onChange([...rows, emptyRow(field)]);
          setOpen(rows.length);
        }}
      >
        <Plus className="h-3.5 w-3.5" /> Add {field.label.toLowerCase().replace(/s$/, "")}
      </button>
    </div>
  );
}
