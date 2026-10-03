import ports from "@/data/ports.json";
import { flagCode } from "@/lib/countries";

export type PortRecord = {
  name: string;
  country: string;
  region: string;
  code: string;
  lat: number;
  lon: number;
  aliases?: string[];
};

/** The canonical seed list. Live pages read the admin-managed registry instead. */
export const PORTS = ports as PortRecord[];

export function searchPorts(query: string, list: PortRecord[] = PORTS, limit = 12): PortRecord[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  return list
    .filter(
      (port) =>
        port.name.toLowerCase().includes(needle) ||
        port.code.toLowerCase().includes(needle) ||
        port.country.toLowerCase().includes(needle) ||
        port.region.toLowerCase().includes(needle) ||
        port.aliases?.some((alias) => alias.toLowerCase().includes(needle)),
    )
    .slice(0, limit);
}

export function findPort(code: string, list: PortRecord[] = PORTS): PortRecord | undefined {
  return list.find((port) => port.code === code);
}

/** True when two country names mean the same place, whether spelled as a world name ("United Kingdom") or as the registry does ("UK"). */
export function sameCountry(a: string, b: string) {
  if (!a || !b) return false;
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return true;
  const code = flagCode(a);
  return Boolean(code && code === flagCode(b));
}

export const portText = (port: PortRecord) => `${port.name} (${port.code}), ${port.country}`;

/** Matches text such as "Mombasa (KEMBA)", "KEMBA" or "Mombasa, Kenya" to a port in the registry. */
export function resolvePort(text: string | undefined, list: PortRecord[]): PortRecord | undefined {
  const value = text?.trim();
  if (!value) return undefined;
  const code = /\(([A-Z]{2}[A-Z0-9]{3})\)/.exec(value)?.[1] ?? (/^[A-Z]{2}[A-Z0-9]{3}$/.test(value) ? value : "");
  if (code) return findPort(code, list);
  const [name, country = ""] = value.split(",").map((part) => part.trim().toLowerCase());
  const named = list.filter((port) => port.name.toLowerCase() === name || port.aliases?.some((alias) => alias.toLowerCase() === name));
  return named.find((port) => !country || sameCountry(port.country, country)) ?? (country ? undefined : named[0]);
}
