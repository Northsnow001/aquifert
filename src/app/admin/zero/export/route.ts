import { isAdminUser } from "@/lib/admin-access";
import { getSession } from "@/lib/session";
import { ZERO_STATUS_LABEL, listZeroRegistrations } from "@/lib/zero-interest";
import { intentOf, programmeName, ZERO_INTENT_SHORT } from "@/lib/zero-types";

const cell = (raw: string) => {
  const value = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
};

export async function GET() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return new Response("Sign in as an admin.", { status: 401 });
  const header = [
    "Registered (UTC)",
    "Request",
    "Name",
    "Email",
    "Company",
    "Programme",
    "Annual volume (MT)",
    "Primary product",
    "Preferred call day",
    "Preferred call time",
    "Time zone",
    "Phone",
    "Notes",
    "Status",
    "Admin note",
  ];
  const rows = (await listZeroRegistrations()).map((row) => [
    row.at.slice(0, 16).replace("T", " "),
    ZERO_INTENT_SHORT[intentOf(row)],
    row.name,
    row.email,
    row.company,
    programmeName(row.programme),
    row.annualVolume,
    row.product,
    row.callDate ?? "",
    row.callWindow ?? "",
    row.timezone ?? "",
    row.phone ?? "",
    row.notes,
    ZERO_STATUS_LABEL[row.status] ?? row.status,
    row.adminNote,
  ]);
  const csv = [header, ...rows].map((line) => line.map((value) => cell(String(value ?? ""))).join(",")).join("\r\n");
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="aquifert-zero-interest-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
