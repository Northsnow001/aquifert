import "server-only";

import { dataClient, databaseError } from "@/lib/data/db";
import type { TradeAgent } from "@/lib/trade/types";
import { TRADE_AGENTS, defaultPrompt, type TradeAgentKey } from "@/lib/wechat/agent-defs";

function rowFrom(record: Record<string, unknown>): TradeAgent {
  return {
    key: String(record.key ?? ""),
    name: String(record.name ?? ""),
    description: String(record.description ?? ""),
    systemPrompt: String(record.system_prompt ?? ""),
    updatedAt: String(record.updated_at ?? ""),
  };
}

function seed(key: TradeAgentKey): TradeAgent {
  const def = TRADE_AGENTS[key];
  return { key, name: def.name, description: def.description, systemPrompt: defaultPrompt(key), updatedAt: "" };
}

export async function listTradeAgents(): Promise<TradeAgent[]> {
  const keys = Object.keys(TRADE_AGENTS) as TradeAgentKey[];
  const db = dataClient();
  if (!db) return keys.map(seed);
  const { data, error } = await db.from("trade_agents").select("*");
  if (error) {
    if (/relation .*trade_agents.* does not exist/i.test(error.message)) return keys.map(seed);
    throw databaseError("list trade agents", error);
  }
  const byKey = Object.fromEntries((data ?? []).map((row) => [String((row as { key: string }).key), rowFrom(row as Record<string, unknown>)]));
  const toSeed = keys.filter((key) => {
    const stored = byKey[key]?.systemPrompt ?? "";
    const next = defaultPrompt(key);
    return (
      !stored.trim() ||
      (next.length > stored.length * 2 && stored.length < 12_000) ||
      (key === "whatsapp-buyer-onboard" && !stored.includes("Do not assume they are a buyer")) ||
      ((key === "whatsapp-buyer-onboard" || key === "whatsapp-buyer-complete") &&
        stored.toLowerCase().includes("end user")) ||
      (key === "whatsapp-buyer-desk" && (!stored.includes("KNOWN FIELD LOCK") || !stored.includes("NEW REQUEST LOCK")))
    );
  });
  if (toSeed.length) {
    await db.from("trade_agents").upsert(
      toSeed.map((key) => ({
        key,
        name: TRADE_AGENTS[key].name,
        description: TRADE_AGENTS[key].description,
        system_prompt: defaultPrompt(key),
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "key" },
    );
    for (const key of toSeed) byKey[key] = seed(key);
  }
  return keys.map((key) => byKey[key] ?? seed(key));
}

export async function resetTradeAgent(key: string) {
  if (!(key in TRADE_AGENTS)) throw new Error("Unknown agent.");
  const typed = key as TradeAgentKey;
  const def = TRADE_AGENTS[typed];
  const prompt = defaultPrompt(typed);
  await saveTradeAgent(typed, { name: def.name, description: def.description, systemPrompt: prompt });
  return seed(typed);
}

export async function getTradeAgent(key: TradeAgentKey): Promise<TradeAgent> {
  const agents = await listTradeAgents();
  return agents.find((row) => row.key === key) ?? seed(key);
}

export async function saveTradeAgent(key: string, input: { name: string; description: string; systemPrompt: string }) {
  if (!(key in TRADE_AGENTS)) throw new Error("Unknown agent.");
  const db = dataClient();
  if (!db) throw new Error("Supabase is not configured.");
  const { error } = await db.from("trade_agents").upsert(
    {
      key,
      name: input.name.trim() || TRADE_AGENTS[key as TradeAgentKey].name,
      description: input.description.trim(),
      system_prompt: input.systemPrompt.trim(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw databaseError("save trade agent", error);
}
