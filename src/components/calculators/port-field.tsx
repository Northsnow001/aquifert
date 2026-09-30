"use client";

import { useMemo, useState } from "react";
import { FlagMark } from "@/components/calculators/flag-mark";
import { searchPorts, type PortRecord } from "@/lib/ports";

export function PortField({
  label,
  value,
  onSelect,
  ports,
}: {
  label: string;
  value: PortRecord | null;
  onSelect: (port: PortRecord) => void;
  ports: PortRecord[];
}) {
  const [query, setQuery] = useState(value ? `${value.name} (${value.code})` : "");
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => searchPorts(query, ports), [query, ports]);

  return (
    <label className="relative block">
      <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-mid">{label}</span>
      <span className="relative block">
        <input
          value={query}
          placeholder="Search port, LOCODE, country..."
          className="w-full rounded-lg border border-border bg-white px-3 py-2.5 pr-12 text-sm text-ink outline-none focus:border-blue"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
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
          {matches.map((port) => (
            <button
              key={port.code}
              type="button"
              className="flex w-full items-center gap-2 border-b border-s3 px-2.5 py-2 text-left text-xs text-ink last:border-b-0 hover:bg-s2"
              onMouseDown={() => {
                onSelect(port);
                setQuery(`${port.name} (${port.code})`);
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
    </label>
  );
}
