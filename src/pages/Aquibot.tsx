import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Bot, Send, Sparkles, User } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { trpc } from "@/providers/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { MEMBERSHIP_PLANS } from "@contracts/constants";
import { gbp } from "@/lib/format";

type Msg = { role: "user" | "bot"; text: string; links?: { to: string; label: string }[] };

type Topic = {
  match: string[];
  answer: string;
  links?: { to: string; label: string }[];
};

const BUYER_JOURNEY = ["Become a member", "New request", "Quotes", "Order & tracking", "Invoice & financing"];

const KB: Topic[] = [
  {
    match: ["member", "subscription", "subscribe", "upgrade", "plan", "tier", "sprout", "harvest", "scale", "price", "cost", "fee"],
    answer:
      "Membership is one flat monthly fee that replaces per-tonne margin: Sprout £2,000/month (up to 50t), Harvest £5,000/month (51–200t) and Scale £7,000/month (201t+). Annual billing saves two months on every tier. Subscribe from the Membership page, the moment payment succeeds, New Request, Quotes & Invoices, Orders, Market Insights and Financing unlock in your menu.",
    links: [{ to: "/buyer/membership", label: "Open Membership" }],
  },
  {
    match: ["free", "non-member", "without membership", "what can i do", "locked", "unlock", "access"],
    answer:
      "On the free plan you can use the Hub, your Dashboard, the Nitrogen Report and me, Aquibot. Subscribing unlocks the full trading workflow: New Request, Quotes & Invoices, Orders, Market Insights and Financing. You can subscribe any time from the Membership page.",
    links: [{ to: "/buyer/membership", label: "See the tiers" }],
  },
  {
    match: ["request", "new request", "create", "rfq", "inquiry", "enquiry", "buy", "source", "sourcing", "tonnage"],
    answer:
      "Go to New Request, tell us the product, grade, tonnage, destination and delivery window. Your request becomes a structured deal card that our desk verifies, then it is broadcast to vetted suppliers. Nothing reaches a supplier until a human has cleared it.",
    links: [{ to: "/buyer/request", label: "Start a new request" }],
  },
  {
    match: ["quote", "quotation", "offer", "price quote", "compare", "breakdown", "landed"],
    answer:
      "Supplier replies arrive in Quotes & Invoices. Each is rewritten into a clean, buyer-ready quote with a full landed-cost breakdown, product, freight, clearing and duties. Members see every line, including our margin: £0. Accept the quote that fits and it becomes an order.",
    links: [{ to: "/buyer/quotes", label: "Open Quotes & Invoices" }],
  },
  {
    match: ["invoice", "payment", "pay", "billing", "proforma"],
    answer:
      "Invoices live alongside their quotes in Quotes & Invoices. Every invoice traces back to the accepted quote and the order it funds, product, freight, clearing, duties and the stated fee, line by line.",
    links: [{ to: "/buyer/quotes", label: "View invoices" }],
  },
  {
    match: ["order", "tracking", "shipment", "delivery", "vessel", "container", "eta", "milestone", "freight", "logistics"],
    answer:
      "Every accepted quote becomes an order with a live shipment record: container, vessel and carrier, plotted across ten milestones from gate-in to out-for-delivery, with exception alerts and revised ETAs surfaced before you have to ask. Documents, B/L, invoices, packing lists, sit on the order record.",
    links: [{ to: "/buyer/orders", label: "Track orders" }],
  },
  {
    match: ["financ", "85%", "credit", "cash flow", "advance", "discounting"],
    answer:
      "Harvest and Scale members can finance up to 85% of a verified fertilizer invoice over 30, 60 or 90 days, with e-signature and automated repayment schedules. Advances typically land within 48 hours of approval.",
    links: [{ to: "/buyer/financing", label: "Open Financing" }],
  },
  {
    match: ["nitrogen", "report", "urea", "ammonia", "weekly"],
    answer:
      "The Nitrogen Report is our weekly read on the nitrogen complex, urea, ammonia, AN/CAN and UAN, with price moves, trade flows and the desk's view on what happens next. It is free for every signed-in user.",
    links: [{ to: "/nitrogen-report", label: "Read the Nitrogen Report" }],
  },
  {
    match: ["market", "insight", "heatmap", "volatility", "history", "trend"],
    answer:
      "Market Insights gives members 26 weeks of price history across five commodities and four regions, regional heatmaps, volatility indicators and AI-generated trade recommendations, broadcast on a schedule.",
    links: [{ to: "/buyer/insights", label: "Open Market Insights" }],
  },
  {
    match: ["hub", "activity", "notification", "inbox", "update"],
    answer:
      "The Hub is your live activity feed, request status changes, quote arrivals, order milestones and desk messages in one stream. If something needs your attention, it surfaces here first.",
    links: [{ to: "/hub", label: "Open the Hub" }],
  },
  {
    match: ["dashboard", "overview", "snapshot", "summary", "home"],
    answer:
      "Your Dashboard is the morning briefing: open requests, quotes waiting on you, orders in motion and a market snapshot. Free users see market data and commentary here too, everything else unlocks with membership.",
    links: [{ to: "/buyer", label: "Open Dashboard" }],
  },
  {
    match: ["supplier", "counterparty", "kyc", "kyb", "vetted", "trust", "safe", "anon"],
    answer:
      "Every counterparty passes credit and compliance checks before a quote is exchanged, and nothing that could reveal a supplier ever reaches a buyer. The engine flags, a human clears, that rule runs through the whole platform.",
  },
  {
    match: ["journey", "process", "how does it work", "steps", "flow", "start", "begin", "workflow"],
    answer:
      "Your journey runs in five steps: (1) become a member, (2) raise a New Request, (3) compare transparent quotes and accept one, (4) track the order across ten milestones to your gate, (5) settle the invoice, or finance up to 85% of it. I can walk you through any step.",
  },
  {
    match: ["human", "person", "desk", "contact", "email", "support", "help me", "agent"],
    answer:
      "The desk answers within one business day at enquiry@aquifert.com. For anything account-specific, include your company name and the email you signed up with.",
    links: [{ to: "/help", label: "Open the Help centre" }],
  },
];

const FALLBACK =
  "I don't have that in my playbook yet, the human desk does. Email enquiry@aquifert.com and they will answer within one business day. Meanwhile, I can help with membership, requests, quotes, orders, tracking, financing, reports and market insights.";

function answerFor(q: string): Topic {
  const lower = q.toLowerCase();
  let best: Topic | null = null;
  let bestScore = 0;
  for (const k of KB) {
    const score = k.match.reduce((a, m) => a + (lower.includes(m) ? m.length : 0), 0);
    if (score > bestScore) { best = k; bestScore = score; }
  }
  return best ?? { match: [], answer: FALLBACK };
}

function ChatPanel({ greeting, suggestions, liveAnswer }: { greeting: string; suggestions: string[]; liveAnswer?: (q: string) => Promise<Topic | null> }) {
  const [messages, setMessages] = useState<Msg[]>([{ role: "bot", text: greeting }]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const ask = (q: string) => {
    if (!q.trim()) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    if (liveAnswer) {
      liveAnswer(q)
        .then((t) => setMessages((m) => [...m, { role: "bot", text: (t ?? answerFor(q)).answer, links: (t ?? answerFor(q)).links }]))
        .catch(() => {
          const t = answerFor(q);
          setMessages((m) => [...m, { role: "bot", text: t.answer, links: t.links }]);
        });
      return;
    }
    const t = answerFor(q);
    setMessages((m) => [...m, { role: "bot", text: t.answer, links: t.links }]);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgb(14_32_49/0.06),0_8px_24px_-16px_rgb(14_32_49/0.25)]">
      {/* Panel header */}
      <div className="flex items-center gap-3 border-b border-border bg-muted/50 px-5 py-3.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-500 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3)]">
          <Bot className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">Aquibot</p>
          <p className="text-xs text-muted-foreground">Knows your whole journey, ask anything</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online
        </span>
      </div>

      {/* Message log */}
      <div ref={scrollRef} className="h-[380px] space-y-4 overflow-y-auto px-5 py-5" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <span
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                m.role === "bot" ? "bg-teal-500 text-white" : "bg-navy-600 text-white"
              }`}
            >
              {m.role === "bot" ? <Bot className="h-4 w-4" aria-hidden="true" /> : <User className="h-4 w-4" aria-hidden="true" />}
            </span>
            <div
              className={`max-w-[75%] rounded-lg px-4 py-3 text-sm leading-relaxed shadow-[0_1px_2px_rgb(14_32_49/0.08)] ${
                m.role === "bot"
                  ? "bg-muted text-foreground"
                  : "bg-navy-600 text-white dark:bg-navy-500"
              }`}
            >
              {m.text}
              {m.links && m.links.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {m.links.map((l) => (
                    <Link
                      key={l.to + l.label}
                      to={l.to}
                      className="inline-flex items-center gap-1 rounded-md border border-teal-600/30 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20"
                    >
                      {l.label} <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Suggestions + input */}
      <div className="border-t border-border px-5 py-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-navy-800 transition-colors hover:border-teal-500/40 hover:bg-teal-50 dark:text-slate-200 dark:hover:bg-teal-500/10"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about membership, requests, quotes, orders, financing…"
            className="h-11 flex-1 rounded-md border border-border bg-background px-4 text-sm outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          />
          <button
            type="submit"
            aria-label="Send message"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-teal-500 text-white transition-colors hover:bg-teal-600"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Aquibot() {
  const { user, portalRole, isMember, membership } = useProfile();
  const utils = trpc.useUtils();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  // Live tracking answers: buyers can ask where their shipment is. Data is
  // scoped server-side to the asker's own orders; anything unresolved falls
  // back to the static playbook.
  const TRACK_INTENT = ["where", "tracking", "track", "shipment", "vessel", "eta", "arrive", "arrival", "delivery", "container", "position", "port"];
  const liveAnswer =
    portalRole === "BUYER"
      ? async (q: string): Promise<Topic | null> => {
          const lower = q.toLowerCase();
          const isTracking = TRACK_INTENT.some((k) => lower.includes(k)) && !lower.includes("how does") && !lower.includes("how do");
          if (!isTracking) return null;
          const shipments = await utils.client.tracking.mine.query();
          if (!shipments.length) {
            return {
              match: [],
              answer:
                "Tracking is not live on any of your orders yet. Once your order is booked, the vessel, container and milestone feed appear here and on your Orders page, and you can ask me any time.",
              links: [{ to: "/buyer/orders", label: "Open Orders" }],
            };
          }
          const s = shipments[0];
          const done = (s.milestones as { label: string; done: boolean }[] | null)?.filter((m) => m.done).length ?? 0;
          const total = (s.milestones as unknown[] | null)?.length ?? 10;
          const eta = s.eta ? new Date(s.eta).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "to be confirmed";
          const delay = s.delayed && s.status !== "DELIVERED" ? ` There is a delivery exception: the ETA was revised by +${s.delayDays} day(s).` : "";
          return {
            match: [],
            answer:
              s.status === "DELIVERED"
                ? `Your shipment (${s.containerNumber}, ${s.vesselName}) has been delivered to ${s.destinationPort}. All ${total} milestones are complete.`
                : `Your shipment (${s.containerNumber}, ${s.vesselName}) is currently ${String(s.status).replace(/_/g, " ").toLowerCase()}, ${s.currentLocation}, on the ${s.departurePort} to ${s.destinationPort} leg. ${done} of ${total} milestones are complete and the ETA is ${eta}.${delay}`,
            links: [{ to: "/buyer/orders", label: "Open live tracking" }],
          };
        }
      : undefined;

  const { greeting, suggestions } = useMemo(() => {
    if (portalRole === "SUPPLIER") {
      return {
        greeting: `Hello ${firstName}, I'm Aquibot. I can walk you through your request inbox, quoting, order milestones, documents and payouts. What would you like to do?`,
        suggestions: ["How do I reply to a request?", "How do orders work?", "When do I get paid?", "Talk to a human"],
      };
    }
    if (portalRole !== "BUYER") {
      return {
        greeting: `Hello ${firstName}, I'm Aquibot. I can help with the draft queue, approvals, requests, orders and the trade desk. What do you need?`,
        suggestions: ["How does approval work?", "Explain the draft queue", "How do orders move?", "Talk to a human"],
      };
    }
    if (!isMember) {
      return {
        greeting: `Hello ${firstName}, I'm Aquibot, your guide on Aquifert ONE. You're on the free plan, so I can help you explore the Hub, Dashboard and Nitrogen Report, and when you're ready, I'll walk you through subscribing to unlock requests, quotes, orders, insights and financing.`,
        suggestions: ["What do members unlock?", "How much does membership cost?", "How does the buying journey work?", "What's on my Dashboard?"],
      };
    }
    const plan = membership?.tier ? MEMBERSHIP_PLANS.find((p) => p.tier === membership.tier) : undefined;
    return {
      greeting: `Welcome back, ${firstName}, you're on ${plan ? `${plan.name} (${gbp(plan.monthly)}/mo)` : "a membership"}. I can take you from a new request all the way to a financed invoice. Where are we today?`,
      suggestions: ["How do I create a request?", "Where is my shipment?", "How does financing work?", "Explain my invoices"],
    };
  }, [firstName, portalRole, isMember, membership]);

  // Journey stepper state
  const journey = BUYER_JOURNEY.map((label, i) => ({
    label,
    done: portalRole === "BUYER" ? (i === 0 ? isMember : false) : false,
    current: portalRole === "BUYER" ? (i === 0 ? !isMember : i === 1 && isMember) : false,
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Aquibot"
        description="Your AI guide, it understands the entire Aquifert process and helps at every step of your journey."
      />

      {/* Journey map */}
      {portalRole === "BUYER" && (
        <div className="mb-6 rounded-lg border border-border bg-card px-5 py-4">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-teal-500" /> Your journey
          </p>
          <ol className="flex flex-wrap items-center gap-y-2">
            {journey.map((s, i) => (
              <li key={s.label} className="flex items-center">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    s.done
                      ? "bg-teal-500 text-white"
                      : s.current
                        ? "border border-teal-500/50 bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
                        : "border border-border bg-muted/60 text-muted-foreground"
                  }`}
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${s.done ? "bg-white/25" : "bg-foreground/10"}`}>
                    {i + 1}
                  </span>
                  {s.label}
                </span>
                {i < journey.length - 1 && <span className="mx-1.5 h-px w-4 bg-border sm:w-6" aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </div>
      )}

      <ChatPanel key={greeting} greeting={greeting} suggestions={suggestions} liveAnswer={liveAnswer} />

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Aquibot answers from the Aquifert playbook. Anything it can't resolve goes straight to the human desk at{" "}
        <a href="mailto:enquiry@aquifert.com" className="font-medium text-teal-700 hover:underline dark:text-teal-300">
          enquiry@aquifert.com
        </a>
        .
      </p>
    </div>
  );
}
