"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
import { saveAqAccess } from "@/app/admin/aq-content/actions";
import { CardHeader, field } from "@/components/admin/ui";
import { MODULES, PLAN_LABEL, PLAN_RANK, type AccessRules, type Aq1Limits, type PlanLimits } from "@/lib/aq-modules/types";
import { formatStamp } from "@/lib/content-types";
import type { Plan } from "@/lib/session-shared";

const PLANS: Plan[] = ["core", "growth", "enterprise"];

const ALLOWANCES: { key: keyof Aq1Limits; label: string; hint: string }[] = [
  { key: "nitrogenReports", label: "AQ1 nitrogen reports", hint: "Reports a member can generate each month." },
  { key: "savedReports", label: "Saved reports", hint: "Reports a member can keep in their library." },
];

type Status = "idle" | "pending" | "saving" | "saved" | "error";

function audience(plan: Plan) {
  const plans = PLANS.filter((item) => PLAN_RANK[item] >= PLAN_RANK[plan]).map((item) => PLAN_LABEL[item]);
  if (plans.length === 3) return "Every member: Core, Growth and AQ Zero";
  if (plans.length === 2) return `${plans[0]} and ${plans[1]} members`;
  return `${plans[0]} members only`;
}

function SaveState({ status, savedAt, message }: { status: Status; savedAt: string | null; message: string }) {
  if (status === "pending" || status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-mid">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-danger">
        <CircleAlert className="h-3.5 w-3.5" />
        {message || "Not saved. Check your connection. Your next change retries."}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#1f7a45]">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {savedAt ? `Live on the hub · saved ${formatStamp(savedAt)}` : "Live on the hub"}
    </span>
  );
}

export function AccessForm({ access: initialAccess, limits: initialLimits, updatedAt }: { access: AccessRules; limits: Aq1Limits; updatedAt: string | null }) {
  const [access, setAccess] = useState(initialAccess);
  const [limits, setLimits] = useState(initialLimits);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [savedAt, setSavedAt] = useState(updatedAt);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequence = useRef(0);

  const schedule = (nextAccess: AccessRules, nextLimits: Aq1Limits) => {
    setStatus("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const run = ++sequence.current;
      setStatus("saving");
      try {
        const result = await saveAqAccess({ access: nextAccess, limits: nextLimits });
        if (run !== sequence.current) return;
        if (result.ok) {
          setSavedAt(result.savedAt);
          setMessage("");
          setStatus("saved");
        } else {
          setMessage(result.message);
          setStatus("error");
        }
      } catch {
        if (run !== sequence.current) return;
        setMessage("");
        setStatus("error");
      }
    }, 600);
  };

  const setPlan = (key: keyof AccessRules, plan: Plan) => {
    if (access[key] === plan) return;
    const next = { ...access, [key]: plan };
    setAccess(next);
    schedule(next, limits);
  };

  const setLimit = (key: keyof Aq1Limits, plan: Plan, raw: string) => {
    const value = Math.max(0, Math.min(100_000, Math.floor(Number(raw) || 0)));
    const next: Aq1Limits = { ...limits, [key]: { ...limits[key], [plan]: value } as PlanLimits };
    setLimits(next);
    schedule(access, next);
  };

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (status === "pending" || status === "saving") event.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [status]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 px-4 py-2.5 shadow-sm backdrop-blur">
        <p className="text-[12.5px] text-mid">Pick the lowest plan that unlocks each module. Changes save on their own. Admins always see everything.</p>
        <SaveState status={status} savedAt={savedAt} message={message} />
      </div>

      <section className="overflow-hidden aq-card">
        <CardHeader title="AQ Analytics modules" meta="Members below the chosen plan see the module locked, with an upgrade prompt." />
        <ul>
          {MODULES.map((item) => {
            const plan = access[item.key];
            return (
              <li key={item.key} className="grid gap-4 border-b border-border px-5 py-4 last:border-b-0 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold text-ink">{item.label}</p>
                    <Link href={item.href} className="font-mono text-[11px] text-dim no-underline hover:text-blue">
                      {item.href}
                    </Link>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-mid">{item.pitch}</p>
                </div>
                <div>
                  <div className="grid grid-cols-3 gap-1 rounded-lg bg-s2 p-1" role="radiogroup" aria-label={`${item.label} lowest plan`}>
                    {PLANS.map((option) => {
                      const active = plan === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setPlan(item.key, option)}
                          className={`h-8 rounded-md text-[12.5px] font-semibold transition ${active ? "bg-white text-blue shadow-sm" : "text-mid hover:text-ink"}`}
                        >
                          {PLAN_LABEL[option]}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-dim">{audience(plan)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="overflow-hidden aq-card">
        <CardHeader title="AQ1 allowances" meta="Monthly limits per plan. Enter 0 for unlimited." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-border font-mono text-[10.5px] uppercase tracking-[0.1em] text-dim">
                <th className="px-5 py-2.5 font-medium">Allowance</th>
                {PLANS.map((plan) => (
                  <th key={plan} className="w-36 py-2.5 pr-5 font-medium">
                    {PLAN_LABEL[plan]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALLOWANCES.map((row) => (
                <tr key={row.key} className="border-b border-border align-top last:border-b-0">
                  <td className="px-5 py-3.5">
                    <p className="text-[13.5px] font-semibold text-ink">{row.label}</p>
                    <p className="mt-0.5 text-[12px] text-mid">{row.hint}</p>
                  </td>
                  {PLANS.map((plan) => {
                    const value = limits[row.key][plan];
                    const id = `${row.key}-${plan}`;
                    return (
                      <td key={plan} className="py-3.5 pr-5">
                        <label htmlFor={id} className="sr-only">
                          {row.label}, {PLAN_LABEL[plan]}
                        </label>
                        <input
                          id={id}
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          value={value}
                          onChange={(event) => setLimit(row.key, plan, event.target.value)}
                          className={`${field} h-9 w-full font-mono`}
                        />
                        <p className={`mt-1 text-[11px] ${value === 0 ? "font-semibold text-[#1f7a45]" : "text-dim"}`}>{value === 0 ? "Unlimited" : `${value} a month`}</p>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-5 py-3 text-[12px] text-dim">0 means unlimited. Admins are never limited.</p>
      </section>
    </div>
  );
}
