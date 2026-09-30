"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Save, X } from "lucide-react";
import { toast } from "sonner";
import { savePort } from "@/app/admin/ports/actions";
import { FlagMark } from "@/components/calculators/flag-mark";
import { btnPrimary, btnSecondary, field, label } from "@/components/admin/ui";
import { countryCode } from "@/lib/flags";
import { CODE_PATTERN, locationProblem } from "@/lib/freight-desk/port-quality";
import { REGIONS, type PortEntry } from "@/lib/freight-desk/types";

type Draft = { code: string; name: string; country: string; region: string; lat: string; lon: string; aliases: string; active: boolean };

const toDraft = (port: PortEntry | null): Draft =>
  port
    ? { code: port.code, name: port.name, country: port.country, region: port.region, lat: String(port.lat), lon: String(port.lon), aliases: port.aliases.join(", "), active: port.active }
    : { code: "", name: "", country: "", region: "", lat: "", lon: "", aliases: "", active: true };

function mapUrl(lat: number, lon: number) {
  const span = 0.6;
  const bbox = [lon - span, lat - span / 2, lon + span, lat + span / 2].map((value) => value.toFixed(4)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(4)},${lon.toFixed(4)}`;
}

export function PortEditor({
  port,
  countries,
  fixtureRefs,
  onClose,
}: {
  port: PortEntry | null;
  countries: string[];
  fixtureRefs: number;
  onClose: (saved: boolean) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(port));
  const [saving, start] = useTransition();
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const lat = Number(draft.lat);
  const lon = Number(draft.lon);
  const hasCoords = draft.lat.trim() !== "" && draft.lon.trim() !== "" && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  const iso = countryCode(draft.country);
  const code = draft.code.trim().toUpperCase();
  const checks: string[] = [];
  if (code && !CODE_PATTERN.test(code)) checks.push("UN/LOCODEs are normally 5 characters: a 2-letter country and 3 letters or digits.");
  if (code && iso && !code.startsWith(iso)) checks.push(`${draft.country} codes start with ${iso}.`);
  if (draft.country && !iso) checks.push("This country has no flag mapping, so the flag and code checks are skipped.");
  if (hasCoords && draft.region && locationProblem({ lat, lon, region: draft.region }) === "region") checks.push(`These coordinates sit outside ${draft.region}.`);
  const codeChanged = Boolean(port && code && code !== port.code);

  const submit = () =>
    start(async () => {
      const result = await savePort(
        {
          code,
          name: draft.name,
          country: draft.country,
          region: draft.region,
          lat,
          lon,
          aliases: draft.aliases.split(/[,;\n]/).map((alias) => alias.trim()).filter(Boolean),
          active: draft.active,
        },
        port?.code,
      );
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      if (result.warning) toast.warning(result.warning);
      else toast.success(port ? `${result.port.name} saved.` : `${result.port.name} added to the registry.`);
      onClose(true);
    });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/25 backdrop-blur-[1px]" onMouseDown={(event) => event.target === event.currentTarget && onClose(false)}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={port ? `Edit ${port.name}` : "Add a port"}
        className="flex h-full w-full max-w-[480px] flex-col bg-surface shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {draft.country ? <FlagMark country={draft.country} className="h-4 w-6 shrink-0" /> : null}
            <h2 className="truncate text-[16px] font-bold text-ink">{port ? draft.name || port.name : "Add a port"}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={() => onClose(false)} className="rounded-md p-1.5 text-dim hover:bg-s2 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div>
            <label htmlFor="port-name" className={label}>
              Port name
            </label>
            <input id="port-name" required value={draft.name} onChange={(event) => set("name", event.target.value)} className={`${field} mt-1.5 h-10 w-full`} maxLength={80} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="port-country" className={label}>
                Country
              </label>
              <input id="port-country" required list="port-countries" value={draft.country} onChange={(event) => set("country", event.target.value)} className={`${field} mt-1.5 h-10 w-full`} maxLength={60} />
              <datalist id="port-countries">
                {countries.map((country) => (
                  <option key={country} value={country} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="port-code" className={label}>
                UN/LOCODE
              </label>
              <input
                id="port-code"
                required
                value={draft.code}
                onChange={(event) => set("code", event.target.value.toUpperCase())}
                placeholder={iso ? `${iso}XXX` : "NLRTM"}
                className={`${field} mt-1.5 h-10 w-full font-mono uppercase`}
                maxLength={8}
              />
            </div>
          </div>
          <div>
            <label htmlFor="port-region" className={label}>
              Trading region
            </label>
            <select id="port-region" required value={draft.region} onChange={(event) => set("region", event.target.value)} className={`${field} mt-1.5 h-10 w-full`}>
              <option value="" disabled>
                Choose a region
              </option>
              {REGIONS.map((region) => (
                <option key={region}>{region}</option>
              ))}
            </select>
            <p className="mt-1 text-[11.5px] text-dim">Drives the region premium, fixture matching and the route type.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="port-lat" className={label}>
                Latitude
              </label>
              <input id="port-lat" required type="number" step="any" min={-90} max={90} value={draft.lat} onChange={(event) => set("lat", event.target.value)} className={`${field} mt-1.5 h-10 w-full font-mono`} />
            </div>
            <div>
              <label htmlFor="port-lon" className={label}>
                Longitude
              </label>
              <input id="port-lon" required type="number" step="any" min={-180} max={180} value={draft.lon} onChange={(event) => set("lon", event.target.value)} className={`${field} mt-1.5 h-10 w-full font-mono`} />
            </div>
          </div>

          {hasCoords ? (
            <div className="overflow-hidden rounded-xl border border-border">
              <iframe title="Port location" src={mapUrl(lat, lon)} className="h-48 w-full" loading="lazy" />
              <a
                href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=11/${lat}/${lon}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between border-t border-border px-3 py-2 text-[12px] font-semibold text-blue no-underline hover:bg-s2"
              >
                Open in OpenStreetMap
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-[12.5px] text-dim">Enter coordinates to see the port on a map.</p>
          )}

          <div>
            <label htmlFor="port-aliases" className={label}>
              Other names <span className="normal-case tracking-normal text-dim">(comma separated)</span>
            </label>
            <input id="port-aliases" value={draft.aliases} onChange={(event) => set("aliases", event.target.value)} placeholder="e.g. Bombay, Nhava Sheva" className={`${field} mt-1.5 h-10 w-full`} />
            <p className="mt-1 text-[11.5px] text-dim">Members can search by these, and fixtures quoting them match this port.</p>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3.5 py-3">
            <span>
              <span className="block text-[13px] font-semibold text-ink">Live on the hub</span>
              <span className="block text-[12px] text-dim">Inactive ports stay here but members cannot pick them.</span>
            </span>
            <input type="checkbox" checked={draft.active} onChange={(event) => set("active", event.target.checked)} className="h-5 w-5 accent-[var(--color-blue)]" />
          </label>

          {checks.length ? (
            <ul className="space-y-1.5 rounded-xl border border-[#f5dfb3] bg-[#fffaf0] px-3.5 py-3 text-[12.5px] text-[#9a5b00]">
              {checks.map((check) => (
                <li key={check} className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {check}
                </li>
              ))}
            </ul>
          ) : code && draft.region && hasCoords ? (
            <p className="flex items-center gap-2 rounded-xl border border-[#cdebd8] bg-[#f1faf4] px-3.5 py-2.5 text-[12.5px] font-medium text-[#1f7a45]">
              <CheckCircle2 className="h-4 w-4" />
              Code, country and region checks pass.
            </p>
          ) : null}
          {codeChanged && fixtureRefs ? (
            <p className="text-[12px] text-mid">
              {fixtureRefs} {fixtureRefs === 1 ? "fixture uses" : "fixtures use"} {port?.code}. They move to {code} automatically.
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
          <button type="button" className={btnSecondary} onClick={() => onClose(false)}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : port ? "Save port" : "Add port"}
          </button>
        </div>
      </form>
    </div>
  );
}
