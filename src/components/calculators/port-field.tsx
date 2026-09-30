"use client";

import { useId, useMemo, useRef, useState } from "react";
import { CountrySelect } from "@/components/app/country-select";
import { FlagMark } from "@/components/calculators/flag-mark";
import { portCountries } from "@/lib/countries";
import { searchPorts, type PortRecord } from "@/lib/ports";

const labelClass = "mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mid";
const countryClass =
  "flex w-full items-center gap-2.5 rounded-lg border border-border bg-white px-3 py-2.5 text-start text-sm text-ink outline-none transition hover:border-[#cdd7e1] focus-visible:border-blue";

const portLabel = (port: PortRecord) => `${port.name} (${port.code})`;

export function PortField({
  label,
  countryLabel,
  value,
  onSelect,
  ports,
}: {
  label: string;
  /** Shows a country dropdown above the port search and narrows it to that country. */
  countryLabel?: string;
  value: PortRecord | null;
  onSelect: (port: PortRecord | null) => void;
  ports: PortRecord[];
}) {
  const id = useId();
  const [country, setCountry] = useState(value?.country ?? "");
  const [query, setQuery] = useState(value ? portLabel(value) : "");
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const countries = useMemo(() => portCountries(ports), [ports]);
  const scoped = useMemo(
    () => (country ? ports.filter((port) => port.country === country).sort((a, b) => a.name.localeCompare(b.name)) : ports),
    [country, ports],
  );
  const typing = query.trim().length >= 2 && !(value && query === portLabel(value));
  const matches = useMemo(() => (typing ? searchPorts(query, scoped, 20) : country ? scoped : []), [typing, query, scoped, country]);
  const countryName = countries.find((option) => option.value === country)?.label ?? country;

  function changeCountry(next: string) {
    setCountry(next);
    if (value && value.country !== next) {
      onSelect(null);
      setQuery("");
    }
    if (next) requestAnimationFrame(() => input.current?.focus());
  }

  return (
    <div className="relative">
      {countryLabel ? (
        <div className="mb-2.5">
          <label htmlFor={`${id}-country`} className={labelClass}>
            {countryLabel}
          </label>
          <CountrySelect
            id={`${id}-country`}
            value={country}
            onChange={changeCountry}
            options={countries}
            clearLabel="All countries"
            placeholder="All countries"
            className={countryClass}
          />
        </div>
      ) : null}
      <label htmlFor={`${id}-port`} className={labelClass}>
        {label}
      </label>
      <span className="relative block">
        <input
          ref={input}
          id={`${id}-port`}
          value={query}
          autoComplete="off"
          placeholder={country ? `Search ports in ${countryName}…` : "Search port, LOCODE, country..."}
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 pr-12 text-sm text-ink outline-none focus:border-blue"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        {value ? (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
            <FlagMark country={value.country} className="h-4 w-6" />
          </span>
        ) : null}
      </span>
      {open && matches.length > 0 ? (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[#2e6da447] bg-white shadow-[0_14px_34px_rgba(26,58,92,0.16)]">
          {country && !typing ? (
            <p className="sticky top-0 border-b border-s3 bg-white px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-dim">
              {matches.length} {matches.length === 1 ? "port" : "ports"} in {countryName}
            </p>
          ) : null}
          {matches.map((port) => (
            <button
              key={port.code}
              type="button"
              className={`flex w-full items-center gap-2 border-b border-s3 px-2.5 py-2 text-left text-xs text-ink last:border-b-0 hover:bg-s2 ${value?.code === port.code ? "bg-blue-light" : ""}`}
              onMouseDown={() => {
                onSelect(port);
                setCountry(port.country);
                setQuery(portLabel(port));
                setOpen(false);
              }}
            >
              <FlagMark country={port.country} className="h-3.5 w-5 shrink-0" />
              <span className="font-medium">{port.name}</span>
              <span className="ml-auto whitespace-nowrap font-mono text-[10px] text-dim">
                {port.code} · {port.country}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
