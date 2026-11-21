"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteBookRowAction, saveBookRowAction } from "@/app/admin/trade/actions";
import { TradeGrid, Td, Th } from "@/components/admin/trade/live-table";
import { EmptyState, btnDanger, btnPrimary, btnSecondary, input, label, textarea } from "@/components/admin/ui";
import { emptyBookRow, type BookField, type BookRow, type BookSpec } from "@/lib/trade/book";

function cell(row: BookRow, key: string) {
  const v = row[key];
  if (v === true) return "yes";
  if (v === false) return "no";
  if (v == null || v === "") return "—";
  return String(v);
}

function FieldInput({ field, value, onChange }: { field: BookField; value: string; onChange: (v: string) => void }) {
  const id = `book-${field.key}`;
  if (field.type === "textarea") {
    return <textarea id={id} className={textarea} rows={4} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  if (field.type === "checkbox") {
    return (
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4"
        checked={value === "true"}
        onChange={(e) => onChange(e.target.checked ? "true" : "false")}
      />
    );
  }
  if (field.type === "select") {
    return (
      <select id={id} className={input} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {(field.options ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      id={id}
      className={input}
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={value}
      readOnly={field.readonly}
      step={field.type === "number" ? "any" : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function toForm(spec: BookSpec, row: BookRow | "new"): Record<string, string> {
  if (row === "new") return emptyBookRow(spec);
  const form = emptyBookRow(spec);
  for (const field of spec.fields) {
    const v = row[field.key];
    if (field.type === "checkbox") form[field.key] = v === true || v === "true" ? "true" : "false";
    else if (v == null) form[field.key] = "";
    else form[field.key] = String(v);
  }
  return form;
}

export function BookCrud({ spec, initial }: { spec: BookSpec; initial: BookRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState("");
  const [sheet, setSheet] = useState<BookRow | "new" | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyBookRow(spec));
  const listFields = spec.fields.filter((field) => field.list);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return initial;
    return initial.filter((row) =>
      spec.fields.some((field) => cell(row, field.key).toLowerCase().includes(needle)),
    );
  }, [initial, query, spec.fields]);

  const open = (row: BookRow | "new") => {
    setSheet(row);
    setForm(toForm(spec, row));
  };

  const save = () => {
    start(async () => {
      const id = sheet && sheet !== "new" ? String(sheet.id) : null;
      const result = await saveBookRowAction(spec.slug, id, form);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Saved");
      setSheet(null);
      router.refresh();
    });
  };

  const remove = () => {
    if (!sheet || sheet === "new") return;
    if (!window.confirm("Delete this row? This cannot be undone.")) return;
    start(async () => {
      const result = await deleteBookRowAction(spec.slug, String(sheet.id));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Deleted");
      setSheet(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
          <input
            className={`${input} pl-9`}
            placeholder="Search this table"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="button" className={btnPrimary} onClick={() => open("new")}>
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
      <div className="aq-card overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState title={`No ${spec.title.toLowerCase()} yet`} body="Add a row, or import the trade workbook." />
        ) : (
          <TradeGrid>
            <thead>
              <tr>
                {listFields.map((field) => (
                  <Th key={field.key}>{field.label}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={String(row.id)}
                  className="cursor-pointer hover:bg-s2/60"
                  onClick={() => open(row)}
                >
                  {listFields.map((field) => (
                    <Td key={field.key} className={field.key === listFields[0]?.key ? "font-medium" : ""}>
                      {cell(row, field.key)}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </TradeGrid>
        )}
      </div>
      {sheet ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={() => setSheet(null)}>
          <aside
            className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <p className="text-[15px] font-semibold">{sheet === "new" ? `New ${spec.title}` : "Edit row"}</p>
              <button type="button" className={btnSecondary} onClick={() => setSheet(null)} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {spec.fields.map((field) => (
                <div key={field.key}>
                  <label htmlFor={`book-${field.key}`} className={label}>
                    {field.label}
                    {field.required ? " *" : ""}
                  </label>
                  <div className="mt-1.5">
                    <FieldInput
                      field={field}
                      value={form[field.key] ?? ""}
                      onChange={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
              {sheet !== "new" ? (
                <button type="button" className={btnDanger} disabled={pending} onClick={remove}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button type="button" className={btnSecondary} onClick={() => setSheet(null)}>
                  Cancel
                </button>
                <button type="button" className={btnPrimary} disabled={pending} onClick={save}>
                  Save
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
