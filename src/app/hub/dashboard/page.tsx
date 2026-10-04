import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BellRing, Calculator, CalendarDays, Crown, FlaskConical, Package, Radio, ShoppingCart } from "lucide-react";
import { btnPrimary, btnSecondary } from "@/components/app/form";
import { AquibotBriefing, type BriefRow } from "@/components/hub/aquibot-briefing";
import { HomeHero } from "@/components/hub/home-hero";
import { hasPaidPages } from "@/components/hub/nav";
import { EmptyPanel, Panel, StatTile, Tag } from "@/components/hub/kit";
import { TelexList } from "@/components/hub/telex-list";
import { getHubAccess } from "@/lib/aq-modules/access";
import { evaluateAlerts } from "@/lib/aq-modules/alerts";
import { getPrefs, listAlerts, myRegistrations, nitrogenReportsThisMonth } from "@/lib/aq-modules/members";
import { publishedAnalysis, upcomingCalls } from "@/lib/aq-modules/store";
import { publishedTelex } from "@/lib/aq-modules/telex";
import { limitFor, PLAN_LABEL, productOf, toneOf } from "@/lib/aq-modules/types";
import { formatDay, plainText } from "@/lib/content-types";
import { listRecords } from "@/lib/data/records";
import { INBOX } from "@/lib/data/tables";
import { getFreightDesk, monthlyUsage, nextReset } from "@/lib/freight-desk/store";
import { planLimit as freightLimit } from "@/lib/freight-desk/types";
import { getHubContent } from "@/lib/hub-content";
import { getNetbackDesk, netbackUsage } from "@/lib/netback-desk/store";
import { planLimit as netbackLimit } from "@/lib/netback-desk/types";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const pct = (used: number, limit: number) => (limit > 0 ? Math.round((used / limit) * 100) : undefined);
const allowance = (used: number, limit: number) => (limit > 0 ? `${used} / ${limit}` : `${used}`);

export default async function DashboardPage() {
  const { user, admin, modules, can } = await getHubAccess();
  if (!hasPaidPages(user.plan, admin)) redirect("/hub");
  const [content, freightDesk, netbackDesk, prefs, reports, freightUsed, netbackUsed, alerts, registrations, requests] = await Promise.all([
    getHubContent(),
    getFreightDesk(),
    getNetbackDesk(),
    getPrefs(user),
    nitrogenReportsThisMonth(user),
    monthlyUsage(user.id),
    netbackUsage(user.id),
    can("alerts") ? listAlerts(user) : Promise.resolve([]),
    myRegistrations(user),
    listRecords(INBOX, { email: user.email, limit: 20 }),
  ]);

  const nitrogenLimit = admin ? 0 : limitFor(modules.limits.nitrogenReports, user.plan);
  const fLimit = admin ? 0 : freightLimit(freightDesk.settings, user.plan);
  const nLimit = admin ? 0 : netbackLimit(netbackDesk.settings, user.plan);
  const calcLimit = fLimit && nLimit ? fLimit + nLimit : 0;
  const telex = publishedTelex(content.telex, admin ? "all" : user.plan);
  const readable = telex.filter((item) => item.readable);
  const orders = requests.filter((item) => item.table === "order_enquiries").slice(0, 3);
  const alertStates = evaluateAlerts(alerts, modules.series);
  const triggered = alertStates.filter((state) => state.triggered);
  const { next: nextCall } = upcomingCalls(modules);
  const registered = Boolean(nextCall && registrations.some((row) => row.callId === nextCall.id && row.status === "registered"));

  const brief: BriefRow[] = [
    ...readable.slice(0, 3).map((item) => ({ id: `t-${item.id}`, headline: item.headline, product: item.product, tone: item.tone, source: "Telex", href: "/hub/telex" })),
    ...publishedAnalysis(modules)
      .slice(0, 2)
      .map((note) => ({
        id: `a-${note.id}`,
        headline: note.title,
        product: productOf(`${note.products.join(" ")} ${note.title}`),
        tone: toneOf(`${note.title} ${plainText(note.body)}`),
        source: "Analysis",
        href: `/hub/analysis/${note.slug}`,
      })),
  ];

  return (
    <div className="flex flex-col gap-6 pb-2">
      <div>
        <HomeHero name={user.name} />
        <p className="mt-1 text-center text-[14.5px] text-mid">
          <Tag tone="teal" className="mr-1.5 align-middle">
            {PLAN_LABEL[user.plan]} plan
          </Tag>
          {user.plan === "core" ? "AQ ONE is included. Upgrade any time to unlock AQ Analytics." : "Your plan includes AQ Analytics. Locked items show what else is available."}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">Dashboard</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/hub/nitrogen-report" className={btnSecondary}>
            <FlaskConical className="h-4 w-4" /> Nitrogen Report
          </Link>
          <Link href="/hub/order-desk" className={btnPrimary}>
            <ShoppingCart className="h-4 w-4" /> Order Fertilizer Now
          </Link>
        </div>
      </div>

      <div className="aq-stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Order requests" value={orders.length} icon={Package} tone="blue" href="/hub/order-desk?tab=desk" hint={orders.length ? "With the desk" : "No requests yet"} />
        <StatTile
          label="Nitrogen reports this month"
          value={allowance(reports, nitrogenLimit)}
          icon={FlaskConical}
          meter={pct(reports, nitrogenLimit)}
          href="/hub/nitrogen-report"
          hint={nitrogenLimit ? `Resets ${formatDay(nextReset())}` : "Unlimited on your plan"}
        />
        <StatTile
          label="Calculator runs this month"
          value={allowance(freightUsed + netbackUsed, calcLimit)}
          icon={Calculator}
          tone="amber"
          meter={pct(freightUsed + netbackUsed, calcLimit)}
          href="/hub/account/usage"
          hint={`${freightUsed} freight · ${netbackUsed} netback`}
        />
        <StatTile
          label="Price alerts"
          value={can("alerts") ? (triggered.length ? `${triggered.length} hit` : alerts.filter((item) => item.active).length) : "Locked"}
          icon={BellRing}
          tone="rose"
          href="/hub/analytics/alerts"
          hint={can("alerts") ? (triggered.length ? "Open to see which prices moved" : "Watching your thresholds") : "Unlock with AQ Analytics"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel
          title="Recent requests"
          sub="Order enquiries you sent to the desk"
          icon={Package}
          tone="blue"
          className="lg:col-span-2"
          bodyClassName="p-4"
          actions={
            <Link href="/hub/order-desk?tab=desk" className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-blue no-underline hover:underline">
              New request <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {orders.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {orders.map((item) => (
                <Link key={item.id} href="/hub/order-desk?tab=desk" className="aq-lift rounded-2xl border border-border bg-white p-4 no-underline">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[12px] font-semibold text-dim">{item.id.slice(-6).toUpperCase()}</span>
                    <Tag tone="amber">With the desk</Tag>
                  </div>
                  <p className="mt-2 text-[15.5px] font-semibold text-ink">
                    {item.payload.quantity ? `${item.payload.quantity} t ` : ""}
                    {item.payload.product}
                  </p>
                  <p className="text-[13.5px] text-mid">{item.payload.destination}</p>
                  <div className="mt-3 flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-ink">{item.payload.target || item.payload.incoterm}</span>
                    <span className="text-dim">{formatDay(item.at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyPanel
              title="No requests yet"
              body="Tell the desk the product, quantity and destination, and a trader comes back with a quote."
              action={
                <Link href="/hub/order-desk?tab=desk" className={btnPrimary}>
                  Order Fertilizer Now
                </Link>
              }
            />
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          {user.plan !== "enterprise" ? (
            <section className="relative overflow-hidden rounded-[22px] border-2 border-teal-400/60 bg-gradient-to-b from-teal-50 to-white p-5 shadow-[var(--aq-shadow-card)]">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-teal-600" />
                <p className="text-[16.5px] font-semibold text-ink">Upgrade to Membership</p>
              </div>
              <p className="mt-2 text-[14.5px] leading-relaxed text-mid">Unlock AQ Analytics: the full Telex wire, market data, freight analytics and price alerts.</p>
              <ul className="mt-3 space-y-1.5 text-[14.5px] text-mid">
                {["Every Telex flash, with the archive", "Price series and CSV downloads", "Alerts when your prices move"].map((line) => (
                  <li key={line} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-500" /> {line}
                  </li>
                ))}
              </ul>
              <Link href="/hub/account/membership" className={`${btnPrimary} mt-4 w-full`}>
                Compare plans <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          ) : null}

          {nextCall ? (
            <Link href="/hub/community-call" className="aq-card aq-lift block p-5 no-underline">
              <div className="flex items-center gap-2">
                <span className="aq-chip flex h-8 w-8 items-center justify-center rounded-[10px] text-white">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-teal-700">Next community call</p>
              </div>
              <p className="mt-2 text-[16px] font-semibold text-ink">{nextCall.topic}</p>
              <p className="mt-0.5 text-[13.5px] text-mid">
                {new Date(nextCall.startsAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC ·{" "}
                {nextCall.durationMinutes} min
              </p>
              <p className="mt-2 text-[13.5px] font-semibold text-blue">{registered ? "You're registered" : "Register free"} →</p>
            </Link>
          ) : null}

          {triggered.length ? (
            <Link href="/hub/analytics/alerts" className="aq-card block border-red-200 p-5 no-underline">
              <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-danger">Alerts triggered</p>
              <ul className="mt-2 space-y-1.5">
                {triggered.slice(0, 3).map((state) => (
                  <li key={state.alert.id} className="text-[14.5px] text-ink">
                    {state.series?.label} {state.series?.basis}: <strong>{state.latest?.value}</strong> {state.alert.direction} {state.alert.threshold}
                  </li>
                ))}
              </ul>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Panel
          title="Telex"
          sub="Desk-issued market flashes, newest first"
          icon={Radio}
          tone="blue"
          className="lg:col-span-3 lg:max-h-[640px]"
          bodyClassName="overflow-y-auto"
          actions={
            <Link href="/hub/telex" className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-blue no-underline hover:underline">
              Open the feed <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <TelexList items={telex.slice(0, 8)} />
        </Panel>
        <div className="lg:col-span-2">
          <AquibotBriefing rows={brief} persona={prefs.persona} />
        </div>
      </div>
    </div>
  );
}
