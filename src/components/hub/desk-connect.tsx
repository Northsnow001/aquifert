"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarClock, Radio, X } from "lucide-react";
import { useAquibotDock } from "@/components/app/aquibot-dock-store";
import { calendlyLink } from "@/lib/calendly";

/** Canvas geometry in px. The launcher sits `INSET` in from the canvas's top-right corner and the branches fan down and to the left. */
const W = 280;
const H = 214;
const INSET = 6;
const LAUNCHER = 44;
const NODE = 40;
const NODE_X = 168;
const PORT = NODE_X + NODE / 2 + 3;
const START = { x: W - INSET - LAUNCHER / 2, y: INSET + LAUNCHER };
const BRANCHES = [
  { y: 88, d: `M ${START.x} ${START.y} C ${START.x} 88, ${START.x} 88, ${PORT} 88` },
  { y: 156, d: `M ${START.x} ${START.y} C ${START.x} 132, ${START.x - 12} 156, ${PORT} 156` },
];
const OPEN_MS = 5_000;
const CYCLE_MS = 5 * 60_000;

function RouterGlyph() {
  const branch = "M7.6 12 H9.6 C12.8 12 13 6.5 16.4 6.5 M9.6 12 C12.8 12 13 17.5 16.4 17.5";
  return (
    <svg viewBox="0 0 24 24" className="h-[20px] w-[20px] sm:h-[22px] sm:w-[22px]" fill="none" aria-hidden>
      <path d={branch} stroke="white" strokeOpacity="0.9" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.6 12 H9.6 C12.8 12 13 6.5 16.4 6.5" pathLength={1} className="aq-router-spark" stroke="#f3cf7f" strokeWidth="2" strokeLinecap="round" />
      <circle cx="5" cy="12" r="2.6" fill="#e0b45a" />
      <circle cx="18.8" cy="6.5" r="2.3" stroke="white" strokeWidth="1.6" />
      <circle cx="18.8" cy="17.5" r="2.3" stroke="white" strokeWidth="1.6" />
    </svg>
  );
}

/** Hub launcher that branches to the Weekly Meetup and a booked Trade Desk call. Desktop: top-right canvas. Phone: compact sheet above the tab bar. */
export function DeskConnect({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const { open: dockOpen } = useAquibotDock();
  const root = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLAnchorElement>(null);
  const holdOpen = useRef(false);
  const id = useId();
  const menuId = `${id}-menu`;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    first.current?.focus({ preventScroll: true });
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        holdOpen.current = false;
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      holdOpen.current = false;
      setOpen(false);
      launcher.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Auto-pulse only on wide screens so phones keep the content clear.
    if (window.matchMedia("(max-width: 1023px)").matches) return;

    let collapseTimer = 0;
    const pulse = () => {
      if (holdOpen.current || document.visibilityState === "hidden") return;
      setOpen(true);
      window.clearTimeout(collapseTimer);
      collapseTimer = window.setTimeout(() => {
        if (!holdOpen.current) setOpen(false);
      }, OPEN_MS);
    };

    const firstPulse = window.setTimeout(pulse, 2_500);
    const cycle = window.setInterval(pulse, CYCLE_MS);
    return () => {
      window.clearTimeout(firstPulse);
      window.clearTimeout(collapseTimer);
      window.clearInterval(cycle);
    };
  }, []);

  if (dockOpen) return null;
  const calm = open && reduceMotion;

  const options = [
    {
      key: "call",
      href: "/hub/community-call",
      title: "Register for the Weekly Meetup",
      body: "Free, live every week",
      Icon: Radio,
      node: "bg-[radial-gradient(circle_at_32%_26%,#6e9a8e,#3f7364_55%,#2b4a41)]",
      external: false,
    },
    {
      key: "book",
      href: calendlyLink({ name, email, campaign: "hub-desk-connect" }),
      title: "Book a call with our Trade Desk",
      body: "Pick a time that suits you",
      Icon: CalendarClock,
      node: "bg-[radial-gradient(circle_at_32%_26%,#3d77a6,#1e405f_55%,#0e2031)]",
      external: true,
    },
  ] as const;

  const toggle = () => {
    setOpen((value) => {
      const next = !value;
      holdOpen.current = next;
      return next;
    });
  };

  return (
    <div
      ref={root}
      className="pointer-events-none fixed bottom-[5.5rem] right-3 z-[45] flex justify-end lg:absolute lg:inset-x-0 lg:bottom-auto lg:right-auto lg:top-0 print:hidden"
    >
      <div className="pointer-events-auto relative">
        {/* Phone: compact sheet above the tab bar */}
        {open ? (
          <div
            id={`${menuId}-mobile`}
            role="group"
            aria-label="Talk to the Aquifert desk"
            className="aq-canvas-in absolute bottom-[3.25rem] right-0 w-[min(18.5rem,calc(100vw-1.5rem))] space-y-2 rounded-2xl border border-black/[.08] bg-white/97 p-3 shadow-[var(--aq-shadow-float)] backdrop-blur-md lg:hidden"
          >
            <div className="px-0.5 pb-0.5">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-navy-700">Talk to the desk</p>
              <p className="mt-0.5 text-[11px] text-dim">Pick how you want to connect</p>
            </div>
            {options.map((option, i) => {
              const content = (
                <>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${option.node}`}>
                    <option.Icon className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-[13px] font-semibold leading-snug text-ink">{option.title}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-dim">
                      {option.body}
                      {option.external ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : null}
                    </span>
                  </span>
                </>
              );
              const className = "flex items-center gap-2.5 rounded-xl border border-black/[.07] bg-white px-2.5 py-2 no-underline shadow-sm transition hover:border-navy-300";
              return option.external ? (
                <a key={option.key} ref={i === 0 ? first : undefined} href={option.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={className}>
                  {content}
                </a>
              ) : (
                <Link key={option.key} ref={i === 0 ? first : undefined} href={option.href} onClick={() => setOpen(false)} className={className}>
                  {content}
                </Link>
              );
            })}
          </div>
        ) : null}

        {/* Desktop: animated node canvas */}
        {open ? (
          <div
            id={menuId}
            role="group"
            aria-label="Talk to the Aquifert desk"
            className="aq-canvas-in absolute hidden overflow-hidden rounded-[20px] border border-black/[.07] bg-white/95 shadow-[var(--aq-shadow-float)] backdrop-blur-md lg:block"
            style={{ width: W, height: H, right: -INSET, top: -INSET, backgroundImage: "radial-gradient(rgb(130 171 203 / 0.28) 1px, transparent 1.2px)", backgroundSize: "12px 12px" }}
          >
            <div className="absolute left-3.5 top-3">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-navy-700">Talk to the desk</p>
              <p className="mt-0.5 text-[11px] text-dim">Pick how you want to connect</p>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="absolute inset-0 overflow-visible" fill="none" aria-hidden>
              <defs>
                {BRANCHES.map((branch, i) => (
                  <mask key={i} id={`${id}-reveal-${i}`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
                    <path d={branch.d} pathLength={1} stroke="white" strokeWidth="7" className="aq-branch-draw" style={{ animationDelay: `${i * 90}ms` }} />
                  </mask>
                ))}
              </defs>
              {BRANCHES.map((branch, i) => (
                <g key={i} mask={`url(#${id}-reveal-${i})`}>
                  <path d={branch.d} stroke="#82abcb" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.5 5.5" />
                  <circle cx={PORT} cy={branch.y} r="3" fill="white" stroke="#5789b0" strokeWidth="1.4" />
                  {calm ? null : (
                    <circle r="2.2" fill="#e0b45a">
                      <animateMotion dur="2.8s" begin={`${0.6 + i * 0.5}s`} repeatCount="indefinite" path={branch.d} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1" />
                    </circle>
                  )}
                </g>
              ))}
            </svg>

            {options.map((option, i) => {
              const style = { top: BRANCHES[i].y - 26, left: 8, width: NODE_X + NODE / 2 - 8 };
              const content = (
                <>
                  <span className="aq-branch-card min-w-0 rounded-lg border border-black/[.07] bg-white px-2.5 py-1.5 text-right shadow-[0_8px_18px_-12px_rgb(11_30_45/0.4)] transition group-hover:border-navy-300 group-focus-visible:border-navy-400 group-focus-visible:ring-2 group-focus-visible:ring-blue/30" style={{ animationDelay: `${220 + i * 90}ms` }}>
                    <span className="block text-[12px] font-semibold leading-snug text-ink group-hover:text-navy-700">{option.title}</span>
                    <span className="mt-0.5 flex items-center justify-end gap-1 whitespace-nowrap text-[10.5px] text-dim">
                      {option.body}
                      {option.external ? <ArrowUpRight className="h-2.5 w-2.5" aria-hidden /> : null}
                    </span>
                  </span>
                  <span
                    className={`aq-node-pop flex shrink-0 items-center justify-center rounded-full text-white ring-[2.5px] ring-white shadow-[0_8px_18px_-8px_rgb(11_30_45/0.6)] transition-transform group-hover:scale-105 ${option.node}`}
                    style={{ width: NODE, height: NODE, animationDelay: `${120 + i * 90}ms` }}
                  >
                    <option.Icon className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
                  </span>
                </>
              );
              const className = "group absolute flex items-center justify-end gap-2 rounded-2xl no-underline outline-none";
              return option.external ? (
                <a key={option.key} href={option.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={className} style={style}>
                  {content}
                </a>
              ) : (
                <Link key={option.key} href={option.href} onClick={() => setOpen(false)} className={className} style={style}>
                  {content}
                </Link>
              );
            })}
          </div>
        ) : null}

        <button
          ref={launcher}
          type="button"
          aria-label={open ? "Close" : "Talk to the Aquifert desk"}
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={toggle}
          className="aq-router group relative flex h-11 w-11 items-center justify-center rounded-full text-white sm:h-11 sm:w-11 lg:h-[44px] lg:w-[44px]"
          style={{ width: LAUNCHER, height: LAUNCHER }}
        >
          <span className={`transition duration-300 ${open ? "rotate-90 scale-50 opacity-0" : ""}`}>
            <RouterGlyph />
          </span>
          <X className={`absolute h-4 w-4 transition duration-300 ${open ? "" : "-rotate-90 scale-50 opacity-0"}`} aria-hidden />
          {open ? null : (
            <span className="pointer-events-none absolute right-full top-1/2 mr-2.5 hidden -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-full bg-navy-900 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 lg:block">
              Talk to the desk
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
