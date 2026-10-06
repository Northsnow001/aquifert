"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarClock, Radio, X } from "lucide-react";
import { useAquibotDock } from "@/components/app/aquibot-dock-store";
import { calendlyLink } from "@/lib/calendly";

/** Canvas geometry in px. The launcher sits `INSET` in from the canvas's bottom-right corner and the branches fan up and to the left. */
const W = 356;
const H = 276;
const INSET = 8;
const LAUNCHER = 56;
const NODE = 52;
const NODE_X = 216;
const PORT = NODE_X + NODE / 2 + 4;
const START = { x: W - INSET - LAUNCHER / 2, y: H - INSET - LAUNCHER };
const BRANCHES = [
  { y: 82, d: `M ${START.x} ${START.y} C ${START.x} 130, ${START.x} 82, ${PORT} 82` },
  { y: 170, d: `M ${START.x} ${START.y} C ${START.x} 186, ${START.x - 16} 170, ${PORT} 170` },
];

function RouterGlyph() {
  const branch = "M7.6 12 H9.6 C12.8 12 13 6.5 16.4 6.5 M9.6 12 C12.8 12 13 17.5 16.4 17.5";
  return (
    <svg viewBox="0 0 24 24" className="h-[26px] w-[26px]" fill="none" aria-hidden>
      <path d={branch} stroke="white" strokeOpacity="0.9" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.6 12 H9.6 C12.8 12 13 6.5 16.4 6.5" pathLength={1} className="aq-router-spark" stroke="#f3cf7f" strokeWidth="2" strokeLinecap="round" />
      <circle cx="5" cy="12" r="2.6" fill="#e0b45a" />
      <circle cx="18.8" cy="6.5" r="2.3" stroke="white" strokeWidth="1.6" />
      <circle cx="18.8" cy="17.5" r="2.3" stroke="white" strokeWidth="1.6" />
    </svg>
  );
}

/** Hub launcher that branches to the two ways of talking to the desk: the Weekly Market Call and a booked call. */
export function DeskConnect({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const { open: dockOpen } = useAquibotDock();
  const root = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLAnchorElement>(null);
  const id = useId();
  const menuId = `${id}-menu`;

  useEffect(() => {
    if (!open) return;
    first.current?.focus({ preventScroll: true });
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
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

  if (dockOpen) return null;
  const calm = open && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const options = [
    {
      key: "call",
      href: "/hub/community-call",
      title: "Register for the Weekly Market Call",
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

  return (
    <div ref={root} className="fixed bottom-24 right-4 z-[45] lg:bottom-6 lg:right-6 print:hidden">
      {open ? (
        <div
          id={menuId}
          role="group"
          aria-label="Talk to the Aquifert desk"
          className="aq-canvas-in absolute overflow-hidden rounded-[24px] border border-black/[.07] bg-white/95 shadow-[var(--aq-shadow-float)] backdrop-blur-md"
          style={{ width: W, height: H, right: -INSET, bottom: -INSET, backgroundImage: "radial-gradient(rgb(130 171 203 / 0.28) 1px, transparent 1.2px)", backgroundSize: "14px 14px" }}
        >
          <div className="absolute left-[18px] top-4">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-navy-700">Talk to the desk</p>
            <p className="mt-0.5 text-[12px] text-dim">Pick how you want to connect</p>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="absolute inset-0 overflow-visible" fill="none" aria-hidden>
            <defs>
              {BRANCHES.map((branch, i) => (
                <mask key={i} id={`${id}-reveal-${i}`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
                  <path d={branch.d} pathLength={1} stroke="white" strokeWidth="8" className="aq-branch-draw" style={{ animationDelay: `${i * 90}ms` }} />
                </mask>
              ))}
            </defs>
            {BRANCHES.map((branch, i) => (
              <g key={i} mask={`url(#${id}-reveal-${i})`}>
                <path d={branch.d} stroke="#82abcb" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="0.5 6.5" />
                <circle cx={PORT} cy={branch.y} r="3.5" fill="white" stroke="#5789b0" strokeWidth="1.5" />
                {calm ? null : (
                  <circle r="2.6" fill="#e0b45a">
                    <animateMotion dur="2.8s" begin={`${0.6 + i * 0.5}s`} repeatCount="indefinite" path={branch.d} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1" />
                  </circle>
                )}
              </g>
            ))}
          </svg>

          {options.map((option, i) => {
            const style = { top: BRANCHES[i].y - 32, left: 10, width: NODE_X + NODE / 2 - 10 };
            const content = (
              <>
                <span className="aq-branch-card min-w-0 rounded-xl border border-black/[.07] bg-white px-3 py-2 text-right shadow-[0_8px_20px_-12px_rgb(11_30_45/0.4)] transition group-hover:border-navy-300 group-focus-visible:border-navy-400 group-focus-visible:ring-2 group-focus-visible:ring-blue/30" style={{ animationDelay: `${220 + i * 90}ms` }}>
                  <span className="block text-[13px] font-semibold leading-snug text-ink group-hover:text-navy-700">{option.title}</span>
                  <span className="mt-0.5 flex items-center justify-end gap-1 whitespace-nowrap text-[11.5px] text-dim">
                    {option.body}
                    {option.external ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : null}
                  </span>
                </span>
                <span
                  className={`aq-node-pop flex shrink-0 items-center justify-center rounded-full text-white ring-[3px] ring-white shadow-[0_10px_22px_-8px_rgb(11_30_45/0.6)] transition-transform group-hover:scale-105 ${option.node}`}
                  style={{ width: NODE, height: NODE, animationDelay: `${120 + i * 90}ms` }}
                >
                  <option.Icon className="h-[22px] w-[22px]" strokeWidth={1.9} aria-hidden />
                </span>
              </>
            );
            const className = "group absolute flex items-center justify-end gap-2 rounded-2xl no-underline outline-none";
            return option.external ? (
              <a key={option.key} ref={i === 0 ? first : undefined} href={option.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={className} style={style}>
                {content}
              </a>
            ) : (
              <Link key={option.key} ref={i === 0 ? first : undefined} href={option.href} onClick={() => setOpen(false)} className={className} style={style}>
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
        onClick={() => setOpen((value) => !value)}
        className="aq-router group relative flex items-center justify-center rounded-full text-white"
        style={{ width: LAUNCHER, height: LAUNCHER }}
      >
        <span className={`transition duration-300 ${open ? "rotate-90 scale-50 opacity-0" : ""}`}>
          <RouterGlyph />
        </span>
        <X className={`absolute h-5 w-5 transition duration-300 ${open ? "" : "-rotate-90 scale-50 opacity-0"}`} aria-hidden />
        {open ? null : (
          <span className="pointer-events-none absolute right-full top-1/2 mr-3 hidden -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-full bg-navy-900 px-3 py-1.5 text-[12px] font-semibold text-white opacity-0 shadow-lg transition group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 lg:block">
            Talk to the desk
          </span>
        )}
      </button>
    </div>
  );
}
