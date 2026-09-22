/**
 * SiteSearch, header search overlay. Client-side index of the public site's
 * pages and sections; filters live as you type, arrow keys navigate, Enter
 * opens the highlighted result, Esc closes.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Search, X } from "lucide-react";

type Entry = { title: string; section: string; keywords: string; to: string };

const INDEX: Entry[] = [
  { title: "Home", section: "Page", keywords: "home landing fertilizer markets sustainable", to: "/" },
  { title: "Platform, Aquifert ONE", section: "Page", keywords: "platform one workspace trade tools", to: "/platform" },
  { title: "Why Aquifert", section: "Page", keywords: "why aquifert expertise due diligence sustainability", to: "/why-aquifert" },
  { title: "Membership plans", section: "Page", keywords: "membership pricing sprout harvest scale plans cost", to: "/membership" },
  { title: "Help & Aquibot", section: "Page", keywords: "help faq support chatbot aquibot questions contact", to: "/help" },
  { title: "Log in", section: "Account", keywords: "login sign in account", to: "/login" },
  { title: "Create an account", section: "Account", keywords: "register sign up new account access", to: "/register" },
  { title: "TELEX Intelligence", section: "Platform feature", keywords: "telex market flashes trade signals news desk", to: "/platform" },
  { title: "Freight Analytics", section: "Platform feature", keywords: "freight rates handysize container lanes shipping cost", to: "/platform" },
  { title: "Freight Calculator", section: "Platform feature", keywords: "freight calculator estimate cost clearing duties", to: "/platform" },
  { title: "Market Indicators", section: "Platform feature", keywords: "market indicators price nitrogen phosphate potash urea dap map mop", to: "/platform" },
  { title: "Voyage Analytics", section: "Platform feature", keywords: "voyage tracking shipment eta milestones container", to: "/platform" },
  { title: "Aquibot AI Assistant", section: "Platform feature", keywords: "aquibot ai assistant quotes drafting chat", to: "/platform" },
  { title: "Order Desk", section: "Platform feature", keywords: "order desk live orders audit trail", to: "/platform" },
  { title: "Academy", section: "Platform feature", keywords: "academy learning incoterms risk management training", to: "/platform" },
  { title: "Water soluble fertilizers", section: "Products", keywords: "water soluble urea dap mop map npk fertigation foliar", to: "/why-aquifert" },
  { title: "Micronutrients", section: "Products", keywords: "micronutrients zinc iron high value crops", to: "/why-aquifert" },
  { title: "Supply chain expertise", section: "Products", keywords: "supply chain sourcing clearing delivery logistics", to: "/why-aquifert" },
  { title: "Sprout, £2,000/month", section: "Membership", keywords: "sprout plan 50 tonnes starter membership", to: "/membership" },
  { title: "Harvest, £5,000/month", section: "Membership", keywords: "harvest plan 200 tonnes financing membership", to: "/membership" },
  { title: "Scale, £7,000/month", section: "Membership", keywords: "scale plan unlimited enterprise membership", to: "/membership" },
  { title: "Invoice financing", section: "Membership", keywords: "financing invoice discounting credit 85%", to: "/membership" },
  { title: "Contact the desk", section: "Support", keywords: "contact email enquiry desk phone", to: "/help" },
];

export function SiteSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const results = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return INDEX.slice(0, 6);
    return INDEX.filter((e) => {
      const hay = `${e.title} ${e.section} ${e.keywords}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    }).slice(0, 8);
  }, [q]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setActive(0), [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-navy-900/50 px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Site search"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4">
          <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && results[active]) {
                go(results[active].to);
              }
            }}
            type="search"
            role="combobox"
            aria-expanded="true"
            aria-controls="site-search-results"
            aria-activedescendant={results[active] ? `sr-${active}` : undefined}
            aria-label="Search the website"
            placeholder="Search products, features, plans, help…"
            className="w-full bg-transparent py-4 text-[15px] text-navy-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-navy-800"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <ul id="site-search-results" role="listbox" aria-label="Search results" className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 ? (
            <li className="px-5 py-6 text-sm text-slate-500">
              No matches for “{q}”. Try “urea”, “freight”, “membership”, or{" "}
              <a href="mailto:enquiry@aquifert.com" className="font-semibold text-navy-700 underline-offset-2 hover:underline">
                ask the desk
              </a>
              .
            </li>
          ) : (
            results.map((r, i) => (
              <li key={r.title} id={`sr-${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r.to)}
                  className={`flex w-full items-center justify-between gap-4 px-5 py-3 text-left transition-colors ${
                    i === active ? "bg-slate-100" : ""
                  }`}
                >
                  <span>
                    <span className="block text-sm font-semibold text-navy-900">{r.title}</span>
                    <span className="block text-[12px] text-slate-500">{r.section}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
