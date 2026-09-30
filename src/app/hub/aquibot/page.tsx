import { AquibotChat, type ChatMessage, type SessionSummary } from "@/components/hub/aquibot-chat";
import { isAdminUser } from "@/lib/admin-access";
import { planLimit } from "@/lib/aquibot";
import { usageFor, type Usage } from "@/lib/aquibot-engine/chat";
import { engineStatus, getSessionRow, listUserSessions, nextMonthStart, sessionMessages } from "@/lib/aquibot-engine/store";
import { getHubContent } from "@/lib/hub-content";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AquibotPage({ searchParams }: { searchParams: Promise<{ chat?: string; q?: string }> }) {
  const { chat, q } = await searchParams;
  const user = await getSession();
  const config = (await getHubContent()).aquibot;
  const isAdmin = isAdminUser(user);
  const status = await engineStatus();
  const limit = planLimit(config.settings, user?.plan ?? "core");

  let usage: Usage = { used: 0, limit, unlimited: isAdmin || limit === 0, resetsOn: nextMonthStart() };
  let sessions: SessionSummary[] = [];
  let active: { id: string; title: string; messages: ChatMessage[] } | null = null;

  if (status.ready && user) {
    try {
      const actor = { user, isAdmin };
      const [rows, currentUsage] = await Promise.all([listUserSessions(user.id), usageFor(actor, config)]);
      usage = currentUsage;
      sessions = rows.map((row) => ({ id: row.id, title: row.title, updatedAt: row.updated_at }));
      if (chat) {
        const row = await getSessionRow(chat);
        if (row && row.user_id === user.id) {
          const messages = await sessionMessages(row.id);
          active = {
            id: row.id,
            title: row.title,
            messages: messages.map((message) => ({ id: String(message.id), role: message.role, content: message.content, meta: message.meta })),
          };
        }
      }
    } catch {
      // The chat still renders; sending shows the connection problem.
    }
  }

  return (
    <AquibotChat
      key={active?.id ?? `new-${q ?? ""}`}
      draft={active ? "" : (q ?? "").slice(0, 500)}
      sessions={sessions}
      session={active}
      usage={usage}
      intro={config.settings.introMessage}
      engine={{ ready: status.ready, problem: status.problem }}
      isAdmin={isAdmin}
      hasTestPrompt={Boolean(config.prompt.test.trim())}
    />
  );
}
