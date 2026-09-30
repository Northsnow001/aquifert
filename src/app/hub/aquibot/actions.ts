"use server";

import { isAdminUser } from "@/lib/admin-access";
import { planLimit } from "@/lib/aquibot";
import { usageFor, type Usage } from "@/lib/aquibot-engine/chat";
import { deleteSessionRow, engineStatus, getSessionRow, nextMonthStart } from "@/lib/aquibot-engine/store";
import { getHubContent } from "@/lib/hub-content";
import { getSession } from "@/lib/session";

export async function deleteMyAquibotSession(id: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getSession();
  if (!user) return { ok: false, message: "Sign in again to manage your chats." };
  const session = await getSessionRow(String(id));
  if (!session || session.user_id !== user.id) return { ok: false, message: "That chat no longer exists." };
  await deleteSessionRow(session.id);
  return { ok: true };
}

export type AquibotDockState = {
  ready: boolean;
  problem: string | null;
  usage: Usage;
  intro: string;
  isAdmin: boolean;
  firstName: string;
};

export async function getAquibotDockState(): Promise<AquibotDockState | null> {
  const user = await getSession();
  if (!user) return null;
  const config = (await getHubContent()).aquibot;
  const isAdmin = isAdminUser(user);
  const status = await engineStatus();
  const limit = planLimit(config.settings, user.plan ?? "core");
  let usage: Usage = { used: 0, limit, unlimited: isAdmin || limit === 0, resetsOn: nextMonthStart() };
  if (status.ready) {
    try {
      usage = await usageFor({ user, isAdmin }, config);
    } catch {
      // Sending still reports the connection problem.
    }
  }
  return {
    ready: status.ready,
    problem: isAdmin ? status.problem : null,
    usage,
    intro: config.settings.introMessage,
    isAdmin,
    firstName: user.name.trim().split(/\s+/)[0] ?? "",
  };
}
