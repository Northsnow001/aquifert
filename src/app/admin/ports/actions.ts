"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { countryCode } from "@/lib/flags";
import { resetPortsToSeed, updateFreightDesk } from "@/lib/freight-desk/store";
import { REGIONS, type PortEntry } from "@/lib/freight-desk/types";
import { getSession } from "@/lib/session";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) redirect("/login");
  return user;
}

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/hub", "layout");
}

type Result<T = object> = ({ ok: true } & T) | { ok: false; message: string };

const text = (value: unknown, max: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const coordinate = (value: unknown) => Math.round(Number(value) * 10_000) / 10_000;

function cleanPort(input: PortEntry): PortEntry | string {
  const name = text(input.name, 80);
  const country = text(input.country, 60);
  const code = text(input.code, 8).toUpperCase().replace(/\s/g, "");
  const lat = coordinate(input.lat);
  const lon = coordinate(input.lon);
  if (!name) return "Give the port a name.";
  if (!country) return "Choose the country.";
  if (!(REGIONS as readonly string[]).includes(input.region)) return "Choose a trading region.";
  if (!/^[A-Z0-9]{4,8}$/.test(code)) return "The code must be 4 to 8 letters or digits, usually a 5-character UN/LOCODE.";
  if (!Number.isFinite(lat) || Math.abs(lat) > 90) return "Latitude must be between -90 and 90.";
  if (!Number.isFinite(lon) || Math.abs(lon) > 180) return "Longitude must be between -180 and 180.";
  if (lat === 0 && lon === 0) return "Enter the port's coordinates.";
  const aliases = Array.from(
    new Set((Array.isArray(input.aliases) ? input.aliases : []).map((alias) => text(alias, 60)).filter((alias) => alias && alias.toLowerCase() !== name.toLowerCase())),
  ).slice(0, 12);
  return { code, name, country, region: input.region, lat, lon, aliases, active: input.active !== false };
}

export async function savePort(input: PortEntry, originalCode?: string): Promise<Result<{ port: PortEntry; warning?: string }>> {
  await requireAdmin();
  const port = cleanPort(input);
  if (typeof port === "string") return { ok: false, message: port };
  const out: { error?: string } = {};
  await updateFreightDesk((desk) => {
    const existing = originalCode ? desk.ports.find((item) => item.code === originalCode) : undefined;
    if (originalCode && !existing) {
      out.error = `${originalCode} is no longer in the registry. Reload and try again.`;
      return;
    }
    if (port.code !== originalCode && desk.ports.some((item) => item.code === port.code)) {
      out.error = `${port.code} is already in the registry.`;
      return;
    }
    desk.ports = existing ? desk.ports.map((item) => (item === existing ? port : item)) : [...desk.ports, port].sort((a, b) => a.name.localeCompare(b.name));
    if (existing && existing.code !== port.code) {
      desk.fixtures = desk.fixtures.map((fixture) =>
        fixture.loadCode === existing.code || fixture.dischargeCode === existing.code
          ? {
              ...fixture,
              loadCode: fixture.loadCode === existing.code ? port.code : fixture.loadCode,
              dischargeCode: fixture.dischargeCode === existing.code ? port.code : fixture.dischargeCode,
              updatedAt: new Date().toISOString(),
            }
          : fixture,
      );
    }
  });
  if (out.error) return { ok: false, message: out.error };
  refresh();
  const iso = countryCode(port.country);
  const warning = iso && !port.code.startsWith(iso) ? `Saved. Note that ${port.country} codes normally start with ${iso}.` : undefined;
  return { ok: true, port, warning };
}

export async function setPortsActive(codes: string[], active: boolean): Promise<Result<{ count: number }>> {
  await requireAdmin();
  const selected = new Set(codes);
  let count = 0;
  await updateFreightDesk((desk) => {
    desk.ports = desk.ports.map((port) => {
      if (!selected.has(port.code) || port.active === active) return port;
      count += 1;
      return { ...port, active };
    });
  });
  refresh();
  return { ok: true, count };
}

export async function setPortsRegion(codes: string[], region: string): Promise<Result<{ count: number }>> {
  await requireAdmin();
  if (!(REGIONS as readonly string[]).includes(region)) return { ok: false, message: "Choose a trading region." };
  const selected = new Set(codes);
  let count = 0;
  await updateFreightDesk((desk) => {
    desk.ports = desk.ports.map((port) => {
      if (!selected.has(port.code) || port.region === region) return port;
      count += 1;
      return { ...port, region };
    });
  });
  refresh();
  return { ok: true, count };
}

export async function deletePorts(codes: string[]): Promise<Result<{ count: number }>> {
  await requireAdmin();
  const selected = new Set(codes);
  let count = 0;
  await updateFreightDesk((desk) => {
    const keep = desk.ports.filter((port) => !selected.has(port.code));
    count = desk.ports.length - keep.length;
    desk.ports = keep;
  });
  refresh();
  return { ok: true, count };
}

export async function resetPortsFromSeed(): Promise<Result<{ count: number }>> {
  await requireAdmin();
  const count = await resetPortsToSeed();
  refresh();
  return { ok: true, count };
}
