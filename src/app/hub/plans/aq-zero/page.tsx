import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Check, ClipboardCheck, PhoneCall, Rocket, Search, Sprout, Wheat, X } from "lucide-react";
import { SalesHero } from "@/components/hub/sales-hero";
import { ClosingCta, CrossSell, Eyebrow, heroGhost, heroPrimary, PlanBadge } from "@/components/hub/plans/sales";
import { getHubAccess } from "@/lib/aq-modules/access";
import { MEMBERSHIP_OFFERS, type MembershipTier } from "@/lib/aq-modules/membership";
import { myMembershipRequests } from "@/lib/aq-modules/members";
import { findZeroRegistration } from "@/lib/zero-interest";

export const metadata: Metadata = { title: "AQ Zero" };
export const dynamic = "force-dynamic";

const TIER_ART: Record<MembershipTier, { icon: typeof Sprout; blurb: string }> = {
  sprout: { icon: Sprout, blurb: "For buyers proving the model on their first lanes." },
  harvest: { icon: Wheat, blurb: "For regular programmes that need financing and speed." },
  scale: { icon: Rocket, blurb: "For volume buyers running the full stream through Aquifert." },
};

const STEPS = [
  { icon: ClipboardCheck, title: "Register your interest", text: "Choose the programme that fits how you buy. Registration takes a minute and places you on the pilot roster." },
  { icon: PhoneCall, title: "The desk confirms", text: "Our traders confirm pricing and availability with you directly, against your quality, quantity, packing and destination." },
  { icon: BadgeCheck, title: "Buy at supplier cost", text: "Product at cost, pass-through freight and a stated fee. Full document trail on every tonne." },
];

const TALK = "/hub/contact?topic=AQ%20Zero";

export default async function AqZeroPlanPage() {
  const { user } = await getHubAccess();
  const [registration, requests] = await Promise.all([findZeroRegistration(user).catch(() => null), myMembershipRequests(user).catch(() => [])]);
  const currentTier =
    user.plan === "enterprise" ? ([...requests].sort((a, b) => b.at.localeCompare(a.at)).find((item) => item.status === "done" && item.requestedPlan === "enterprise" && item.tier)?.tier ?? null) : null;
  const tiers = MEMBERSHIP_OFFERS.filter((offer): offer is (typeof offer & { tier: MembershipTier }) => offer.tier !== null);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 pb-2">
      <SalesHero
        src="/media/port-terminal.mp4"
        poster="/media/port-terminal.jpg"
        videoLabel="Containers being loaded at a port terminal, physical fertiliser moving through the supply chain"
        eyebrow="AQ Zero"
        badge="Pilot"
        title={
          <>
            Buy Fertilizer at <span className="text-teal-300">supplier cost</span>
          </>
        }
        sub="Supplier-cost buying with a fixed operations fee. Register now for the pilot."
      >
        <a href="#aq-zero-tiers" className={heroPrimary}>
          Choose your programme <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
        <Link href={TALK} className={heroGhost}>
          Talk to the trade desk
        </Link>
      </SalesHero>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-teal-200 bg-teal-50/70 px-5 py-4 text-[15px] leading-relaxed text-mid">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-700 ring-1 ring-teal-200">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-500" />
          </span>
          Coming soon
        </span>
        <span className="min-w-[15rem] flex-1">Choose the programme that fits how you buy and register your interest. The desk confirms pricing and availability with you.</span>
      </p>

      <section id="aq-zero-tiers" className="scroll-mt-24" aria-label="AQ Zero programmes">
        <div className="aq-stagger grid gap-6 md:grid-cols-3">
          {tiers.map((offer) => {
            const art = TIER_ART[offer.tier];
            const current = currentTier === offer.tier;
            const registered = !current && registration?.programme === offer.tier;
            const badge = current ? "Current plan" : registered ? "Registered" : offer.popular ? "Most popular" : null;
            const frame = current || registered ? "ring-2 ring-[#2fa865]" : offer.popular ? "border-2 border-teal-500 shadow-[0_18px_40px_-22px_rgb(79_127_114/0.7)]" : "";
            return (
              <section key={offer.id} aria-label={offer.name} className={`aq-card relative flex flex-col p-7 transition-transform duration-200 hover:-translate-y-1 ${frame}`}>
                {badge ? <PlanBadge tone={current || registered ? "green" : "teal"}>{badge}</PlanBadge> : null}
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                  <art.icon className="h-5 w-5" aria-hidden />
                </span>
                <h2 className="mt-4 text-[20px] font-bold text-ink">{offer.name}</h2>
                <p className="text-[14px] text-dim">{offer.tagline}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-mid">{art.blurb}</p>
                <ul className="mt-6 flex-1 space-y-2.5 border-t border-border pt-6 text-[15px] leading-relaxed">
                  {offer.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-ink">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-teal-600" aria-hidden /> {feature}
                    </li>
                  ))}
                  {offer.missing.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[#a3b0bd]">
                      <X className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                      <span>
                        {feature} <span className="sr-only">(not included)</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {current ? (
                  <Link
                    href="/hub/account/membership"
                    className="mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#2fa865] bg-[#f1faf4] px-4 text-[15px] font-semibold text-[#1f7a45] no-underline transition hover:bg-[#e3f5ea]"
                  >
                    Manage membership <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                ) : (
                  <Link
                    href={`/hub/account/membership?plan=enterprise&tier=${offer.tier}&from=aq-zero`}
                    aria-label={registered ? `Update my details for ${offer.name}` : `Register for ${offer.name}`}
                    className={`mt-7 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-[15px] font-semibold no-underline transition active:scale-[0.98] ${
                      registered ? "border border-[#2fa865] bg-white text-[#1f7a45] hover:bg-[#f1faf4]" : "bg-navy-700 text-white hover:bg-navy-600"
                    }`}
                  >
                    {registered ? (
                      <>
                        <Check className="h-4 w-4" aria-hidden /> Update my details
                      </>
                    ) : (
                      `Register for ${offer.name}`
                    )}
                  </Link>
                )}
              </section>
            );
          })}
        </div>
        <p className="mt-6 flex items-center gap-2 text-[14px] text-mid">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[#d97706]" aria-hidden />
          12 pilot slots per quarter. Fast-start: commit within 7 days of being offered a slot.
        </p>
      </section>

      <section className="aq-card p-6 sm:p-9">
        <Eyebrow>How AQ Zero works</Eyebrow>
        <h2 className="mt-2 text-[24px] font-bold tracking-[-0.01em] text-ink">Three steps between you and supplier-cost fertiliser</h2>
        <ol className="mt-7 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="relative rounded-2xl bg-s2 p-6">
              <span className="absolute right-5 top-4 font-mono text-[30px] font-extrabold text-ink/10" aria-hidden>
                {index + 1}
              </span>
              <step.icon className="h-5 w-5 text-teal-700" aria-hidden />
              <p className="mt-3 text-[16px] font-semibold text-ink">{step.title}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-mid">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <CrossSell eyebrow="AQ Analytics" line="Don’t need physical fertiliser? Get the trader-level market view on its own." href="/hub/plans/aq-analytics" cta="Explore AQ Analytics" icon={Search} />

      <ClosingCta
        title="Trade your first tonne at cost this quarter"
        body="Pilot slots are limited to twelve per quarter. Talk to the desk about the programme that fits your tonnage, and we will confirm pricing and availability with you."
        gradient="linear-gradient(115deg, #254F76 0%, #16304D 60%, #10253C 100%)"
        glow="-bottom-24 -left-20 bg-teal-500/20"
      >
        <Link href={TALK} className={heroPrimary}>
          Talk to the trade desk <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <a href="#aq-zero-tiers" className={heroGhost}>
          Compare the tiers
        </a>
      </ClosingCta>
    </div>
  );
}
