"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminUser } from "@/lib/admin-access";
import { getSession } from "@/lib/session";
import { inviteBuyerById, inviteBuyersWaiting, inviteSupplierById, inviteSuppliersWaiting } from "@/lib/trade/invite";
import { deleteBookRow, deleteBookRows, saveBookRow } from "@/lib/trade/book-store";
import {
  deleteTradeBuyers,
  deleteTradeSuppliers,
  findRfqIdByCode,
  getTradeRfqDesk,
  insertTradeBuyer,
  insertTradeSupplier,
  listTradeRfqs,
  listTradeThread,
  listWechatThread,
  updateTradeBuyer,
  updateTradeSupplier,
} from "@/lib/trade/store";
import { generateDevSupplierQuotes } from "@/lib/trade/dev-quotes";
import { tradeDevToolsEnabled } from "@/lib/trade/trade-dev";
import { dealsForBuyer, mergeBuyerAudit } from "@/lib/desk-hitl/audit";
import { listDeskDeals } from "@/lib/desk-hitl/store";
import { fanOutBuyerRfq } from "@/lib/wechat/fanout";
import type { TradeBuyerDraft, TradeSupplierDraft } from "@/lib/trade/types";
import { resetTradeAgent, saveTradeAgent } from "@/lib/wechat/agent-store";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdminUser(user)) redirect("/login");
  return user;
}

function refresh() {
  revalidatePath("/admin/trade", "layout");
}

function parseDraft(input: TradeSupplierDraft) {
  const companyName = input.companyName?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  if (!companyName) return { ok: false as const, error: "Company name is required." };
  if (!email || !email.includes("@")) return { ok: false as const, error: "A valid email is required so we can send the WeChat invite." };
  return { ok: true as const, draft: { ...input, companyName, email } };
}

export async function createSupplierAction(input: TradeSupplierDraft) {
  await requireAdmin();
  const parsed = parseDraft(input);
  if (!parsed.ok) return parsed;
  try {
    const row = await insertTradeSupplier(parsed.draft);
    let invited = false;
    let inviteError: string | undefined;
    if (input.inviteNow && !row.wechatOpenid) {
      const result = await inviteSupplierById(row.id);
      invited = result.ok;
      inviteError = result.ok ? undefined : result.error;
    }
    refresh();
    return { ok: true as const, id: row.id, invited, inviteError };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not save the supplier." };
  }
}

export async function updateSupplierAction(id: string, input: TradeSupplierDraft) {
  await requireAdmin();
  const parsed = parseDraft(input);
  if (!parsed.ok) return parsed;
  try {
    await updateTradeSupplier(id, parsed.draft);
    refresh();
    return { ok: true as const, id };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not update the supplier." };
  }
}

export async function inviteSupplierAction(id: string) {
  await requireAdmin();
  try {
    const result = await inviteSupplierById(id);
    refresh();
    return result;
  } catch (error) {
    return {
      supplierId: id,
      email: "",
      ok: false,
      reusedToken: false,
      error: error instanceof Error ? error.message : "Invite failed.",
    };
  }
}

export async function getBuyerThreadAction(input: { buyerId?: string; phone?: string; email?: string }) {
  await requireAdmin();
  try {
    const messages = await listTradeThread({ channel: "whatsapp", buyerId: input.buyerId, address: input.phone });
    const deals = dealsForBuyer(await listDeskDeals(), input.phone || "", input.email || "");
    return { ok: true as const, lines: mergeBuyerAudit(messages, deals), messages };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not load the conversation.",
      lines: [],
      messages: [],
    };
  }
}

function parseBuyerDraft(input: TradeBuyerDraft) {
  const companyName = input.companyName?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  if (!companyName) return { ok: false as const, error: "Company name is required." };
  if (!email || !email.includes("@")) return { ok: false as const, error: "A valid email is required so we can send the WhatsApp invite." };
  return { ok: true as const, draft: { ...input, companyName, email } };
}

export async function createBuyerAction(input: TradeBuyerDraft) {
  await requireAdmin();
  const parsed = parseBuyerDraft(input);
  if (!parsed.ok) return parsed;
  try {
    const row = await insertTradeBuyer(parsed.draft);
    let invited = false;
    let inviteError: string | undefined;
    if (input.inviteNow) {
      const result = await inviteBuyerById(row.id);
      invited = result.ok;
      inviteError = result.ok ? undefined : result.error;
    }
    refresh();
    return { ok: true as const, id: row.id, invited, inviteError };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not save the buyer." };
  }
}

export async function updateBuyerAction(id: string, input: TradeBuyerDraft) {
  await requireAdmin();
  const parsed = parseBuyerDraft(input);
  if (!parsed.ok) return parsed;
  try {
    await updateTradeBuyer(id, parsed.draft);
    refresh();
    return { ok: true as const, id };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not update the buyer." };
  }
}

export async function inviteBuyerAction(id: string) {
  await requireAdmin();
  try {
    const result = await inviteBuyerById(id);
    refresh();
    return result;
  } catch (error) {
    return { buyerId: id, email: "", ok: false, error: error instanceof Error ? error.message : "Invite failed." };
  }
}

export async function inviteAllBuyersAction() {
  await requireAdmin();
  try {
    const batch = await inviteBuyersWaiting();
    refresh();
    return batch;
  } catch (error) {
    return { results: [], truncated: false, error: error instanceof Error ? error.message : "Invite failed." };
  }
}

export async function getSupplierThreadAction(input: { supplierId?: string; openid?: string }) {
  await requireAdmin();
  try {
    const messages = await listWechatThread({ supplierId: input.supplierId, openid: input.openid });
    return { ok: true as const, messages };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not load the conversation.", messages: [] };
  }
}

export async function saveTradeAgentAction(input: { key: string; name: string; description: string; systemPrompt: string }) {
  await requireAdmin();
  if (!input.systemPrompt.trim()) return { ok: false as const, error: "The prompt cannot be empty." };
  try {
    await saveTradeAgent(input.key, input);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not save the agent." };
  }
}

export async function resetTradeAgentAction(key: string) {
  await requireAdmin();
  try {
    const agent = await resetTradeAgent(key);
    refresh();
    return { ok: true as const, agent };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not restore the workflow prompt." };
  }
}

export async function saveBookRowAction(slug: string, id: string | null, input: Record<string, string>) {
  await requireAdmin();
  try {
    const row = await saveBookRow(slug, id, input);
    refresh();
    return { ok: true as const, id: row.id };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not save the row." };
  }
}

export async function deleteBookRowAction(slug: string, id: string) {
  await requireAdmin();
  try {
    await deleteBookRow(slug, id);
    refresh();
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not delete the row." };
  }
}

export async function deleteBookRowsAction(slug: string, ids: string[]) {
  await requireAdmin();
  try {
    const deleted = await deleteBookRows(slug, ids);
    refresh();
    return { ok: true as const, deleted };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not delete the rows." };
  }
}

export async function deleteBuyersAction(ids: string[]) {
  await requireAdmin();
  try {
    const deleted = await deleteTradeBuyers(ids);
    refresh();
    return { ok: true as const, deleted };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not delete the buyers." };
  }
}

export async function deleteSuppliersAction(ids: string[]) {
  await requireAdmin();
  try {
    const deleted = await deleteTradeSuppliers(ids);
    refresh();
    return { ok: true as const, deleted };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not delete the suppliers." };
  }
}

export async function getRfqDeskAction(id: string) {
  await requireAdmin();
  try {
    const desk = await getTradeRfqDesk(id);
    if (!desk) return { ok: false as const, error: "Buyer request not found." };
    return { ok: true as const, desk, devTools: tradeDevToolsEnabled() };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not load this trade." };
  }
}

export async function fanOutRfqAction(id: string, resendFailed = false) {
  await requireAdmin();
  try {
    const result = await fanOutBuyerRfq(id, { resendFailed });
    refresh();
    return { ok: true as const, ...result };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not send this request to suppliers." };
  }
}

export async function listDevQuoteRfqsAction() {
  await requireAdmin();
  if (!tradeDevToolsEnabled()) return { ok: true as const, enabled: false as const, rfqs: [] };
  try {
    const rows = await listTradeRfqs();
    return {
      ok: true as const,
      enabled: true as const,
      rfqs: rows.slice(0, 80).map((row) => ({
        id: row.id,
        code: row.code,
        productLabel: row.productLabel,
        readyQuoteCount: row.readyQuoteCount,
        status: row.status,
      })),
    };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not load buyer requests." };
  }
}

export async function generateDevQuotesAction(rfqRef: string, addCount: number) {
  await requireAdmin();
  if (!tradeDevToolsEnabled()) return { ok: false as const, error: "Dev quote tools are off. Unset TRADE_DEV_TOOLS or set it to 1." };
  const raw = rfqRef.trim();
  if (!raw) return { ok: false as const, error: "Pick a buyer request (for example rfq#078) so the dummy quotes can be tied to it." };
  try {
    const rfqId = /^[0-9a-f-]{36}$/i.test(raw) ? raw : (await findRfqIdByCode(raw));
    if (!rfqId) return { ok: false as const, error: `No buyer request matches ${raw}.` };
    const result = await generateDevSupplierQuotes(rfqId, addCount);
    refresh();
    revalidatePath("/admin/trade/quotes");
    revalidatePath("/admin/desk");
    return { ok: true as const, ...result };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not generate supplier quotes." };
  }
}

export async function inviteAllWaitingAction() {
  await requireAdmin();
  try {
    const batch = await inviteSuppliersWaiting();
    refresh();
    return batch;
  } catch (error) {
    return {
      results: [],
      truncated: false,
      error: error instanceof Error ? error.message : "Invite failed.",
    };
  }
}
