"use client";

import { useMemo, useState } from "react";
import { MessageCircle, PhoneCall, Mail, PhoneForwarded, ArrowRight } from "lucide-react";
import type { SiteContent } from "@/lib/site-content/schema";
import { MarketingLayout } from "@/marketing/components/MarketingLayout";
import { Reveal } from "@/marketing/components/shared/Reveal";
import { VideoHero } from "@/marketing/components/shared/VideoHero";
import { SiteLink } from "@/marketing/components/shared/SiteLink";
import { Seo, ORGANIZATION_JSONLD, breadcrumbJsonLd } from "@/marketing/components/shared/Seo";
import { Faq, SectionHeader, faqJsonLd } from "@/marketing/components/shared/Faq";
import { Card, CardContent } from "@/marketing/components/ui/card";
import { Input } from "@/marketing/components/ui/input";
import { Label } from "@/marketing/components/ui/label";
import { Textarea } from "@/marketing/components/ui/textarea";
import { postJson, useMutation } from "@/marketing/lib/mutation";
import { useSiteGlobal } from "@/marketing/lib/site-global";
import { toast } from "sonner";

type Channel = "whatsapp" | "book_call" | "message" | "callback";

type ContactInput = {
  channel: Channel;
  name: string;
  email: string;
  company?: string;
  message: string;
};
const sendContact = (input: ContactInput) => postJson("/api/contact", input);

const CONTACT_BREADCRUMB = breadcrumbJsonLd([
  { name: "Home", path: "/" },
  { name: "Contact", path: "/contact" },
]);

export default function ContactPage({ content }: { content: SiteContent["contact"] }) {
  const { seo, hero, channels: copy, faq, closing } = content;
  const { footer } = useSiteGlobal();
  const [channel, setChannel] = useState<Channel>("message");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const send = useMutation(sendContact, {
    onSuccess: () => {
      setSent(true);
      toast.success("Sent — the desk has it");
    },
    onError: (e) => toast.error(e.message),
  });

  const channels = [
    { key: "whatsapp" as const, icon: MessageCircle, title: copy.whatsappTitle, desc: copy.whatsappDesc },
    { key: "book_call" as const, icon: PhoneCall, title: copy.callTitle, desc: copy.callDesc },
    { key: "message" as const, icon: Mail, title: copy.messageTitle, desc: copy.messageDesc },
    { key: "callback" as const, icon: PhoneForwarded, title: copy.callbackTitle, desc: copy.callbackDesc },
  ];

  const jsonLd = useMemo(
    () => [
      ORGANIZATION_JSONLD,
      faqJsonLd(faq.items),
      CONTACT_BREADCRUMB,
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
            email: footer.email,
            availableLanguage: ["en", "zh"],
            areaServed: "GB",
          },
        },
      },
    ],
    [faq.items, footer.email],
  );

  return (
    <MarketingLayout>
      <Seo
        title={seo.title}
        description={seo.description}
        keywords="contact aquifert, fertilizer trading desk, fertilizer buyer support, fertilizer supplier onboarding, aquifert phone, aquifert whatsapp"
        path="/contact"
        image={hero.image || undefined}
        jsonLd={jsonLd}
      />

      <VideoHero src={hero.video} poster={hero.image} videoLabel={hero.label} center>
        <Reveal>
          <h1 className="aqf-hero-title mx-auto max-w-3xl text-balance text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl">{hero.title}</h1>
          {hero.body ? <p className="aqf-hero-sub mx-auto mt-6 max-w-2xl whitespace-pre-line text-lg leading-relaxed sm:text-xl">{hero.body}</p> : null}
        </Reveal>
      </VideoHero>

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Contact channel">
          {channels.map((c, i) => (
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
                {c.desc ? <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">{c.desc}</p> : null}
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
                  Received. {channels.find((c) => c.key === channel)?.desc}
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
          <SectionHeader kicker={faq.kicker} title={faq.title} sub={faq.sub} center />
          <Reveal delay={100} className="mt-10">
            <Faq items={faq.items} />
          </Reveal>
        </div>
      </section>

      <section className="border-t border-border bg-white dark:bg-transparent">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight text-navy-900 dark:text-white sm:text-3xl">{closing.title}</h2>
            {closing.body ? <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">{closing.body}</p> : null}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {closing.primaryLabel ? (
                <SiteLink
                  href={closing.primaryLink || "/platform"}
                  className="inline-flex h-11 items-center rounded-lg bg-navy-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-navy-500 aqf-btn-press"
                >
                  {closing.primaryLabel} <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                </SiteLink>
              ) : null}
              {closing.secondaryLabel ? (
                <SiteLink
                  href={closing.secondaryLink || "/membership"}
                  className="inline-flex h-11 items-center rounded-lg border border-border px-6 text-sm font-semibold text-navy-800 transition-colors hover:border-teal-500/60 dark:text-slate-200"
                >
                  {closing.secondaryLabel}
                </SiteLink>
              ) : null}
            </div>
          </Reveal>
        </div>
      </section>
    </MarketingLayout>
  );
}
