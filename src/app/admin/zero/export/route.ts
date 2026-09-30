import { isAdminUser } from "@/lib/admin-access";
import { getSession } from "@/lib/session";
import { ZERO_STATUS_LABEL, listZeroRegistrations } from "@/lib/zero-interest";

const cell = (raw: string) => {
  const value = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
};

export async function GET() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return new Response("Sign in as an admin.", { status: 401 });
  const header = ["Registered (UTC)", "Name", "Email", "Company", "Annual volume (MT)", "Primary product", "Notes", "Status", "Admin note"];
  const rows = (await listZeroRegistrations()).map((row) => [row.at.slice(0, 16).replace("T", " "), row.name, row.email, row.company, row.annualVolume, row.product, row.notes, ZERO_STATUS_LABEL[row.status], row.adminNote]);
  const csv = [header, ...rows].map((line) => line.map((value) => cell(String(value ?? ""))).join(",")).join("\r\n");
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="aquifert-zero-interest-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
