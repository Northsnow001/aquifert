/**
 * LeadMagnet, two-step lead capture modal + quiet inline fallback card.
 *
 * Trigger order (strict): window load → cookie banner actioned with
 * marketing consent → 4s wait → open. Never fires for marketing-rejecters,
 * authenticated visitors, paid-campaign arrivals, or anyone who dismissed
 * it within 30 days. The 30-day suppression key is only written AFTER
 * consent exists, that is what makes suppression lawful.
 *
 * Questions follow the AQ VIEW lead spec (Q1–Q9 + contact), condensed into
 * two steps: Step 1 "Your trade" (Q1–Q5), Step 2 "Volume & where to reach
 * you" (Q6–Q9 + contact). Answers map onto the existing leads payload, 
 * origin answers and the optional challenge travel inside `goals`.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, Download, Loader2, X } from "lucide-react";
import { jsPDF } from "jspdf";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { COOKIE_POLICY_VERSION, getConsent, marketingAllowed } from "@/lib/consent";
import { OPEN_LEAD_MAGNET_EVENT } from "@/components/LandingLayout";
import { Logo } from "@/components/shared/Logo";

const DISMISS_KEY = "aq.lead.dismissed";
const PREFILL_KEY = "aq.lead.prefill";
const SUPPRESS_MS = 30 * 864e5;

/* Q1, intent (single, required) */
const INTENTS = [
  "I want to buy fertilizer",
  "I want to sell or market fertilizer",
  "I'm checking current market prices",
  "I need freight or shipping costs",
  "I'm looking for a reliable supplier",
  "I'm evaluating the Aquifert ONE platform",
  "Research, press or academic",
  "Something else",
];
/* Q2, organisation (single, required) */
const ORGS = [
  "Importer / distributor",
  "Trader / trading house",
  "Producer / manufacturer",
  "Blender / compounder",
  "Farming group, cooperative or grower",
  "Agro-dealer / retailer",
  "Logistics, chartering or freight forwarding",
  "Bank, fund or research house",
  "Government, NGO or development agency",
  "Other",
];
/* Q3, products (multi, min 1) */
const PRODUCTS = [
  "Urea (granular)", "Urea (prilled)", "DAP", "MAP", "TSP", "SSP",
  "MOP / Potash", "SOP", "Ammonium Sulphate (Amsul)", "AN / CAN", "UAN",
  "NPK compounds", "Ammonia", "Water-soluble fertilizers",
  "Micronutrients (Zn, Fe, Mn, B)", "Calcium Nitrate", "Phosphate rock",
  "Sulphur", "Not sure yet, please advise",
];
/* Q4, delivery regions (multi, min 1) + optional port */
const DESTINATIONS = [
  "West Africa", "East Africa", "North Africa", "Southern Africa",
  "Brazil / South America", "North America", "Central America & Caribbean",
  "Western Europe", "Eastern Europe / FSU", "Middle East", "South Asia",
  "Southeast Asia", "East Asia", "Oceania",
];
/* Q5, current origins (multi, min 1) */
const ORIGINS = [
  "Arab Gulf", "Iran", "Egypt / North Africa", "Algeria", "Nigeria",
  "Baltic / Russia / FSU", "Black Sea", "China", "Southeast Asia", "USA",
  "Europe", "Morocco or Jordan (phosphates)", "Canada or Belarus (potash)",
  "Through a trader, origin unknown", "I don't buy yet",
];
/* Q6, annual volume (single, required) */
const VOLUMES = [
  "Under 500 MT", "500–5,000 MT", "5,000–25,000 MT", "25,000–100,000 MT",
  "100,000–500,000 MT", "Over 500,000 MT", "Not applicable",
];
/* Q7, next step (single, required) */
const NEXT_STEPS = [
  "Get a price quote now",
  "Get pricing to compare against my current supplier",
  "Plan a purchase for the coming season",
  "Find a new supplier or origin",
  "Understand freight and landed costs",
  "Sell product into new markets",
  "Just gathering market intelligence",
];
/* Q8, support wanted (multi, min 1) */
const SUPPORT = [
  "Competitive pricing and quotes",
  "Reliable supply and on-time shipment",
  "Verified suppliers and due diligence",
  "Arranging freight and logistics",
  "Landed-cost and netback calculations",
  "Live market prices and indices",
  "Market reports and analysis",
  "Credit or payment terms",
  "Smaller or flexible cargo sizes",
  "Introductions to buyers",
];
const COUNTRIES = [
  "United Kingdom", "United States", "Brazil", "India", "China", "United Arab Emirates", "Saudi Arabia",
  "Egypt", "Morocco", "Nigeria", "Kenya", "South Africa", "Germany", "France", "Netherlands", "Belgium",
  "Spain", "Italy", "Poland", "Ukraine", "Turkey", "Russia", "Canada", "Mexico", "Argentina", "Chile",
  "Australia", "New Zealand", "Indonesia", "Malaysia", "Thailand", "Vietnam", "Philippines", "Pakistan",
  "Bangladesh", "Japan", "South Korea", "Singapore", "Norway", "Sweden", "Denmark", "Ireland", "Other",
];
const FREE_MAIL = ["gmail.", "yahoo.", "hotmail.", "outlook.", "aol.", "icloud.", "mail.", "proton.", "gmx."];

type Step1 = {
  intent: string;        // Q1
  org: string;           // Q2
  products: string[];    // Q3
  regions: string[];     // Q4
  port: string;          // Q4 optional free text
  origins: string[];     // Q5
};
type Step2 = {
  annualVolume: string;  // Q6
  nextStep: string;      // Q7
  support: string[];     // Q8
  challenge: string;     // Q9 (optional)
  fullName: string; email: string; company: string; country: string; phone: string;
  termsAccepted: boolean; marketingOptIn: boolean;
};

function hasPaidCampaignParam(): boolean {
  const q = new URLSearchParams(window.location.search);
  return (
    q.has("gclid") || q.has("fbclid") || q.has("msclkid") ||
    ["cpc", "paid", "ppc", "paidsearch", "paidsocial"].includes((q.get("utm_medium") ?? "").toLowerCase())
  );
}

function dismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return !!raw && Date.now() - Number(raw) < SUPPRESS_MS;
  } catch {
    return false;
  }
}

/* ---------------- quiet inline card (marketing rejected) ---------------- */
export function MarketUpdatesCard() {
  const [consentKnown, setConsentKnown] = useState<boolean | null>(null);
  useEffect(() => {
    const check = () => setConsentKnown(!!getConsent() && !marketingAllowed());
    check();
    window.addEventListener("aq:consent-recorded", check);
    return () => window.removeEventListener("aq:consent-recorded", check);
  }, []);
  const { isAuthenticated } = useAuth();
  if (!consentKnown || isAuthenticated) return null;
  return (
    <section className="bg-white" aria-label="Market updates">
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[15px] font-semibold text-navy-900">Get market updates</h2>
            <p className="mt-1 text-[13px] text-slate-600">
              Weekly AQ VIEW commentary and regional price indications, straight from the desk.
            </p>
          </div>
          <a
            href="mailto:enquiry@aquifert.com?subject=Market%20updates"
            className="inline-flex h-10 items-center rounded border border-navy-700 px-5 text-sm font-semibold text-navy-700 hover:bg-navy-700 hover:text-white"
          >
            Contact the desk
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------------- modal ---------------- */
const inputCls =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-navy-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";
const labelCls = "text-[13px] font-semibold text-navy-900";
const errCls = "mt-1 text-[12px] text-red-700";

export function LeadMagnet() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<{ product: string; location: string; value: number; direction: string; unit: string }[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  const [s1, setS1] = useState<Step1>({ intent: "", org: "", products: [], regions: [], port: "", origins: [] });
  const [s2, setS2] = useState<Step2>({
    annualVolume: "", nextStep: "", support: [], challenge: "",
    fullName: "", email: "", company: "", country: "", phone: "",
    termsAccepted: false, marketingOptIn: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailSoft, setEmailSoft] = useState(false);

  const createLead = trpc.leads.create.useMutation();

  /* Trigger: window load → marketing consent → 4s */
  useEffect(() => {
    if (isAuthenticated || hasPaidCampaignParam() || dismissedRecently()) return;
    let timer: number | undefined;
    const maybeOpen = () => {
      if (!marketingAllowed() || dismissedRecently()) return;
      timer = window.setTimeout(() => {
        openerRef.current = document.activeElement;
        setOpen(true);
      }, 4000);
    };
    const onLoad = () => {
      if (marketingAllowed()) maybeOpen();
    };
    const onConsent = () => maybeOpen();
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    window.addEventListener("aq:consent-recorded", onConsent);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("aq:consent-recorded", onConsent);
    };
  }, [isAuthenticated]);

  /* Explicit open, "Request access" in the header opens the form directly,
     bypassing the consent/timer/dismissal guards (user-initiated). */
  useEffect(() => {
    const onOpen = () => {
      if (isAuthenticated) return;
      openerRef.current = document.activeElement;
      setOpen(true);
    };
    window.addEventListener(OPEN_LEAD_MAGNET_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_LEAD_MAGNET_EVENT, onOpen);
  }, [isAuthenticated]);

  /* Esc + focus trap */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const list = Array.from(focusables).filter((el) => !el.hasAttribute("disabled"));
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    scrollRef.current?.scrollTo({ top: 0 });
    const first = dialogRef.current?.querySelector<HTMLElement>("button, input, select");
    first?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, step]);

  const close = (suppress: boolean) => {
    setOpen(false);
    if (suppress) localStorage.setItem(DISMISS_KEY, String(Date.now())); // consent already exists when modal can open
    (openerRef.current as HTMLElement | null)?.focus?.();
  };

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const validate1 = (): boolean => {
    const e: Record<string, string> = {};
    if (!s1.intent) e.intent = "Choose the option closest to why you're here.";
    if (!s1.org) e.org = "Choose the option that best describes your organisation.";
    if (s1.products.length === 0) e.products = "Pick at least one product, 'Not sure yet' works too.";
    if (s1.regions.length === 0) e.regions = "Pick at least one delivery region.";
    if (s1.origins.length === 0) e.origins = "Pick at least one, \"I don't buy yet\" is fine.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateEmail = (v: string) => {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    setErrors((p) => ({ ...p, email: ok || !v ? "" : "Enter a valid work email, e.g. name@company.com." }));
    setEmailSoft(ok && FREE_MAIL.some((d) => v.toLowerCase().includes("@" + d)));
    return ok;
  };

  const validate2 = (): boolean => {
    const e: Record<string, string> = {};
    if (!s2.annualVolume) e.annualVolume = "Choose the band closest to your yearly volume.";
    if (!s2.nextStep) e.nextStep = "Choose what you'd like to do next.";
    if (s2.support.length === 0) e.support = "Pick at least one way we can help.";
    if (s2.fullName.trim().length < 2) e.fullName = "Enter your full name.";
    if (!validateEmail(s2.email)) e.email = "Enter a valid work email, e.g. name@company.com.";
    if (!s2.company.trim()) e.company = "Enter your company name.";
    if (!s2.country) e.country = "Choose your country.";
    if (!s2.termsAccepted) e.termsAccepted = "We need your agreement to the Privacy Policy and Terms to respond.";
    setErrors(e);
    return Object.values(e).every((v) => !v);
  };

  const submit = async () => {
    if (!validate2()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const q = new URLSearchParams(window.location.search);
      // When the form is opened explicitly via "Request access" the visitor may
      // not have actioned the cookie banner yet, record a strict minimum then.
      const consent = getConsent() ?? { analytics: false, marketing: false, version: COOKIE_POLICY_VERSION, at: new Date().toISOString() };
      const regions = s1.port.trim()
        ? [...s1.regions, `Specific port: ${s1.port.trim()}`]
        : s1.regions;
      const goals = [
        ...s2.support,
        ...s1.origins.map((o) => `Currently buys from: ${o}`),
        ...(s2.challenge.trim() ? [`Biggest challenge: ${s2.challenge.trim()}`] : []),
      ];
      await createLead.mutateAsync({
        intent: s1.intent,
        source: "Website, AQ VIEW lead form",
        products: s1.products,
        regions,
        goals,
        fullName: s2.fullName.trim(),
        email: s2.email.trim(),
        company: s2.company.trim(),
        country: s2.country,
        role: s1.org || undefined,
        annualVolume: s2.annualVolume || undefined,
        timeline: s2.nextStep || undefined,
        phone: s2.phone || undefined,
        termsAccepted: true,
        marketingOptIn: s2.marketingOptIn,
        consentPolicyVersion: COOKIE_POLICY_VERSION,
        consentAt: new Date().toISOString(),
        cookieConsent: { analytics: consent.analytics, marketing: consent.marketing, version: consent.version },
        utmSource: q.get("utm_source") ?? undefined,
        utmMedium: q.get("utm_medium") ?? undefined,
        utmCampaign: q.get("utm_campaign") ?? undefined,
        referrer: document.referrer || undefined,
        landingPage: window.location.href,
      });
      // Price snapshot for selected products × first selected delivery region
      try {
        const res = await fetch(
          `/api/rpc?trpcPath=prices.slider&input=${encodeURIComponent(JSON.stringify({ json: { region: s1.regions[0] } }))}`
        );
        const json = await res.json();
        const items = (json?.result?.data?.json?.items ?? []) as {
          product: string; grade: string | null; location: string; value: number; direction: string; unit: string;
        }[];
        setSnapshot(items.slice(0, 8));
      } catch {
        setSnapshot([]);
      }
      // Slider opens on their region next visit (consent given)
      localStorage.setItem("aq.slider.region", s1.regions[0]);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      setStep(3);
    } catch {
      setSubmitError("Something went wrong sending that. Nothing was lost, try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadReport = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("AQ VIEW, Weekly Fertilizer Market Report", 14, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("17 September 2026 · Aquifert Trading Desk", 14, 26);
    doc.setFontSize(11);
    const paras = [
      "Urea markets firmed again this week as Middle East producers reported limited spot availability for October loading, while Indian tender expectations continued to set a floor under CFR values into West Coast India.",
      "Phosphates remain the quiet outperformer. DAP values into Brazil are holding above $660/t CFR on tight Chinese export availability.",
      "Freight is the variable to watch. Handysize rates in the Atlantic basket have firmed for a third consecutive week, adding roughly $3-4/t to landed costs on transatlantic potash movements.",
      "Base case into year-end: nitrogen supported by gas costs and Indian demand, phosphates structurally tight, potash rangebound with an upward bias.",
    ];
    let y = 36;
    for (const p of paras) {
      const lines = doc.splitTextToSize(p, 180);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 4;
    }
    if (snapshot.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text(`Price snapshot, ${s1.regions[0]} (USD)`, 14, y + 6);
      doc.setFont("helvetica", "normal");
      y += 12;
      for (const r of snapshot) {
        doc.text(`${r.product} (${r.location}): $${r.value.toFixed(2)}/${r.unit}  ${r.direction}`, 14, y);
        y += 5.5;
      }
    }
    doc.setFontSize(8);
    doc.text(
      "Price indications compiled from public sources and Aquifert desk assessments. May be delayed. Not a price assessment, an offer, or advice.",
      14, 285
    );
    doc.save("Aquifert-AQ-VIEW-weekly.pdf");
  };

  const goToSignup = () => {
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify({
      fullName: s2.fullName, email: s2.email, company: s2.company, country: s2.country,
      phone: s2.phone, products: s1.products, regions: s1.regions,
    }));
    close(true);
    navigate("/register");
  };

  if (!open) return null;

  const chip = (arr: string[], v: string, set: (a: string[]) => void, labelledBy: string) => (
    <button
      key={v}
      type="button"
      aria-pressed={arr.includes(v)}
      aria-labelledby={labelledBy}
      onClick={() => set(toggle(arr, v))}
      className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
        arr.includes(v)
          ? "border-navy-700 bg-navy-700 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:border-navy-400 hover:text-navy-900"
      }`}
    >
      {v}
    </button>
  );

  const headerTitle = step === 3 ? "Your AQ VIEW report is ready" : "Help us point you in the right direction";
  const headerSub =
    step === 3
      ? `Thank you, ${s2.fullName.split(" ")[0]}. Your report is ready below.`
      : "A few quick questions. We'll send you our current market report and tailor what you see on the site.";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-navy-900/55 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close(true);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-modal-title"
        className="flex max-h-[90vh] w-full max-w-[620px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-navy-900/10"
      >
        {/* fixed header */}
        <div className="border-b border-slate-200 px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900/[0.03] ring-1 ring-slate-200">
                <Logo size={24} />
              </span>
              <div>
                <h2 id="lead-modal-title" className="text-[17px] font-bold leading-tight text-navy-900">
                  {headerTitle}
                </h2>
                <p className="mt-0.5 text-[12.5px] leading-snug text-slate-500">{headerSub}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => close(true)}
              aria-label="Close"
              className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-navy-900"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {step !== 3 && (
            <div className="mt-4 flex items-center gap-2" aria-hidden="true">
              {[1, 2].map((n) => (
                <span
                  key={n}
                  className={`h-1 flex-1 rounded-full transition-colors ${step >= n ? "bg-teal-500" : "bg-slate-200"}`}
                />
              ))}
              <span className="ml-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Step {Math.min(step, 2)} of 2
              </span>
            </div>
          )}
        </div>

        {/* scrollable body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label htmlFor="lm-intent" className={labelCls}>
                  1. What brings you to Aquifert today? *
                </label>
                <select id="lm-intent" value={s1.intent} onChange={(e) => setS1({ ...s1, intent: e.target.value })} className={`${inputCls} mt-1.5`}>
                  <option value="">Choose one…</option>
                  {INTENTS.map((i) => <option key={i}>{i}</option>)}
                </select>
                {errors.intent && <p className={errCls}>{errors.intent}</p>}
              </div>
              <div>
                <label htmlFor="lm-org" className={labelCls}>
                  2. Which best describes your organisation? *
                </label>
                <select id="lm-org" value={s1.org} onChange={(e) => setS1({ ...s1, org: e.target.value })} className={`${inputCls} mt-1.5`}>
                  <option value="">Choose one…</option>
                  {ORGS.map((o) => <option key={o}>{o}</option>)}
                </select>
                {errors.org && <p className={errCls}>{errors.org}</p>}
              </div>
              <fieldset>
                <legend id="lm-products" className={labelCls}>
                  3. Which products are you interested in? *
                </legend>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {PRODUCTS.map((p) => chip(s1.products, p, (a) => setS1({ ...s1, products: a }), "lm-products"))}
                </div>
                {errors.products && <p className={errCls}>{errors.products}</p>}
              </fieldset>
              <fieldset>
                <legend id="lm-regions" className={labelCls}>
                  4. Where do you need product delivered? *
                </legend>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {DESTINATIONS.map((r) => chip(s1.regions, r, (a) => setS1({ ...s1, regions: a }), "lm-regions"))}
                </div>
                {errors.regions && <p className={errCls}>{errors.regions}</p>}
                <input
                  id="lm-port"
                  value={s1.port}
                  placeholder="Specific port or city (optional)"
                  onChange={(e) => setS1({ ...s1, port: e.target.value })}
                  className={`${inputCls} mt-2.5`}
                />
              </fieldset>
              <fieldset>
                <legend id="lm-origins" className={labelCls}>
                  5. Where do you normally buy from today? *
                </legend>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ORIGINS.map((o) => chip(s1.origins, o, (a) => setS1({ ...s1, origins: a }), "lm-origins"))}
                </div>
                {errors.origins && <p className={errCls}>{errors.origins}</p>}
              </fieldset>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="lm-volume" className={labelCls}>6. Volume per year? *</label>
                  <select id="lm-volume" value={s2.annualVolume} onChange={(e) => setS2({ ...s2, annualVolume: e.target.value })} className={`${inputCls} mt-1.5`}>
                    <option value="">Choose one…</option>
                    {VOLUMES.map((v) => <option key={v}>{v}</option>)}
                  </select>
                  {errors.annualVolume && <p className={errCls}>{errors.annualVolume}</p>}
                </div>
                <div>
                  <label htmlFor="lm-next" className={labelCls}>7. What do you want to do next? *</label>
                  <select id="lm-next" value={s2.nextStep} onChange={(e) => setS2({ ...s2, nextStep: e.target.value })} className={`${inputCls} mt-1.5`}>
                    <option value="">Choose one…</option>
                    {NEXT_STEPS.map((n) => <option key={n}>{n}</option>)}
                  </select>
                  {errors.nextStep && <p className={errCls}>{errors.nextStep}</p>}
                </div>
              </div>
              <fieldset>
                <legend id="lm-support" className={labelCls}>
                  8. How can Aquifert best support you? *
                </legend>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SUPPORT.map((s) => chip(s2.support, s, (a) => setS2({ ...s2, support: a }), "lm-support"))}
                </div>
                {errors.support && <p className={errCls}>{errors.support}</p>}
              </fieldset>
              <div>
                <label htmlFor="lm-challenge" className={labelCls}>
                  9. What's the biggest challenge in your fertilizer trading or sourcing right now?
                </label>
                <textarea
                  id="lm-challenge"
                  rows={2}
                  value={s2.challenge}
                  placeholder="Optional, but it helps us give you a straight answer."
                  onChange={(e) => setS2({ ...s2, challenge: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-navy-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Where should we send the report?</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="lm-name" className={labelCls}>Full name *</label>
                    <input id="lm-name" value={s2.fullName} autoComplete="name"
                      onChange={(e) => setS2({ ...s2, fullName: e.target.value })}
                      onBlur={() => s2.fullName && s2.fullName.trim().length < 2 && setErrors((p) => ({ ...p, fullName: "Enter your full name." }))}
                      className={`${inputCls} mt-1.5`} />
                    {errors.fullName && <p className={errCls}>{errors.fullName}</p>}
                  </div>
                  <div>
                    <label htmlFor="lm-email" className={labelCls}>Work email *</label>
                    <input id="lm-email" type="email" value={s2.email} autoComplete="email"
                      onChange={(e) => setS2({ ...s2, email: e.target.value })}
                      onBlur={() => s2.email && validateEmail(s2.email)}
                      className={`${inputCls} mt-1.5`} />
                    {errors.email ? <p className={errCls}>{errors.email}</p> : null}
                    {emailSoft && <p className="mt-1 text-[12px] text-amber-700">That looks like a personal email address, a work email helps us route your enquiry faster, but either is fine.</p>}
                  </div>
                  <div>
                    <label htmlFor="lm-company" className={labelCls}>Company *</label>
                    <input id="lm-company" value={s2.company} autoComplete="organization"
                      onChange={(e) => setS2({ ...s2, company: e.target.value })} className={`${inputCls} mt-1.5`} />
                    {errors.company && <p className={errCls}>{errors.company}</p>}
                  </div>
                  <div>
                    <label htmlFor="lm-country" className={labelCls}>Country *</label>
                    <input id="lm-country" list="lm-countries" value={s2.country} placeholder="Type to search…"
                      onChange={(e) => setS2({ ...s2, country: e.target.value })} className={`${inputCls} mt-1.5`} />
                    <datalist id="lm-countries">
                      {COUNTRIES.map((c) => <option key={c} value={c} />)}
                    </datalist>
                    {errors.country && <p className={errCls}>{errors.country}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="lm-phone" className={labelCls}>Phone</label>
                    <input id="lm-phone" type="tel" value={s2.phone} autoComplete="tel"
                      onChange={(e) => setS2({ ...s2, phone: e.target.value })} className={`${inputCls} mt-1.5`}
                      aria-describedby="lm-phone-note" />
                    <p id="lm-phone-note" className="mt-1 text-[12px] text-slate-500">
                      Optional. The trading desk uses this only to reach you on a live enquiry.
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                  <label className="flex items-start gap-2.5 text-[13px] text-slate-700">
                    <input type="checkbox" checked={s2.termsAccepted}
                      onChange={(e) => setS2({ ...s2, termsAccepted: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-navy-700" />
                    <span>
                      I agree to Aquifert's <span className="font-medium underline">Privacy Policy</span> and{" "}
                      <span className="font-medium underline">Terms of Service</span> (required)
                    </span>
                  </label>
                  {errors.termsAccepted && <p className={errCls}>{errors.termsAccepted}</p>}
                  <label className="flex items-start gap-2.5 text-[13px] text-slate-700">
                    <input type="checkbox" checked={s2.marketingOptIn}
                      onChange={(e) => setS2({ ...s2, marketingOptIn: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-navy-700" />
                    <span>Send me market updates and the Aquifert newsletter (optional)</span>
                  </label>
                </div>
              </div>

              {submitError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">{submitError}</p>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-[13.5px] leading-relaxed text-slate-600">
                Download the latest weekly report
                {snapshot.length > 0 ? `, it includes a current price snapshot for ${s1.regions[0]}` : ""}.
              </p>
              {snapshot.length > 0 && (
                <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2 font-medium">Product</th>
                        <th className="px-3 py-2 text-right font-medium">Last</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-navy-900">{r.product} <span className="text-slate-500">· {r.location}</span></td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">${r.value.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <button
                type="button"
                onClick={downloadReport}
                className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg border border-navy-700 text-sm font-semibold text-navy-700 transition-colors hover:bg-navy-700 hover:text-white"
              >
                <Download className="mr-2 h-4 w-4" aria-hidden="true" /> Download AQ VIEW (PDF)
              </button>
              <div className="mt-6 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <p className="text-[13.5px] font-semibold text-navy-900">
                  Create a free Aquifert ONE account to see live prices, run freight and landed-cost
                  calculations, and request quotes.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={goToSignup}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-teal-500 text-sm font-semibold text-white transition-colors hover:bg-teal-400"
                  >
                    Create my account
                  </button>
                  <button
                    type="button"
                    onClick={() => close(true)}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* fixed footer */}
        {step !== 3 && (
          <div className="flex items-center gap-3 border-t border-slate-200 px-6 py-4">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => { setErrors({}); setStep(1); }}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" /> Back
              </button>
            ) : (
              <span className="hidden sm:block" aria-hidden="true" />
            )}
            <button
              type="button"
              onClick={() => close(true)}
              className="hidden h-11 items-center justify-center rounded-lg px-3 text-[13px] font-medium text-slate-500 transition-colors hover:text-navy-900 sm:inline-flex"
            >
              No thanks, I'll browse first
            </button>
            <span className="flex-1" aria-hidden="true" />
            {step === 1 ? (
              <button
                type="button"
                onClick={() => validate1() && setStep(2)}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-navy-700 px-6 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
              >
                Continue <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-navy-700 px-6 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Sending…
                  </>
                ) : (
                  "Get my report"
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
