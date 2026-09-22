import { useState } from "react";
import { Link } from "react-router";
import { MessageCircle, PhoneCall, Mail, PhoneForwarded, ArrowRight } from "lucide-react";
import { MarketingLayout } from "@/components/MarketingLayout";
import { Reveal } from "@/components/shared/Reveal";
import { VideoHero } from "@/components/shared/VideoHero";
import { Seo, ORGANIZATION_JSONLD, breadcrumbJsonLd } from "@/components/shared/Seo";
import { Faq, SectionHeader, faqJsonLd, type FaqItem } from "@/components/shared/Faq";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";

const CHANNELS = [
  {
    key: "whatsapp" as const,
    icon: MessageCircle,
    title: "WhatsApp the desk",
    desc: "Fastest for a quick question. Typically answered within a couple of hours in the trading day.",
  },
  {
    key: "book_call" as const,
    icon: PhoneCall,
    title: "Book a call",
    desc: "A scheduled 20-minute call with a trader. Usually available within 1–2 business days.",
  },
  {
    key: "message" as const,
    icon: Mail,
    title: "Send a message",
    desc: "Email-style message to the desk. We reply within one business day.",
  },
  {
    key: "callback" as const,
    icon: PhoneForwarded,
    title: "Request a callback",
    desc: "Leave your number in the message and we will call you back within one business day.",
  },
];

const CONTACT_FAQ: FaqItem[] = [
  {
    q: "How do I contact Aquifert?",
    a: "You can reach the Aquifert fertilizer trading desk four ways: WhatsApp for quick questions (answered within a couple of hours in the trading day), a booked 20-minute call with a trader (usually within 1–2 business days), an email-style message (reply within one business day), or a callback request.",
  },
  {
    q: "How fast does Aquifert respond to enquiries?",
    a: "WhatsApp messages are typically answered within a couple of hours during the trading day. Messages and callback requests receive a reply within one business day, and booked calls are usually available within 1–2 business days.",
  },
  {
    q: "Who will I speak to at Aquifert?",
    a: "Every channel reaches a human trader on the Aquifert desk, not a bot. The desk handles buyer sourcing, supplier onboarding, membership questions and trading support.",
  },
];

const CONTACT_SCHEMAS = [
  faqJsonLd(CONTACT_FAQ),
  breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Contact", path: "/contact" },
  ]),
  {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact the Aquifert fertilizer trading desk",
    url: "https://aquifert.com/contact",
    mainEntity: {
      "@type": "Organization",
      "@id": "https://aquifert.com/#organization",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        email: "enquiry@aquifert.com",
        availableLanguage: ["en", "zh"],
        areaServed: "GB",
      },
    },
  },
];

export default function ContactPage() {
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]["key"]>("message");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const send = trpc.leads.contact.useMutation({
    onSuccess: () => {
      setSent(true);
      toast.success("Sent — the desk has it");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <MarketingLayout>
      <Seo
        title="Contact Aquifert, Fertilizer Trading Desk | WhatsApp, Call, Message"
        description="Contact the Aquifert fertilizer trading desk by WhatsApp, a booked call with a trader, a message or a callback. WhatsApp answered within hours in the trading day; messages and callbacks within one business day."
        keywords="contact aquifert, fertilizer trading desk, fertilizer buyer support, fertilizer supplier onboarding, aquifert phone, aquifert whatsapp"
        path="/contact"
        jsonLd={[ORGANIZATION_JSONLD, ...CONTACT_SCHEMAS]}
      />

      <VideoHero
        src="/media/port-terminal.mp4"
        poster="/media/port-terminal.jpg"
        videoLabel="Aerial view of a container terminal moving fertilizer cargo through a seaport"
        center
      >
        <Reveal>
          <h1 className="aqf-hero-title mx-auto max-w-3xl text-balance text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl">
            Talk to the desk
          </h1>
          <p className="aqf-hero-sub mx-auto mt-6 max-w-2xl text-lg leading-relaxed sm:text-xl">
            Reach a person, not a screen. Four ways in, honest response times,
            and a trader on the other end.
          </p>
        </Reveal>
      </VideoHero>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Contact channel">
          {CHANNELS.map((c, i) => (
            <Reveal key={c.key} delay={i * 60} className="h-full">
              <button
                type="button"
                role="radio"
                aria-checked={channel === c.key}
                onClick={() => {
                  setChannel(c.key);
                  setSent(false);
                }}
                className={`h-full min-h-11 w-full rounded-3xl border bg-white p-6 text-left transition-colors dark:bg-transparent ${
                  channel === c.key
                    ? "border-teal-600 ring-1 ring-teal-600 dark:border-teal-500 dark:ring-teal-500"
                    : "border-slate-200 hover:border-navy-700 dark:border-slate-700 dark:hover:border-slate-500"
                }`}
              >
                <c.icon className="h-5 w-5 text-teal-700 dark:text-teal-400" aria-hidden="true" />
                <p className="mt-4 text-[15px] font-semibold text-navy-900 dark:text-white">{c.title}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">{c.desc}</p>
              </button>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <Card className="mt-8">
            <CardContent className="grid gap-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ct-name">Name</Label>
                  <Input id="ct-name" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </div>
                <div>
                  <Label htmlFor="ct-email">Email</Label>
                  <Input id="ct-email" type="email" className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </div>
              </div>
              <div>
                <Label htmlFor="ct-company">Company (optional)</Label>
                <Input id="ct-company" className="mt-1" value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
              </div>
              <div>
                <Label htmlFor="ct-msg">
                  Message {channel === "callback" ? "(include your phone number)" : channel === "book_call" ? "(suggest a day and time)" : ""}
                </Label>
                <Textarea id="ct-msg" className="mt-1 min-h-28" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} />
              </div>
              {sent ? (
                <p role="status" className="rounded-md bg-teal-50 p-3 text-sm text-teal-800 dark:bg-teal-500/10 dark:text-teal-200">
                  Received. {CHANNELS.find((c) => c.key === channel)?.desc}
                </p>
              ) : (
                <div>
                  <button
                    type="button"
                    disabled={send.isPending || name.trim().length < 2 || !email.includes("@") || message.trim().length < 4}
                    onClick={() => send.mutate({ channel, name: name.trim(), email: email.trim(), company: company.trim() || undefined, message: message.trim() })}
                    className="inline-flex h-11 items-center rounded-lg bg-teal-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-teal-500 disabled:opacity-50 aqf-btn-press"
                  >
                    {send.isPending ? "Sending…" : "Send to the desk"} <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </section>

      <section className="border-t border-border bg-white dark:bg-transparent">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <SectionHeader
            kicker="Contact questions"
            title="Reaching the desk, FAQ"
            sub="How to contact Aquifert, how fast we respond and who picks up."
            center
          />
          <Reveal delay={100} className="mt-10">
            <Faq items={CONTACT_FAQ} />
          </Reveal>
        </div>
      </section>

      <section className="border-t border-border bg-white dark:bg-transparent">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight text-navy-900 dark:text-white sm:text-3xl">Prefer to look around first?</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              See the platform, the membership tiers and the live market data, then come back when you are ready to talk.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link to="/platform" className="inline-flex h-11 items-center rounded-lg bg-navy-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-navy-500 aqf-btn-press">
                Explore the platform <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Link>
              <Link to="/membership" className="inline-flex h-11 items-center rounded-lg border border-border px-6 text-sm font-semibold text-navy-800 transition-colors hover:border-teal-500/60 dark:text-slate-200">
                See membership
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </MarketingLayout>
  );
}
