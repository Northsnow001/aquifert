"use client";

import { useEffect, useState } from "react";
import type { LiveAnalytics, LiveAnalyticsFailure } from "@/lib/ga-realtime-shared";

type Payload = LiveAnalytics | LiveAnalyticsFailure;

const titleCase = (value: string) => value.slice(0, 1).toUpperCase() + value.slice(1);

export function LiveAnalyticsPanel() {
  const [data, setData] = useState<LiveAnalytics | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const response = await fetch("/api/admin/analytics", { cache: "no-store" });
        const body = (await response.json()) as Payload;
        if (stop) return;
        if (body.ok) {
          setData(body);
          setProblem(null);
          setConfigured(true);
        } else {
          setConfigured(body.reason !== "not_configured");
          setProblem(body.message);
        }
      } catch {
        if (!stop) setProblem("The live report could not be reached.");
      }
    };
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15_000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, []);

  const peak = Math.max(1, ...(data?.minutes.map((minute) => minute.users) ?? [1]));

  return (
    <section className="aq-card mb-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <div>
          <h2 className="flex items-center gap-2 text-[14.5px] font-semibold text-ink">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#1f9d60] opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1f9d60]" />
            </span>
            Live visitors
          </h2>
          <p className="mt-0.5 text-[12px] text-dim">Google Analytics, last 30 minutes. Refreshes every 15 seconds.</p>
        </div>
        <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-semibold text-blue no-underline">
          Open Google Analytics
        </a>
      </div>

      {!data && problem ? (
        <p className="px-5 py-4 text-[13px] leading-relaxed text-mid">{problem}</p>
      ) : null}

      {data ? (
        <div className="grid gap-5 px-5 py-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-dim">Active users</p>
            <p className="mt-1 text-[40px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-ink">{data.activeUsers}</p>
            <p className="mt-2 text-[12.5px] text-mid">
              {data.views.toLocaleString()} views · {data.events.toLocaleString()} events
            </p>
            {data.devices.length ? (
              <p className="mt-2 text-[12px] text-dim">{data.devices.map((device) => `${titleCase(device.name)} ${device.users}`).join(" · ")}</p>
            ) : null}
          </div>
          <div>
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-dim">Users each minute</p>
            <div className="mt-3 flex h-16 items-end gap-1" aria-hidden="true">
              {data.minutes.map((minute) => (
                <span key={minute.ago} className="flex-1 rounded-sm bg-blue/80" style={{ height: `${Math.max(4, (minute.users / peak) * 100)}%` }} title={`${minute.users} ${minute.ago === 0 ? "now" : `${minute.ago} min ago`}`} />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-dim">
              <span>30 min ago</span>
              <span>Now</span>
            </div>
          </div>
          <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2">
            <List title="Screens" empty="No screens in the last 30 minutes." rows={data.screens.map((screen) => ({ label: screen.name, value: String(screen.users) }))} />
            <List title="Events" empty="No events in the last 30 minutes." rows={data.eventNames.map((event) => ({ label: event.name, value: event.count.toLocaleString() }))} />
          </div>
          {problem && configured ? <p className="lg:col-span-2 text-[12px] text-[#9a5b00]">{problem}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function List({ title, rows, empty }: { title: string; rows: { label: string; value: string }[]; empty: string }) {
  return (
    <div>
      <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-dim">{title}</p>
      {rows.length ? (
        <ul className="mt-2 divide-y divide-border">
          {rows.map((row) => (
            <li key={row.label} className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
              <span className="truncate text-ink">{row.label}</span>
              <span className="shrink-0 tabular-nums text-mid">{row.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[12.5px] text-dim">{empty}</p>
      )}
    </div>
  );
}
