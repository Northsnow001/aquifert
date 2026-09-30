"use server";

import { deleteSessionRow, getSessionRow } from "@/lib/aquibot-engine/store";
import { getSession } from "@/lib/session";

export async function deleteMyAquibotSession(id: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getSession();
  if (!user) return { ok: false, message: "Sign in again to manage your chats." };
  const session = await getSessionRow(String(id));
  if (!session || session.user_id !== user.id) return { ok: false, message: "That chat no longer exists." };
  await deleteSessionRow(session.id);
  return { ok: true };
}
