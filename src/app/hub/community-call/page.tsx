import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Check, Clock, Mail, Mic, PlayCircle, UserRound } from "lucide-react";
import { btnSecondary } from "@/components/app/form";
import { CallRegistration, QuickRegister, type RegistrationDefaults } from "@/components/hub/aq1/call-registration";
import { CallWhen, Countdown } from "@/components/hub/aq1/call-time";
import { Disclaimer, EmptyPanel, HubPageHeader, Panel, Tag } from "@/components/hub/kit";
import { getHubAccess } from "@/lib/aq-modules/access";
import { myRegistrations } from "@/lib/aq-modules/members";
import { upcomingCalls } from "@/lib/aq-modules/store";
import { formatDay } from "@/lib/content-types";

export const metadata: Metadata = { title: "Freight Analytics Call" };
export const dynamic = "force-dynamic";

export default async function CommunityCallPage() {
  const { user, modules } = await getHubAccess();
  const { next, later, past } = upcomingCalls(modules);
  const rows = await myRegistrations(user).catch(() => []);
  const active = new Set(rows.filter((row) => row.status === "registered").map((row) => row.callId));
  const last = [...rows].sort((a, b) => (b.updatedAt ?? b.at).localeCompare(a.updatedAt ?? a.at))[0];
  const defaults: RegistrationDefaults = { company: last?.company ?? "", country: last?.country || user.country || "", reminders: last?.reminders ?? true };
  const recordings = past.filter((call) => call.recordingUrl);
  const deskLink = `/hub/contact?topic=${encodeURIComponent("Freight Analytics Call")}`;

  return (
    <div className="mx-auto max-w-5xl pb-2">
      <HubPageHeader
        eyebrow="AQ ONE Free plan"
        title="Freight Analytics Call"
        description="A free live call with the Aquifert desk on fertilizer prices and freight. Register in one click, add it to your calendar and send in the question you want answered."
        tip="The desk walks through the market and freight, then answers members' questions. Registration is free on every plan. The joining link appears on this page 15 minutes before the start."
        guide="call"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {next ? (
            <section className="aq-card aq-rise overflow-hidden" aria-labelledby="next-call-title">
              <div className="relative border-b border-border bg-gradient-to-br from-teal-50 via-white to-navy-50 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone="teal">Next call</Tag>
                  <Countdown startsAt={next.startsAt} durationMinutes={next.durationMinutes} />
                  {active.has(next.id) ? (
                    <Tag tone="green">
                      <Check className="h-3 w-3" aria-hidden /> Registered
                    </Tag>
                  ) : null}
                </div>
                <h2 id="next-call-title" className="mt-3 text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink md:text-[26px]">
                  {next.topic}
                </h2>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-mid">
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5 text-dim" aria-hidden /> Hosted by {next.host || "the Aquifert desk"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-dim" aria-hidden /> {next.durationMinutes} minutes
                  </span>
                </div>
                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-white/80 p-4">
                  <span className="aq-chip flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-white">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <CallWhen startsAt={next.startsAt} durationMinutes={next.durationMinutes} />
                </div>
                {next.description ? <p className="mt-4 text-[14px] leading-relaxed text-mid">{next.description}</p> : null}
              </div>
              <div className="p-5 sm:p-6">
                {!active.has(next.id) ? (
                  <div className="mb-4">
                    <h3 className="text-[15px] font-semibold text-ink">Register for the call</h3>
                    <p className="mt-0.5 text-[13px] text-mid">Takes a few seconds. Your name and email come from your account.</p>
                  </div>
                ) : null}
                <CallRegistration call={next} registered={active.has(next.id)} name={user.name} email={user.email} defaults={defaults} />
              </div>
            </section>
          ) : (
            <EmptyPanel
              title="The next call is being scheduled"
              body="The desk runs the Freight Analytics Call regularly and posts the date here as soon as it is set. Tell the desk what you would like covered and they will let you know when registration opens."
              action={
                <Link href={deskLink} className={btnSecondary}>
                  <Mail className="h-4 w-4" /> Contact the desk
                </Link>
              }
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="What happens on the call" icon={Mic} bodyClassName="px-5 py-4">
            <ul className="space-y-2.5 text-[13px] leading-relaxed text-mid">
              {[
                "The desk walks through nitrogen, phosphate, potash and the freight picture.",
                "Questions sent in advance are grouped and the most requested are answered live.",
                "Open Q&A at the end for buyers, importers and traders.",
                "When a call is recorded, the recording appears on this page afterwards.",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#e7f6ee] text-[#1b7a47]">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </Panel>

          {later.length ? (
            <Panel title="Later calls" sub="Register ahead in one click" icon={CalendarDays} tone="blue">
              <ul className="divide-y divide-border">
                {later.map((call) => (
                  <li key={call.id} className="flex items-start gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold leading-snug text-ink">{call.topic}</p>
                      <p className="mt-0.5 text-[12px] text-mid">
                        <CallWhen startsAt={call.startsAt} durationMinutes={call.durationMinutes} size="sm" />
                      </p>
                      <p className="text-[12px] text-dim">
                        {call.host || "Aquifert desk"} · {call.durationMinutes} min
                      </p>
                    </div>
                    <QuickRegister callId={call.id} registered={active.has(call.id)} defaults={defaults} />
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel title="Past call recordings" icon={PlayCircle} tone="amber">
            {recordings.length ? (
              <ul className="divide-y divide-border">
                {recordings.map((call) => (
                  <li key={call.id}>
                    <a href={call.recordingUrl} target="_blank" rel="noreferrer noopener" className="flex items-start gap-3 px-5 py-3.5 no-underline transition-colors hover:bg-s2/60">
                      <PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue" aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold leading-snug text-ink">{call.topic}</span>
                        <span className="block text-[12px] text-dim">
                          {formatDay(call.startsAt)} · {call.durationMinutes} min · Opens in a new tab
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-[13px] leading-relaxed text-mid">Recordings of past calls are posted here. Register for the next call to hear it live and put your question to the desk.</p>
            )}
          </Panel>
        </div>
      </div>

      <div className="mt-6">
        <Disclaimer>Calls share desk views for information only. Nothing said on a call is an offer, a price assessment or advice.</Disclaimer>
      </div>
    </div>
  );
}
