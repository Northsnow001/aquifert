import type { NextRequest } from "next/server";
import { utcLabel } from "@/components/admin/aq-data/zones";
import { isAdminUser } from "@/lib/admin-access";
import { listRegistrations } from "@/lib/aq-modules/members";
import { getAqModules } from "@/lib/aq-modules/store";
import { getSession } from "@/lib/session";

const cell = (raw: string) => {
  const value = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
};

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return new Response("Sign in as an admin.", { status: 401 });
  const callId = request.nextUrl.searchParams.get("call");
  const [modules, registrations] = await Promise.all([getAqModules(), listRegistrations()]);
  const calls = new Map(modules.calls.map((call) => [call.id, call]));
  const rows = registrations.filter((row) => !callId || row.callId === callId);
  const header = ["Call", "Call starts", "Registered (UTC)", "Name", "Email", "Company", "Country", "Question", "Reminders", "Status"];
  const lines = rows.map((row) => {
    const call = calls.get(row.callId);
    return [
      call?.topic ?? `Removed call (${row.callId})`,
      call ? utcLabel(call.startsAt) : "",
      row.at.slice(0, 16).replace("T", " "),
      row.name,
      row.email,
      row.company,
      row.country,
      row.question,
      row.reminders ? "Yes" : "No",
      row.status === "registered" ? "Registered" : "Cancelled",
    ];
  });
  const csv = [header, ...lines].map((line) => line.map((value) => cell(String(value ?? ""))).join(",")).join("\r\n");
  const name = callId ? `aquifert-call-${callId.replace(/[^\w-]/g, "")}` : "aquifert-call-registrations";
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
