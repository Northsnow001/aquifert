/**
 * Help, public help centre with the Aquibot assistant. Aquibot answers from
 * a curated knowledge base of the platform, membership and trading process;
 * anything it can't answer routes to the human desk.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Bot, Send, User } from "lucide-react";
import { MarketingLayout } from "@/components/MarketingLayout";
import { Seo } from "@/components/shared/Seo";
import { Reveal } from "@/components/shared/Reveal";

type Msg = { from: "bot" | "user"; text: string };

const KB: { match: string[]; answer: string }[] = [
  {
    match: ["member", "pricing", "plan", "cost", "price of membership", "subscription", "sprout", "harvest", "scale"],
    answer:
      "Membership replaces per-tonne margin with one flat fee: Sprout £2,000/month (up to 50t), Harvest £5,000/month (51–200t) and Scale £7,000/month (201t+). Annual billing saves two months on every tier. Full details are on the Membership page.",
  },
  {
    match: ["quote", "request", "buy", "purchase", "order", "source", "sourcing"],
    answer:
      "Create a free account, then raise a sourcing request with product, tonnage, destination and delivery window. Our desk matches you with vetted suppliers and returns a landed-cost quote, product, freight, clearing and duties itemised.",
  },
  {
    match: ["freight", "shipping", "delivery", "voyage", "tracking", "container", "port"],
    answer:
      "Every order carries a live shipment record, vessel, container, bill of lading and ten milestone checkpoints from gate-in to out-for-delivery, with revised ETAs surfaced automatically. The Freight Calculator gives instant cost estimates before you commit.",
  },
  {
    match: ["price", "prices", "market", "data", "index", "assessment"],
    answer:
      "Signed-in users see live market data in the Hub, nitrogen, phosphate and potash gauges, desk commentary, price boards and freight analytics. Price indications are compiled from public sources and Aquifert desk assessments; they are information only, not a price assessment.",
  },
  {
    match: ["supplier", "sell", "producer", "selling"],
    answer:
      "Suppliers pass KYC/KYB review, then receive vetted buyer demand through the supplier portal, AI-polished quotes, escrowed payouts and advisory support on execution from factory to port. Register and choose the supplier path to start.",
  },
  {
    match: ["financ", "credit", "invoice", "payment terms"],
    answer:
      "Harvest and Scale members can finance up to 85% of a verified invoice over 30, 60 or 90 days, with e-signature and automated repayment schedules.",
  },
  {
    match: ["account", "register", "sign up", "signup", "log in", "login", "password"],
    answer:
      "Use Request access or the Register page to create your account, sign-in is by email with a one-time passcode. If you're locked out, the Forgot password link on the login page will get you back in.",
  },
  {
    match: ["product", "urea", "dap", "map", "mop", "npk", "micronutrient", "water soluble", "zinc", "iron"],
    answer:
      "We trade water-soluble and specialty fertilizers, Urea, DAP, MOP, MAP and NPK grades for fertigation and foliar programmes, plus micronutrients including Zinc and Iron for high-value crops.",
  },
  {
    match: ["contact", "human", "person", "phone", "email", "desk", "talk"],
    answer:
      "The desk is at enquiry@aquifert.com. Include your company, product and tonnage and the right trader will reply within one business day.",
  },
  {
    match: ["safe", "trust", "vet", "kyc", "compliance", "anonymous"],
    answer:
      "Every counterparty passes credit and compliance checks before a quote is exchanged, and nothing that could reveal a supplier ever reaches a buyer. The engine flags, a human clears, that rule runs through the whole platform.",
  },
];

const FALLBACK =
  "That's beyond what I can answer confidently. The desk can, write to enquiry@aquifert.com with your question and a human will reply within one business day. Meanwhile, the Help topics below cover membership, quoting, freight and accounts.";

const SUGGESTIONS = [
  "How much does membership cost?",
  "How do I request a quote?",
  "How does shipment tracking work?",
  "How do I sell on Aquifert?",
];

function answer(q: string): string {
  const lower = q.toLowerCase();
  let best: { score: number; text: string } = { score: 0, text: FALLBACK };
  for (const k of KB) {
    const score = k.match.reduce((a, m) => a + (lower.includes(m) ? m.length : 0), 0);
    if (score > best.score) best = { score, text: k.answer };
  }
  return best.text;
}

function Aquibot() {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      from: "bot",
      text: "Hello, I'm Aquibot, the Aquifert assistant. Ask me about membership, quoting, freight, market data or your account. Anything I can't answer goes straight to the human desk.",
    },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setMsgs((m) => [...m, { from: "user", text: q }, { from: "bot", text: answer(q) }]);
    setInput("");
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[0_2px_4px_rgb(14_32_49/0.08),0_28px_60px_-20px_rgb(37_79_118/0.35)]">
      <div className="flex items-center gap-3 bg-navy-900 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500">
          <Bot className="h-5 w-5 text-white" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">Aquibot</p>
          <p className="text-[11px] text-slate-300">Aquifert help assistant, human desk one click away</p>
        </div>
      </div>
      <div ref={scrollRef} className="h-[340px] space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`flex items-start gap-2.5 ${m.from === "user" ? "flex-row-reverse" : ""}`}>
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                m.from === "bot" ? "bg-teal-100 text-teal-700" : "bg-navy-100 text-navy-700"
              }`}
            >
              {m.from === "bot" ? <Bot className="h-4 w-4" aria-hidden="true" /> : <User className="h-4 w-4" aria-hidden="true" />}
            </span>
            <p
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
                m.from === "bot" ? "rounded-tl-sm bg-muted text-navy-900" : "rounded-tr-sm bg-navy-700 text-white"
              }`}
            >
              {m.text}
            </p>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-3">
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full border border-slate-300 px-3 py-1 text-[12px] font-medium text-slate-600 transition-colors hover:border-teal-600 hover:text-teal-700"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <label htmlFor="aquibot-input" className="sr-only">Ask Aquibot a question</label>
          <input
            id="aquibot-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about membership, freight, quotes…"
            className="h-10 w-full rounded-full border border-slate-300 bg-white px-4 text-sm text-navy-900 placeholder:text-slate-400 focus:border-navy-700 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white transition-colors hover:bg-teal-400"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}

const TOPICS = [
  {
    title: "Membership & billing",
    body: "Tiers, tonnage limits, annual billing and cancellations, Sprout, Harvest and Scale compared.",
    to: "/membership",
  },
  {
    title: "Requesting quotes",
    body: "Raise a sourcing request, receive landed-cost quotes from vetted suppliers, accept and fund.",
    to: "/platform",
  },
  {
    title: "Freight & tracking",
    body: "Ten milestone checkpoints, live vessel positions, revised ETAs and documents on every order.",
    to: "/platform",
  },
  {
    title: "Why Aquifert",
    body: "Due diligence, the supply-chain network and twenty years of trading behind every quote.",
    to: "/why-aquifert",
  },
];

export default function Help() {
  return (
    <MarketingLayout>
      <Seo
        title="Help & Aquibot, Aquifert Support"
        description="Get help with Aquifert: ask Aquibot about membership, quoting, freight tracking and accounts, or browse help topics and contact the trading desk."
        keywords="aquifert help, aquibot, fertilizer trading support, membership questions, freight tracking help"
        path="/help"
      />

      <section className="bg-navy-900" aria-labelledby="help-heading">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-teal-300">Help centre</p>
            <h1 id="help-heading" className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
              Ask Aquibot. <span className="text-teal-300">Or ask the desk.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
              Instant answers on membership, quoting, freight and your account, 
              with a human trader behind every escalation.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-label="Aquibot assistant">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_380px]">
          <Reveal>
            <Aquibot />
          </Reveal>
          <Reveal delay={100}>
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-navy-900 dark:text-white">Browse help topics</h2>
              {TOPICS.map((t) => (
                <Link
                  key={t.title}
                  to={t.to}
                  className="group block rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="flex items-center justify-between text-sm font-semibold text-navy-900 dark:text-white">
                    {t.title}
                    <ArrowRight className="h-4 w-4 text-teal-600 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">{t.body}</p>
                </Link>
              ))}
              <div className="rounded-2xl bg-navy-900 p-5">
                <p className="text-sm font-semibold text-white">Still need a human?</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300">
                  The desk answers within one business day.
                </p>
                <a
                  href="mailto:enquiry@aquifert.com"
                  className="mt-4 inline-flex items-center rounded-full bg-teal-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-teal-400"
                >
                  Email the desk <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </MarketingLayout>
  );
}
