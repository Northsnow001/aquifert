import { isAdminUser } from "@/lib/admin-access";
import { getSessionRow, sessionMessages } from "@/lib/aquibot-engine/store";
import { getSession } from "@/lib/session";

export async function GET(request: Request, ctx: RouteContext<"/admin/aquibot/sessions/[id]/export">) {
  const user = await getSession();
  if (!user || !isAdminUser(user)) return new Response("Not allowed", { status: 403 });
  const { id } = await ctx.params;
  const session = await getSessionRow(id);
  if (!session) return new Response("Not found", { status: 404 });
  const messages = await sessionMessages(session.id);
  const format = new URL(request.url).searchParams.get("format") === "json" ? "json" : "md";
  const base = `aquibot-${session.created_at.slice(0, 10)}-${session.id.slice(0, 8)}`;

  if (format === "json") {
    return new Response(JSON.stringify({ session, messages }, null, 2), {
      headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="${base}.json"` },
    });
  }

  const lines = [
    `# ${session.title}`,
    "",
    `- Member: ${session.user_name} <${session.user_email}> (${session.user_plan})`,
    `- Started: ${session.created_at}`,
    `- Last active: ${session.updated_at}`,
    session.test_mode ? "- Test prompt session" : "",
    "",
  ].filter((line, index, all) => line || all[index - 1] !== "");
  for (const message of messages) {
    lines.push(`## ${message.role === "user" ? "Member" : "Aquibot"} · ${message.created_at}`, "", message.content, "");
    const sources = message.meta?.sources ?? [];
    if (sources.length) lines.push(`Sources: ${sources.map((source) => source.title).join("; ")}`, "");
  }
  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": `attachment; filename="${base}.md"` },
  });
}
