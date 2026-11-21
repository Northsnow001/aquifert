"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Columns3, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteBookRowAction, deleteBookRowsAction, saveBookRowAction } from "@/app/admin/trade/actions";
import { TradeGrid, Td, Th } from "@/components/admin/trade/live-table";
import { EmptyState, btnDanger, btnPrimary, btnSecondary, field, input, label, textarea } from "@/components/admin/ui";
import { emptyBookRow, type BookField, type BookRow, type BookSpec } from "@/lib/trade/book";

const PAGE_SIZES = [25, 50, 100, 200];
const checkClass = "h-4 w-4 shrink-0 rounded border-border text-blue";

function cell(row: BookRow, key: string) {
  const v = row[key];
  if (v === true) return "yes";
  if (v === false) return "no";
  if (v == null || v === "") return "—";
  const text = String(v);
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
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
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [colsOpen, setColsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<BookRow | "new" | null>(null);
  const [form, setForm] = useState<Record<string, string>>(emptyBookRow(spec));
  const tableFields = spec.fields;
  const filterFields = useMemo(() => {
    const rank = (key: string) =>
      key === "status" ? 0 : key === "kind" ? 1 : key === "source_channel" ? 2 : key === "shipment_type" ? 3 : 8;
    return tableFields
      .filter((item) => item.type === "select" && item.options?.length && item.key !== "margin_type")
      .filter((item) => {
        const values = new Set(initial.map((row) => String(row[item.key] ?? "")).filter(Boolean));
        return values.size > 1;
      })
      .sort((a, b) => rank(a.key) - rank(b.key))
      .slice(0, 3);
  }, [initial, tableFields]);
  const visibleFields = tableFields.filter((field) => !hidden.has(field.key));
  const storageKey = `aq-book-cols:${spec.slug}`;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const keys = JSON.parse(raw) as string[];
      if (Array.isArray(keys)) setHidden(new Set(keys));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify([...hidden]));
  }, [hidden, storageKey]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return initial.filter((row) => {
      for (const [key, value] of Object.entries(filters)) {
        if (value && cell(row, key) !== value && String(row[key] ?? "") !== value) return false;
      }
      if (!needle) return true;
      return tableFields.some((field) => cell(row, field.key).toLowerCase().includes(needle));
    });
  }, [initial, query, filters, tableFields]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageIds = pageRows.map((row) => String(row.id));
  const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
  const allPageSelected = pageIds.length > 0 && selectedOnPage === pageIds.length;

  const toggleOne = (id: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const togglePage = (on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

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
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(String(sheet.id));
        return next;
      });
      setSheet(null);
      router.refresh();
    });
  };

  const removeSelected = () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} row${ids.length === 1 ? "" : "s"}? This cannot be undone.`)) return;
    start(async () => {
      const result = await deleteBookRowsAction(spec.slug, ids);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Deleted ${result.deleted} row${result.deleted === 1 ? "" : "s"}`);
      setSelected(new Set());
      setSheet(null);
      router.refresh();
    });
  };

  return (
    <>
      <div className="mb-4 flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
        <div className="relative min-w-[160px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dim" />
          <input
            className={`${input} pl-9`}
            placeholder="Search all columns"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {filterFields.map((item) => (
          <select
            key={item.key}
            className={`${field} h-9 w-max max-w-[10.5rem] shrink-0`}
            value={filters[item.key] ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              setFilters((prev) => {
                const next = { ...prev };
                if (value) next[item.key] = value;
                else delete next[item.key];
                return next;
              });
              setPage(1);
            }}
            aria-label={`Filter ${item.label}`}
          >
            <option value="">{item.label}</option>
            {item.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        ))}
        <div className="relative ml-auto flex shrink-0 items-center gap-2">
          <button type="button" className={btnSecondary} onClick={() => setColsOpen((isOpen) => !isOpen)}>
            <Columns3 className="h-4 w-4" />
            Columns
          </button>
          {colsOpen ? (
            <div className="absolute right-0 top-full z-30 mt-2 max-h-80 w-72 overflow-y-auto rounded-xl border border-border bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[12px] font-semibold text-mid">Show columns</p>
                <button type="button" className="text-[12px] font-semibold text-blue" onClick={() => setHidden(new Set())}>
                  Show all
                </button>
              </div>
              {tableFields.map((field) => (
                <label key={field.key} className="flex cursor-pointer items-center gap-2 py-1 text-[13px] text-ink">
                  <input
                    type="checkbox"
                    className={checkClass}
                    checked={!hidden.has(field.key)}
                    onChange={(e) => {
                      setHidden((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.delete(field.key);
                        else next.add(field.key);
                        return next;
                      });
                    }}
                  />
                  {field.label}
                </label>
              ))}
            </div>
          ) : null}
          {selected.size > 0 ? (
            <button type="button" className={btnDanger} disabled={pending} onClick={removeSelected}>
              <Trash2 className="h-4 w-4" />
              Delete {selected.size}
            </button>
          ) : null}
          <button type="button" className={btnPrimary} onClick={() => open("new")}>
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>
      <div className="aq-card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState title={`No ${spec.title.toLowerCase()} yet`} body="Add a row, or import the trade workbook." />
        ) : (
          <TradeGrid>
            <thead>
              <tr>
                <Th className="sticky left-0 z-10 w-10 bg-[#f7f9fb]">
                  <input
                    type="checkbox"
                    className={checkClass}
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = selectedOnPage > 0 && !allPageSelected;
                    }}
                    onChange={(e) => togglePage(e.target.checked)}
                    aria-label="Select all rows on this page"
                  />
                </Th>
                {visibleFields.map((field) => (
                  <Th key={field.key} className="whitespace-nowrap">
                    {field.label}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const id = String(row.id);
                const on = selected.has(id);
                return (
                  <tr
                    key={id}
                    className={`cursor-pointer hover:bg-s2/60 ${on ? "bg-blue/[.06]" : ""}`}
                    onClick={() => open(row)}
                  >
                    <Td className="sticky left-0 z-10 w-10 bg-white" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className={checkClass}
                        checked={on}
                        onChange={(e) => toggleOne(id, e.target.checked)}
                        aria-label={`Select ${cell(row, visibleFields[0]?.key ?? "id")}`}
                      />
                    </Td>
                    {visibleFields.map((field) => (
                      <Td key={field.key} className={`max-w-[240px] truncate ${field.key === visibleFields[0]?.key ? "font-medium" : ""}`}>
                        {cell(row, field.key)}
                      </Td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </TradeGrid>
        )}
        {filtered.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 text-[13px] text-mid">
            <p>
              {filtered.length} row{filtered.length === 1 ? "" : "s"}
              {visibleFields.length ? ` · ${visibleFields.length} columns` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className={`${input} h-8 w-auto`}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                aria-label="Rows per page"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
              <button type="button" className={btnSecondary} disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>
                Page {safePage} of {pageCount}
              </span>
              <button
                type="button"
                className={btnSecondary}
                disabled={safePage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
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
