"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ListChecks, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { saveMemberRules } from "@/app/admin/settings/actions";
import { Panel, SaveBar, Switch, useEditorGuards } from "@/components/admin/aquibot/shared";
import { input, label, textarea } from "@/components/admin/ui";
import { DISPOSABLE_DOMAINS, FREEMAIL_DOMAINS, checkSignupEmail, cleanEntries, type EmailVerdict } from "@/lib/desk-settings/email-rules";
import type { MemberRules } from "@/lib/desk-settings/types";

type Draft = { requireWorkEmail: boolean; blocked: string; allowed: string };

const toDraft = (rules: MemberRules): Draft => ({ requireWorkEmail: rules.requireWorkEmail, blocked: rules.blocked.join("\n"), allowed: rules.allowed.join("\n") });
const split = (text: string) => cleanEntries(text.split(/[\s,;]+/));

const VERDICT: Record<string, string> = {
  allowed: "Can sign up. It is on your allow list, which overrides the other rules.",
  work: "Can sign up. It is a company address.",
  "freemail-permitted": "Can sign up. Personal addresses are allowed while the work-email rule is off.",
  invalid: "That is not a complete email address.",
  banned: "Refused. This address is banned. They see the generic disposable-address message, so the ban is not revealed.",
  disposable: "Refused. Throwaway inbox providers are always blocked.",
  blocked: "Refused. It matches your blocked list.",
  freemail: "Refused. Personal providers are blocked while the work-email rule is on.",
};

function DomainList({ title, domains, note }: { title: string; domains: readonly string[]; note: string }) {
  return (
    <details className="group rounded-xl border border-border bg-s2/40 px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-semibold text-ink">
        {title}
        <span className="font-mono text-[11px] font-normal text-dim">{domains.length} domains</span>
      </summary>
      <p className="mt-2 text-[12px] text-mid">{note}</p>
      <div className="mt-2.5 flex flex-wrap gap-1">
        {domains.map((domain) => (
          <span key={domain} className="rounded border border-border bg-white px-1.5 py-0.5 font-mono text-[10.5px] text-mid">
            {domain}
          </span>
        ))}
      </div>
    </details>
  );
}

export function MembersPanel({ initial, savedAt: initialSavedAt, banned }: { initial: MemberRules; savedAt: string | null; banned: string[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [baseline, setBaseline] = useState(() => JSON.stringify(toDraft(initial)));
  const [savedAt, setSavedAt] = useState(initialSavedAt);
  const [probe, setProbe] = useState("");
  const [saving, start] = useTransition();
  const dirty = JSON.stringify(draft) !== baseline;
  const rules: MemberRules = { requireWorkEmail: draft.requireWorkEmail, blocked: split(draft.blocked), allowed: split(draft.allowed) };
  const bannedSet = new Set(banned);
  const verdict: EmailVerdict | null = probe.trim() ? checkSignupEmail(probe, rules, (email) => bannedSet.has(email)) : null;
  const key = verdict ? (verdict.ok ? verdict.rule : verdict.reason) : null;

  const save = () =>
    start(async () => {
      const result = await saveMemberRules(draft);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const next = toDraft(result.rules);
      setDraft(next);
      setBaseline(JSON.stringify(next));
      setSavedAt(result.savedAt);
      toast.success("Sign-up rules saved. They apply to the next person who registers.");
      router.refresh();
    });
  useEditorGuards(dirty, save);

  return (
    <div className="space-y-5">
      <SaveBar dirty={dirty} saving={saving} savedAt={savedAt} onSave={save}>
        <span className="text-[12.5px] text-mid">
          {rules.blocked.length} blocked · {rules.allowed.length} allowed
        </span>
      </SaveBar>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Panel icon={<ShieldCheck className="h-4 w-4" />} title="Who can register" description="Checked on the sign-up form before the verification code is sent.">
            <Switch
              checked={draft.requireWorkEmail}
              onChange={(value) => setDraft((current) => ({ ...current, requireWorkEmail: value }))}
              label="Require a work email"
              description="Refuses Gmail, Outlook, Yahoo and other personal providers. Throwaway inboxes are refused either way."
            />
          </Panel>

          <Panel icon={<ListChecks className="h-4 w-4" />} title="Your lists" description="One domain or full address per line. A domain also covers its subdomains.">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="rules-blocked" className={label}>
                  Always refuse
                </label>
                <textarea
                  id="rules-blocked"
                  rows={8}
                  className={`${textarea} mt-1.5 font-mono text-[12.5px]`}
                  value={draft.blocked}
                  onChange={(event) => setDraft((current) => ({ ...current, blocked: event.target.value }))}
                  placeholder={"competitor.com\nsomeone@example.com"}
                />
                <p className="mt-1 text-[11.5px] text-dim">For domains you never want on the platform.</p>
              </div>
              <div>
                <label htmlFor="rules-allowed" className={label}>
                  Always accept
                </label>
                <textarea
                  id="rules-allowed"
                  rows={8}
                  className={`${textarea} mt-1.5 font-mono text-[12.5px]`}
                  value={draft.allowed}
                  onChange={(event) => setDraft((current) => ({ ...current, allowed: event.target.value }))}
                  placeholder={"founder.personal@gmail.com\npartner-coop.org"}
                />
                <p className="mt-1 text-[11.5px] text-dim">Lets a trusted person in with a personal address. Bans still apply.</p>
              </div>
            </div>
          </Panel>

          <div className="grid gap-3 md:grid-cols-2">
            <DomainList title="Personal providers" domains={FREEMAIL_DOMAINS} note="Refused while the work-email rule is on." />
            <DomainList title="Throwaway inboxes" domains={DISPOSABLE_DOMAINS} note="Always refused, including their subdomains." />
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(26,58,92,0.05)] xl:sticky xl:top-20">
          <label htmlFor="rules-probe" className={label}>
            Check an address
          </label>
          <input id="rules-probe" className={`${input} mt-1.5`} value={probe} onChange={(event) => setProbe(event.target.value)} placeholder="name@company.com" autoComplete="off" />
          <p className="mt-1.5 text-[11.5px] text-dim">Uses the rules on this page, including changes you have not saved yet.</p>
          {verdict && key ? (
            <div className={`mt-4 rounded-xl border px-4 py-3 text-[13px] ${verdict.ok ? "border-[#cdebd8] bg-[#f1faf4] text-[#1f7a45]" : "border-[#f5c2c2] bg-[#fdf1f1] text-[#b42318]"}`}>
              <p className="flex items-start gap-2 font-semibold">
                {verdict.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                {VERDICT[key]}
              </p>
              {!verdict.ok && verdict.reason !== "invalid" ? <p className="mt-2 text-[12px] opacity-90">They see: &ldquo;{verdict.message}&rdquo;</p> : null}
            </div>
          ) : null}
          <p className="mt-4 border-t border-border pt-3 text-[12px] text-mid">
            {banned.length ? `${banned.length} banned ${banned.length === 1 ? "address is" : "addresses are"} refused as well. ` : "Banned members are refused as well. "}
            <Link href="/admin/banned" className="font-semibold text-blue hover:underline">
              Manage bans
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
