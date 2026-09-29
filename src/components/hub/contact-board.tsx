"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { CalendarClock, FileText, MessageSquare, Phone, Send, X } from "lucide-react";
import { sendContactMessage } from "@/app/hub/contact/actions";

const WHATSAPP = "https://wa.me/?text=Hello%20Aquifert%20Support";
const CALENDLY = "https://calendly.com/aquifert?hide_gdpr_banner=1";

type View = "cards" | "meeting" | "message";

export function ContactBoard({ name, email }: { name: string; email: string }) {
  const [view, setView] = useState<View>("cards");
  const [sent, setSent] = useState<"remote" | "local" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (view !== "meeting") return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setView("cards");
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [view]);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Contact Us</h1>
        <p className="mt-1 text-sm text-mid">Choose how you want to reach the desk. Each option opens its own view.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 no-underline"
        >
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
              <MessageSquare className="h-4 w-4 text-teal" />
              Start a WhatsApp chat
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mid">
              Quick questions? Start a WhatsApp chat with our support team and get a fast reply.
            </p>
          </div>
          <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white">
            <Phone className="h-4 w-4" />
            Start WhatsApp
          </span>
        </a>

        <button
          type="button"
          onClick={() => setView("meeting")}
          className={`flex flex-col justify-between rounded-xl border bg-surface p-5 text-left ${
            view === "meeting" ? "border-blue ring-2 ring-blue/20" : "border-border"
          }`}
        >
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
              <CalendarClock className="h-4 w-4 text-blue" />
              Arrange a meeting
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mid">
              Schedule a time on our calendar to discuss your needs. Choose a slot that suits you.
            </p>
          </div>
          <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white">
            <CalendarClock className="h-4 w-4" />
            Schedule a meeting
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSent(null);
            setError(null);
            setView("message");
          }}
          className={`flex flex-col justify-between rounded-xl border bg-surface p-5 text-left ${
            view === "message" ? "border-amber-500 ring-2 ring-amber-500/20" : "border-border"
          }`}
        >
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
              <Send className="h-4 w-4 text-amber-500" />
              Send us a message
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mid">Use our contact form to send your request and we will get back to you.</p>
          </div>
          <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white">
            <Send className="h-4 w-4" />
            Open contact form
          </span>
        </button>

        <Link href="/hub/order-desk" className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 no-underline">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
              <FileText className="h-4 w-4 text-blue" />
              Open Order Desk
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-mid">
              Looking for pricing and availability? Submit your request in Order Desk and the Aquifert trading desk will respond with a quote.
            </p>
          </div>
          <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white">
            <FileText className="h-4 w-4" />
            Open Order Desk
          </span>
        </Link>
      </div>

      {view === "meeting" ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1a3a5c]/45 p-4"
          role="presentation"
          onClick={() => setView("cards")}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="meeting-title"
            className="flex h-[min(85vh,780px)] w-full max-w-[980px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 id="meeting-title" className="text-base font-bold text-ink">Schedule a meeting</h2>
              <button type="button" onClick={() => setView("cards")} className="rounded-lg border border-border p-1.5 text-mid" aria-label="Close scheduler">
                <X className="h-4 w-4" />
              </button>
            </header>
            <iframe
              src={CALENDLY}
              title="Aquifert Calendly scheduling"
              className="min-h-0 w-full flex-1 border-0"
            />
          </section>
        </div>
      ) : null}

      {view === "message" ? (
        <section className="rounded-xl border border-border bg-surface p-5">
          <header className="flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">Contact Us</h2>
            <button type="button" onClick={() => setView("cards")} className="rounded-lg border border-border p-1.5 text-mid" aria-label="Close contact form">
              <X className="h-4 w-4" />
            </button>
          </header>
          {sent ? (
            <p className="mt-4 rounded-lg bg-s2 px-3 py-3 text-sm leading-relaxed text-ink">
              {sent === "remote"
                ? "Message sent. The desk will reply to the email you entered."
                : "Message captured in this preview. Connect Supabase to deliver it to the desk."}
            </p>
          ) : (
            <form
              className="mt-4 grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                setError(null);
                startTransition(async () => {
                  const result = await sendContactMessage({
                    name: String(data.get("name") ?? ""),
                    email: String(data.get("email") ?? ""),
                    company: String(data.get("company") ?? ""),
                    message: String(data.get("message") ?? ""),
                  });
                  if (!result.ok) {
                    setError(result.message);
                    return;
                  }
                  setSent(result.delivered ? "remote" : "local");
                });
              }}
            >
              <label className="block text-sm text-mid">
                Name
                <input name="name" required defaultValue={name} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-ink" />
              </label>
              <label className="block text-sm text-mid">
                Email
                <input name="email" type="email" required defaultValue={email} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-ink" />
              </label>
              <label className="block text-sm text-mid sm:col-span-2">
                Company
                <input name="company" className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-ink" />
              </label>
              <label className="block text-sm text-mid sm:col-span-2">
                Message
                <textarea name="message" required rows={5} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-ink" />
              </label>
              {error ? <p className="text-sm text-danger sm:col-span-2">{error}</p> : null}
              <button type="submit" disabled={pending} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2">
                {pending ? "Sending..." : "Send message"}
              </button>
            </form>
          )}
        </section>
      ) : null}
    </div>
  );
}
