import ports from "@/data/ports.json";

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
