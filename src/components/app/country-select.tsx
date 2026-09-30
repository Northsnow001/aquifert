"use client";

import * as Flags from "country-flag-icons/react/3x2";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Globe2, Search, X } from "lucide-react";
import { flagCode, type CountryOption } from "@/lib/countries";

const icons = Flags as Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>>;

export function CountryFlag({ code, className = "h-4 w-6" }: { code?: string; className?: string }) {
  const Icon = code ? icons[code] : undefined;
  if (!Icon) {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center rounded-[3px] bg-s2 text-dim ${className}`} aria-hidden>
        <Globe2 className="h-3 w-3" />
      </span>
    );
  }
  return <Icon aria-hidden className={`block shrink-0 rounded-[3px] shadow-[0_0_0_1px_rgb(16_38_59/0.12)] ${className}`} />;
}

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const countryTriggerClass =
  "flex h-11 w-full items-center gap-2.5 rounded-xl border border-border bg-white px-3.5 text-start text-[14px] text-ink shadow-[inset_0_1px_2px_rgb(16_38_59/0.04)] outline-none transition hover:border-[#cdd7e1] focus-visible:border-blue/60 focus-visible:ring-4 focus-visible:ring-blue/10 disabled:cursor-not-allowed disabled:bg-s2 disabled:text-dim";

export function CountrySelect({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = "Select a country",
  clearLabel,
  searchPlaceholder = "Search countries…",
  disabled = false,
  className = countryTriggerClass,
}: {
  id?: string;
  /** Submits the value with a native form under this field name. */
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: CountryOption[];
  placeholder?: string;
  /** Adds a first row that clears the field, e.g. "Any country". */
  clearLabel?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const autoId = useId();
  const triggerId = id ?? `country-${autoId}`;
  const listId = `${triggerId}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const selected = options.find((option) => option.value === value);
  const selectedCode = selected ? selected.code : flagCode(value);

  const rows = useMemo(() => {
    const needle = fold(query.trim());
    const matches = needle
      ? options
          .filter((option) => fold(option.label).includes(needle) || fold(option.value).includes(needle) || option.code?.toLowerCase() === needle)
          .sort((a, b) => Number(fold(b.label).startsWith(needle)) - Number(fold(a.label).startsWith(needle)))
      : options;
    return clearLabel && !needle ? [{ value: "", label: clearLabel } as CountryOption, ...matches] : matches;
  }, [options, query, clearLabel]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function show() {
    if (disabled) return;
    const at = options.findIndex((option) => option.value === value);
    setQuery("");
    setActive(clearLabel ? at + 1 : Math.max(0, at));
    setOpen(true);
  }

  function choose(option: CountryOption) {
    onChange(option.value);
    setOpen(false);
    trigger.current?.focus();
  }

  function onSearchKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(rows.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (rows[active]) choose(rows[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={box} className="relative">
      <button
        ref={trigger}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            show();
          }
        }}
        className={className}
      >
        {value ? <CountryFlag code={selectedCode} /> : <Globe2 className="h-4 w-4 shrink-0 text-dim" aria-hidden />}
        <span className={`min-w-0 flex-1 truncate ${value ? "" : "text-dim"}`}>{value ? (selected?.label ?? value) : placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-dim transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {name ? <input type="hidden" name={name} value={value} /> : null}

      {open ? (
        <div className="aq-drop aq-float absolute inset-x-0 top-[calc(100%+6px)] z-40 min-w-[240px] overflow-hidden rounded-xl border border-border bg-white">
          <div className="relative border-b border-border p-2">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKey}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              aria-controls={listId}
              aria-activedescendant={rows[active] ? `${listId}-${active}` : undefined}
              className="h-9 w-full rounded-lg border border-border bg-s2/60 ps-8 pe-8 text-[13px] outline-none"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute end-4 top-1/2 -translate-y-1/2 rounded p-0.5 text-dim hover:text-ink">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <ul ref={list} id={listId} role="listbox" aria-labelledby={triggerId} className="max-h-64 overflow-y-auto p-1">
            {rows.length === 0 ? <li className="px-3 py-3 text-[13px] text-dim">No country matches “{query}”.</li> : null}
            {rows.map((option, index) => {
              const heading = option.group && option.group !== rows[index - 1]?.group && !query ? option.group : null;
              const isSelected = option.value === value;
              return (
                <li key={`${option.group ?? ""}-${option.value || "clear"}`} role="presentation">
                  {heading ? <p className="px-2.5 pb-1 pt-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-dim">{heading}</p> : null}
                  <div
                    id={`${listId}-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    data-index={index}
                    onMouseEnter={() => setActive(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(option)}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] ${index === active ? "bg-blue-light text-ink" : "text-ink"}`}
                  >
                    {option.value ? <CountryFlag code={option.code} className="h-3.5 w-5" /> : <Globe2 className="h-4 w-5 shrink-0 text-dim" aria-hidden />}
                    <span className={`min-w-0 flex-1 truncate ${option.value ? "" : "text-mid"}`}>{option.label}</span>
                    {isSelected ? <Check className="h-3.5 w-3.5 shrink-0 text-blue" aria-hidden /> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
