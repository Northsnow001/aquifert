import { isAdminUser } from "@/lib/admin-access";
import { listAccessHistory, listBans } from "@/lib/member-access";
import { getSession } from "@/lib/session";

const cell = (raw: string) => {
  const value = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
};

const toCsv = (rows: string[][]) => rows.map((line) => line.map((value) => cell(String(value ?? ""))).join(",")).join("\r\n");

export async function GET(request: Request) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return new Response("Sign in as an admin.", { status: 401 });
  const history = new URL(request.url).searchParams.get("kind") === "history";
  const csv = history
    ? toCsv([["When (UTC)", "Email", "Action", "By", "Reason or note"], ...listAccessHistory().map((event) => [event.at.slice(0, 16).replace("T", " "), event.email, event.action, event.by, event.reason])])
    : toCsv([["Email", "Name", "Reason", "Banned (UTC)", "Banned by"], ...listBans().map((ban) => [ban.email, ban.name, ban.reason, ban.bannedAt.slice(0, 16).replace("T", " "), ban.bannedBy])]);
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="aquifert-${history ? "access-history" : "banned-members"}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
