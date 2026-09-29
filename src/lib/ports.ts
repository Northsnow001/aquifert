import ports from "@/data/ports.json";

export type PortRecord = {
  name: string;
  country: string;
  region: string;
  code: string;
  lat: number;
  lon: number;
};

export const PORTS = ports as PortRecord[];

export function searchPorts(query: string, limit = 12): PortRecord[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  return PORTS.filter(
    (port) =>
      port.name.toLowerCase().includes(needle) ||
      port.code.toLowerCase().includes(needle) ||
      port.country.toLowerCase().includes(needle) ||
      port.region.toLowerCase().includes(needle),
  ).slice(0, limit);
}

export function findPort(code: string): PortRecord | undefined {
  return PORTS.find((port) => port.code === code);
}
