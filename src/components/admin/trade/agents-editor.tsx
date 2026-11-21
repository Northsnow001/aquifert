"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveTradeAgentAction } from "@/app/admin/trade/actions";
import { btnPrimary, btnSecondary, input, label, textarea } from "@/components/admin/ui";
import type { TradeAgent } from "@/lib/trade/types";

export function AgentsEditor({ initial }: { initial: TradeAgent[] }) {
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState(initial[0]?.key ?? "");
  const [drafts, setDrafts] = useState<Record<string, TradeAgent>>(() => Object.fromEntries(initial.map((row) => [row.key, row])));
  const agent = drafts[selected];

  const save = () => {
    if (!agent) return;
    start(async () => {
      const result = await saveTradeAgentAction({
        key: agent.key,
        name: agent.name,
        description: agent.description,
        systemPrompt: agent.systemPrompt,
      });
      if (result.ok) toast.success(`Saved ${agent.name}`);
      else toast.error(result.error);
    });
  };

  if (!agent) {
    return <p className="text-[13.5px] text-mid">Run supabase/migrations/013_trade_agents.sql, then refresh.</p>;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <nav className="space-y-2">
        {initial.map((row) => {
          const live = drafts[row.key] ?? row;
          const active = live.key === selected;
          return (
            <button
              key={row.key}
              type="button"
              onClick={() => setSelected(row.key)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                active ? "border-blue/40 bg-white shadow-[0_12px_32px_-24px_rgb(16_38_59/0.4)]" : "border-border bg-white hover:border-blue/30"
              }`}
            >
              <p className="text-[14px] font-semibold text-ink">{live.name}</p>
              <p className="mt-1 line-clamp-3 text-[12.5px] leading-snug text-mid">{live.description}</p>
            </button>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-border bg-white p-5 shadow-[0_12px_40px_-28px_rgb(16_38_59/0.35)]">
        <p className="font-mono text-[11px] text-dim">{agent.key}</p>
        <div className="mt-3 space-y-4">
          <div>
            <label className={label} htmlFor="agent-name">
              Display name
            </label>
            <input
              id="agent-name"
              className={`${input} mt-1.5`}
              value={agent.name}
              onChange={(event) => setDrafts((prev) => ({ ...prev, [agent.key]: { ...agent, name: event.target.value } }))}
            />
          </div>
          <div>
            <label className={label} htmlFor="agent-desc">
              What it does
            </label>
            <input
              id="agent-desc"
              className={`${input} mt-1.5`}
              value={agent.description}
              onChange={(event) => setDrafts((prev) => ({ ...prev, [agent.key]: { ...agent, description: event.target.value } }))}
            />
          </div>
          <div>
            <label className={label} htmlFor="agent-prompt">
              System prompt
            </label>
            <textarea
              id="agent-prompt"
              className={`${textarea} mt-1.5 min-h-[420px] font-mono text-[12.5px] leading-relaxed`}
              value={agent.systemPrompt}
              onChange={(event) => setDrafts((prev) => ({ ...prev, [agent.key]: { ...agent, systemPrompt: event.target.value } }))}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setDrafts((prev) => ({ ...prev, [agent.key]: initial.find((row) => row.key === agent.key)! }))}
            >
              Revert
            </button>
            <button type="button" className={btnPrimary} disabled={pending} onClick={save}>
              Save prompt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
