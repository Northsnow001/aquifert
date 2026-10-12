import { isAdminUser } from "@/lib/admin-access";
import { planName } from "@/lib/aq-modules/types";
import { EMAIL_GROUP_LABEL, EMAIL_TYPE_LABEL } from "@/lib/desk-settings/email-rules";
import { listMembers } from "@/lib/members";
import { getSession } from "@/lib/session";

const cell = (raw: string) => {
  const value = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
};

const toCsv = (rows: string[][]) => rows.map((line) => line.map((value) => cell(String(value ?? ""))).join(",")).join("\r\n");
const stamp = (iso: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : "");

export async function GET(request: Request) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return new Response("Sign in as an admin.", { status: 401 });
  const list = await listMembers();
  if (!list.available) return new Response(list.reason, { status: 503 });
  const type = new URL(request.url).searchParams.get("type");
  const rows = list.members.filter((member) => type !== "work" && type !== "personal" ? true : member.kind.type === type);
  const csv = toCsv([
    ["Email", "Name", "Email type", "Kind", "Domain or provider", "Company", "Country", "Plan", "Joined (UTC)", "Last sign-in (UTC)", "Verified", "Banned"],
    ...rows.map((member) => [
      member.email,
      member.name,
      EMAIL_TYPE_LABEL[member.kind.type],
      EMAIL_GROUP_LABEL[member.kind.group],
      member.kind.source,
      member.company,
      member.country,
      planName(member.plan),
      stamp(member.createdAt),
      stamp(member.lastSignIn),
      member.verified ? "yes" : "no",
      member.banned ? "yes" : "no",
    ]),
  ]);
  const label = type === "work" ? "work-email" : type === "personal" ? "personal-email" : "all";
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="aquifert-members-${label}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
