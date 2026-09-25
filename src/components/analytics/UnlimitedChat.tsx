/**
 * Aquibot Unlimited — the engine-backed assistant (PLANS PART 3, Section 2).
 * Unlimited conversation, full entitled corpus, desk-attributed views,
 * sourced figures only, advice refused, every turn logged.
 */
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { MessageCircle, Phone, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/providers/trpc";
import { Link } from "react-router";

type Msg = { from: "bot" | "user"; text: string; sources?: string[] };

const SUGGESTIONS = [
  "What's the latest sourced urea level?",
  "Spread: DAP vs urea",
  "Urea 90-day outlook",
  "What happens to the urea cost floor if gas reaches $12/MMBtu?",
  "What's arriving at Mundra?",
  "Should I buy 5,000 tonnes of urea now?",
];

export function UnlimitedChat({ greeting }: { greeting: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: greeting }]);
  const [input, setInput] = useState("");
  const location = useLocation();
  const ask = trpc.aquibot.ask.useMutation();
  const feedback = trpc.aquibot.feedback.useMutation();
  const bottom = useRef<HTMLDivElement>(null);
  const [lastTurn, setLastTurn] = useState<number | null>(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q || ask.isPending) return;
    setMsgs((m) => [...m, { from: "user", text: q }]);
    setInput("");
    // The screen the user is looking at rides along as context (1.11).
    // A screen label handed over by Trader in your pocket (?context=…) wins.
    const handedOver = new URLSearchParams(location.search).get("context");
    const context = handedOver
      ? `${handedOver} (arrived from)`
      : document.title
        ? `${document.title} (${location.pathname})`
        : location.pathname;
    ask.mutate({ query: q, context }, {
      onSuccess: (r) => {
        setMsgs((m) => [...m, { from: "bot", text: r.text, sources: r.sources }]);
        setLastTurn(r.turnId ?? null);
      },
      onError: (e) => setMsgs((m) => [...m, { from: "bot", text: e.message }]),
    });
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
        <p className="flex items-center gap-2 text-sm font-semibold"><MessageCircle className="h-4 w-4 text-teal-500" aria-hidden="true" /> Aquibot Unlimited</p>
        <Button asChild size="sm" variant="outline">
          <a href="tel:+442045772026"><Phone className="mr-1.5 h-3.5 w-3.5" /> Call the desk</a>
        </Button>
      </div>

      <div className="max-h-[26rem] min-h-[16rem] space-y-4 overflow-y-auto p-4" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={m.from === "user" ? "flex justify-end" : ""}>
            <div className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${m.from === "user" ? "bg-navy-800 text-white" : "bg-muted/70"}`}>
              <p className="whitespace-pre-wrap">{m.text}</p>
              {m.sources?.length ? (
                <p className="mt-2 border-t border-border/60 pt-1.5 text-[11px] text-muted-foreground">Sources: {m.sources.join(" · ")}</p>
              ) : null}
              {m.from === "bot" && i > 0 && (
                <span className="mt-1.5 flex gap-1">
                  <button className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Good answer" onClick={() => lastTurn && feedback.mutate({ turnId: lastTurn, feedback: "UP" })}><ThumbsUp className="h-3.5 w-3.5" /></button>
                  <button className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Bad answer" onClick={() => lastTurn && feedback.mutate({ turnId: lastTurn, feedback: "DOWN" })}><ThumbsDown className="h-3.5 w-3.5" /></button>
                </span>
              )}
            </div>
          </div>
        ))}
        {ask.isPending && <p className="text-xs text-muted-foreground">Aquibot is checking sources…</p>}
        <div ref={bottom} />
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent/50">
              {s}
            </button>
          ))}
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about prices, spreads, outlooks, scenarios, vessels, freight…"
            aria-label="Message Aquibot"
            className="h-11 flex-1 rounded-md border border-border bg-background px-4 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
          />
          <button type="submit" aria-label="Send message" className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-teal-500 text-white hover:bg-teal-600">
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Sourced answers only — figures are cited or not stated. Views are labelled. <Link to="/account/contact" className="font-medium text-teal-700 hover:underline dark:text-teal-300">Talk to a human</Link>
        </p>
      </div>
    </div>
  );
}
