import { isAdminUser } from "@/lib/admin-access";
import { getFreightDesk } from "@/lib/freight-desk/store";
import { getSession } from "@/lib/session";

const cell = (value: unknown) => {
  const raw = String(value ?? "");
  const text = /^[=+\-@\t\r]/.test(raw) && !/^-?\d+(\.\d+)?$/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export async function GET() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return new Response("Sign in as an admin.", { status: 401 });
  const rows = getFreightDesk().ports.map((port) => [port.code, port.name, port.country, port.region, port.lat, port.lon, port.aliases.join("; "), port.active ? "yes" : "no"]);
  const csv = [["Code", "Name", "Country", "Region", "Latitude", "Longitude", "Aliases", "Active"], ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="aquifert-ports-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
