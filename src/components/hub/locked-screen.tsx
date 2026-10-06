import Link from "next/link";
import { ArrowRight, Check, Crown, Lock, MessageCircle } from "lucide-react";
import { btnPrimary, btnSecondary } from "@/components/app/form";
import { moduleInfo, PLAN_LABEL, type ModuleKey } from "@/lib/aq-modules/types";
import type { Plan } from "@/lib/session-shared";

function SampleChart({ seed }: { seed: number }) {
  const bars = [0, 1, 2, 3, 4, 5].map((i) => 18 + ((i * 37 + seed * 23) % 44));
  const line = [0, 1, 2, 3, 4, 5, 6].map((i) => `${i * 33},${64 - ((i * 29 + seed * 17) % 46)}`).join(" ");
  return (
    <svg viewBox="0 0 200 80" className="h-full w-full" aria-hidden>
      {bars.map((h, i) => (
        <rect key={i} x={8 + i * 32} y={80 - h} width={18} height={h} rx={4} fill={i % 2 ? "#6e9a8e" : "#2f6fb3"} opacity={0.55} />
      ))}
      <polyline points={line} fill="none" stroke="#1e405f" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Shown in place of a module the member's plan does not include. Nothing from the module is
 * sent to the browser; the visuals are static shapes, blurred on purpose.
 */
export function LockedScreen({ module, required, plan }: { module: ModuleKey; required: Plan; plan: Plan }) {
  const info = moduleInfo(module);
  const upgrade = `/hub/account/membership?plan=${required}&from=${module}`;
  const desk = `/hub/contact?topic=${encodeURIComponent(`Unlock ${info.label}`)}`;
  return (
    <div className="mx-auto max-w-5xl">
      <section className="aq-rise relative overflow-hidden rounded-[26px] border border-border bg-white shadow-[var(--aq-shadow-card)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(90%_120%_at_10%_0%,rgb(47_111_179/0.12),transparent_60%),radial-gradient(70%_120%_at_90%_0%,rgb(95_168_138/0.14),transparent_60%)]" />
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:p-10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="aq-chip aq-chip-blue flex h-10 w-10 items-center justify-center rounded-xl text-white">
                <Lock className="h-[18px] w-[18px]" strokeWidth={2.4} />
              </span>
              <span className="rounded-full bg-blue-light px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.1em] text-blue">AQ Analytics</span>
              <span className="rounded-full bg-s3 px-2.5 py-1 text-[12px] font-semibold text-mid">Included from {PLAN_LABEL[required]}</span>
            </div>
            <h1 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink md:text-[34px]">Unlock {info.label}</h1>
            <p className="mt-2 max-w-xl text-[16.5px] leading-relaxed text-mid">{info.pitch}</p>

            <ul className="mt-5 space-y-2.5">
              {info.covers.map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-[15.5px] text-ink">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e7f6ee] text-[#1b7a47]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {line}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link href={upgrade} className={btnPrimary}>
                <Crown className="h-4 w-4" /> Upgrade to {PLAN_LABEL[required]}
              </Link>
              <Link href={desk} className={btnSecondary}>
                <MessageCircle className="h-4 w-4" /> Talk to the desk
              </Link>
            </div>
            <p className="mt-3 text-[13.5px] text-dim">
              You are on <strong className="font-semibold text-mid">{PLAN_LABEL[plan]}</strong>. The desk moves accounts the same working day, and nothing changes until you confirm.
            </p>
          </div>

          <div className="relative" aria-hidden>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`rounded-2xl border border-border bg-s2/70 p-3 ${i === 0 ? "col-span-2" : ""}`}>
                  <div className={`select-none blur-[5px] ${i === 0 ? "h-28" : "h-20"}`}>
                    <SampleChart seed={i + 1} />
                  </div>
                  <div className="mt-2 space-y-1.5 blur-[3px]">
                    <div className="h-2.5 w-3/4 rounded bg-[#d9e2ea]" />
                    <div className="h-2.5 w-1/2 rounded bg-[#e4ebf1]" />
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="aq-float flex items-center gap-2 rounded-full border border-border bg-white/95 px-4 py-2 text-[14.5px] font-semibold text-ink backdrop-blur">
                <Lock className="h-3.5 w-3.5 text-blue" /> Live data for {PLAN_LABEL[required]} members
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white/70 px-5 py-3.5 text-[14.5px] text-mid">
        <span>Not sure it is worth it? Book the free Weekly Market Call and see the desk&apos;s data first.</span>
        <Link href="/hub/community-call" className="inline-flex items-center gap-1 font-semibold text-blue no-underline hover:underline">
          Register for the call <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
