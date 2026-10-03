"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { CalendarClock, CheckCircle2, CircleAlert, FileText, MessageSquare, Phone, Send, X } from "lucide-react";
import { sendContactMessage } from "@/app/hub/contact/actions";
import { areaClass, btnPrimary, fieldClass, labelClass, noticeError, noticeOk } from "@/components/app/form";

const WHATSAPP = "https://wa.me/?text=Hello%20Aquifert%20Support";
const CALENDLY = "https://calendly.com/aquifert?hide_gdpr_banner=1";

type View = "cards" | "meeting" | "message";

export function ContactBoard({ name, email, topic = "" }: { name: string; email: string; topic?: string }) {
  const [view, setView] = useState<View>(topic ? "message" : "cards");
  const [about, setAbout] = useState(topic);
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

  const tile = "aq-card aq-lift group flex flex-col gap-3 p-5 text-left no-underline";
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink md:text-[30px]">Contact Us</h1>
        <p className="mt-1 text-[15.5px] text-mid">Choose how you want to reach the desk.</p>
      </div>

      <div className="aq-stagger grid gap-3 sm:grid-cols-2">
        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className={tile}>
          <span className="aq-chip flex h-10 w-10 items-center justify-center rounded-xl text-white">
            <MessageSquare className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="text-[17px] font-semibold text-ink">Start a WhatsApp chat</h2>
            <p className="mt-1 text-[15px] leading-relaxed text-mid">Quick questions? Message the support team and get a fast reply.</p>
          </div>
          <span className="mt-auto inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#2f8a66]">
            <Phone className="h-4 w-4" /> Start WhatsApp
          </span>
        </a>

        <button type="button" onClick={() => setView("meeting")} className={`${tile} ${view === "meeting" ? "ring-2 ring-blue/30" : ""}`}>
          <span className="aq-chip aq-chip-blue flex h-10 w-10 items-center justify-center rounded-xl text-white">
            <CalendarClock className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="text-[17px] font-semibold text-ink">Arrange a meeting</h2>
            <p className="mt-1 text-[15px] leading-relaxed text-mid">Pick a slot on the desk calendar that suits you.</p>
          </div>
          <span className="mt-auto inline-flex items-center gap-1.5 text-[15px] font-semibold text-blue">
            <CalendarClock className="h-4 w-4" /> Schedule a meeting
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSent(null);
            setError(null);
            setView("message");
          }}
          className={`${tile} ${view === "message" ? "ring-2 ring-[#d9951f]/35" : ""}`}
        >
          <span className="aq-chip aq-chip-amber flex h-10 w-10 items-center justify-center rounded-xl text-white">
            <Send className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="text-[17px] font-semibold text-ink">Send us a message</h2>
            <p className="mt-1 text-[15px] leading-relaxed text-mid">Write to the desk and we reply by email.</p>
          </div>
          <span className="mt-auto inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#b87a12]">
            <Send className="h-4 w-4" /> Open contact form
          </span>
        </button>

        <Link href="/hub/order-desk" className={tile}>
          <span className="aq-chip aq-chip-blue flex h-10 w-10 items-center justify-center rounded-xl text-white">
            <FileText className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h2 className="text-[17px] font-semibold text-ink">Open Order Desk</h2>
            <p className="mt-1 text-[15px] leading-relaxed text-mid">Need pricing and availability? Submit a request and the trading desk responds with a quote.</p>
          </div>
          <span className="mt-auto inline-flex items-center gap-1.5 text-[15px] font-semibold text-blue">
            <FileText className="h-4 w-4" /> Open Order Desk
          </span>
        </Link>
      </div>

      {view === "meeting" ? (
        <div
          className="aq-backdrop fixed inset-0 z-[80] flex items-end justify-center bg-[#0b1e2d]/45 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setView("cards")}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="meeting-title"
            className="aq-sheet flex h-[92dvh] w-full max-w-[980px] flex-col overflow-hidden rounded-t-[22px] bg-surface shadow-2xl sm:h-[min(85vh,780px)] sm:rounded-[22px]"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 id="meeting-title" className="text-[17px] font-semibold text-ink">Schedule a meeting</h2>
              <button type="button" onClick={() => setView("cards")} className="rounded-full bg-s3 p-1.5 text-mid hover:text-ink" aria-label="Close scheduler">
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
        <section className="aq-card aq-rise max-w-3xl p-5 md:p-6">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-semibold text-ink">Send the desk a message</h2>
              <p className="mt-0.5 text-[15px] text-mid">We reply to the email below.</p>
            </div>
            <button type="button" onClick={() => setView("cards")} className="rounded-full bg-s3 p-1.5 text-mid hover:text-ink" aria-label="Close contact form">
              <X className="h-4 w-4" />
            </button>
          </header>
          {sent ? (
            <p className={`${noticeOk} mt-5`}>
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              {sent === "remote"
                ? "Message sent. The desk will reply to the email you entered."
                : "Message captured in this preview. Connect Supabase to deliver it to the desk."}
            </p>
          ) : (
            <form
              className="mt-5 grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                setError(null);
                startTransition(async () => {
                  const body = String(data.get("message") ?? "");
                  const result = await sendContactMessage({
                    name: String(data.get("name") ?? ""),
                    email: String(data.get("email") ?? ""),
                    company: String(data.get("company") ?? ""),
                    message: about && body.trim() ? `About: ${about}\n\n${body}` : body,
                  });
                  if (!result.ok) {
                    setError(result.message);
                    return;
                  }
                  setSent(result.delivered ? "remote" : "local");
                });
              }}
            >
              <label className="block">
                <span className={labelClass}>Name</span>
                <input name="name" required autoComplete="name" defaultValue={name} className={fieldClass} />
              </label>
              <label className="block">
                <span className={labelClass}>Email</span>
                <input name="email" type="email" required autoComplete="email" defaultValue={email} className={fieldClass} />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelClass}>Company (optional)</span>
                <input name="company" autoComplete="organization" className={fieldClass} />
              </label>
              <div className="sm:col-span-2">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="contact-message" className="block text-[14.5px] font-medium text-mid">
                    Message
                  </label>
                  {about ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-light py-0.5 pl-2.5 pr-1 text-[13px] font-semibold text-blue">
                      About: {about}
                      <button type="button" onClick={() => setAbout("")} aria-label={`Remove the ${about} topic`} className="rounded-full p-0.5 hover:bg-blue/10">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ) : null}
                </div>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={5}
                  autoFocus={Boolean(topic)}
                  placeholder={about ? `What would you like to ask about ${about.toLowerCase()}?` : "What can the desk help with?"}
                  className={areaClass}
                />
                {about ? <p className="mt-1.5 text-[13px] text-dim">The topic is added to your message so it reaches the right person.</p> : null}
              </div>
              {error ? (
                <p className={`${noticeError} sm:col-span-2`}>
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </p>
              ) : null}
              <div className="flex justify-end sm:col-span-2">
                <button type="submit" disabled={pending} className={`${btnPrimary} w-full sm:w-auto`}>
                  <Send className="h-4 w-4" />
                  {pending ? "Sending…" : "Send message"}
                </button>
              </div>
            </form>
          )}
        </section>
      ) : null}
    </div>
  );
}
