"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, CircleAlert, Mail, RotateCcw, Send, UserRound } from "lucide-react";
import { toast } from "sonner";
import { saveFormEmails, sendTestEmail } from "@/app/admin/settings/actions";
import { Panel, SaveBar, Switch, useEditorGuards } from "@/components/admin/aquibot/shared";
import { btnGhost, btnSecondary, input, label, textarea } from "@/components/admin/ui";
import { sampleFor } from "@/lib/desk-settings/forms";
import { renderEmail } from "@/lib/desk-settings/render";
import { FORM_DETAILS, TEMPLATE_TAGS, type EmailTemplate, type FormEmails, type TemplateKind } from "@/lib/desk-settings/types";

type Draft = FormEmails & { showOnHub?: boolean };
type Audience = "applicant" | "admin";

const COPY: Record<TemplateKind, { name: string; adminPath: string; memberEvent: string }> = {
  order: { name: "Order Desk", adminPath: "/admin/enquiries", memberEvent: "sends an enquiry" },
  zero: { name: "Aquifert Zero", adminPath: "/admin/zero", memberEvent: "registers interest" },
};

function TemplateEditor({
  kind,
  audience,
  template,
  fallback,
  enabled,
  onChange,
  onFocus,
  focused,
  onTest,
  testing,
}: {
  kind: TemplateKind;
  audience: Audience;
  template: EmailTemplate;
  fallback: EmailTemplate;
  enabled: boolean;
  onChange: (template: EmailTemplate) => void;
  onFocus: () => void;
  focused: boolean;
  onTest: () => void;
  testing: boolean;
}) {
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const lastField = useRef<"subject" | "body">("body");
  const tags = TEMPLATE_TAGS[kind];
  const known = new Set(tags.map((item) => item.tag));
  const unknown = [...new Set([...`${template.subject} ${template.body}`.matchAll(/\{([a-z_]+)\}/g)].map((match) => match[1]).filter((tag) => !known.has(tag)))];
  const missingDetails = !template.body.includes(FORM_DETAILS);
  const changed = template.subject !== fallback.subject || template.body !== fallback.body;
  const id = `${kind}-${audience}`;

  const insert = (token: string) => {
    const target = lastField.current === "subject" && token !== FORM_DETAILS ? subjectRef.current : bodyRef.current;
    const key = target === subjectRef.current ? "subject" : "body";
    const value = template[key];
    const start = target?.selectionStart ?? value.length;
    const end = target?.selectionEnd ?? value.length;
    const text = token === FORM_DETAILS ? `\n\n${FORM_DETAILS}\n\n` : token;
    onChange({ ...template, [key]: value.slice(0, start) + text + value.slice(end) });
    requestAnimationFrame(() => {
      target?.focus();
      target?.setSelectionRange(start + text.length, start + text.length);
    });
  };

  return (
    <div
      className={`rounded-2xl border bg-surface shadow-[0_1px_2px_rgba(26,58,92,0.05)] transition ${focused ? "border-blue/40 ring-2 ring-blue/10" : "border-border"} ${enabled ? "" : "opacity-60"}`}
      onFocusCapture={onFocus}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-light text-blue">
            {audience === "applicant" ? <UserRound className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          </span>
          <div>
            <h3 className="text-[14px] font-bold text-ink">{audience === "applicant" ? "Confirmation to the member" : "Alert to the desk"}</h3>
            <p className="text-[12px] text-dim">
              {enabled ? (audience === "applicant" ? "Sent to the address on the form." : "Sent to the desk address, with an Open in admin button.") : "Switched off above, so this is not sent."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {changed ? (
            <button type="button" className={btnGhost} onClick={() => onChange(fallback)} title="Put back the original wording">
              <RotateCcw className="h-3.5 w-3.5" />
              Default
            </button>
          ) : null}
          <button type="button" className={btnSecondary} onClick={onTest} disabled={testing}>
            <Send className="h-3.5 w-3.5" />
            {testing ? "Sending…" : "Send test to me"}
          </button>
        </div>
      </div>
      <div className="space-y-3 p-5">
        <div>
          <label htmlFor={`${id}-subject`} className={label}>
            Subject
          </label>
          <input
            id={`${id}-subject`}
            ref={subjectRef}
            className={`${input} mt-1.5`}
            value={template.subject}
            onFocus={() => (lastField.current = "subject")}
            onChange={(event) => onChange({ ...template, subject: event.target.value })}
          />
        </div>
        <div>
          <label htmlFor={`${id}-body`} className={label}>
            Message
          </label>
          <textarea
            id={`${id}-body`}
            ref={bodyRef}
            rows={9}
            className={`${textarea} mt-1.5 font-mono text-[12.5px]`}
            value={template.body}
            onFocus={() => (lastField.current = "body")}
            onChange={(event) => onChange({ ...template, body: event.target.value })}
          />
          <p className="mt-1 text-[11.5px] text-dim">A blank line starts a new paragraph. Wrap words in **double stars** for bold.</p>
        </div>
        <div>
          <p className={label}>Insert</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tags.map((item) => (
              <button
                key={item.tag}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insert(`{${item.tag}}`)}
                title={`${item.label}, e.g. ${item.sample}`}
                className="rounded-md border border-border bg-white px-2 py-1 font-mono text-[11px] text-mid transition hover:border-blue/40 hover:text-blue"
              >
                {`{${item.tag}}`}
              </button>
            ))}
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insert(FORM_DETAILS)}
              title="The table of everything the member submitted"
              className="rounded-md border border-blue/30 bg-blue-light px-2 py-1 font-mono text-[11px] font-semibold text-blue transition hover:border-blue"
            >
              {FORM_DETAILS}
            </button>
          </div>
        </div>
        {unknown.length || missingDetails ? (
          <div className="space-y-1 rounded-lg border border-[#f5dfb3] bg-[#fff8ea] px-3 py-2 text-[12px] text-[#9a5b00]">
            {unknown.length ? (
              <p className="flex items-start gap-1.5">
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {unknown.map((tag) => `{${tag}}`).join(", ")} {unknown.length === 1 ? "is not a tag this form fills" : "are not tags this form fills"}, so {unknown.length === 1 ? "it" : "they"} will show as typed.
              </p>
            ) : null}
            {missingDetails ? (
              <p className="flex items-start gap-1.5">
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                No {FORM_DETAILS}, so the email leaves out what the member submitted.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FormEmailsPanel({
  kind,
  initial,
  defaults,
  savedAt: initialSavedAt,
  adminEmail,
  connected,
  count,
}: {
  kind: TemplateKind;
  initial: Draft;
  defaults: Draft;
  savedAt: string | null;
  adminEmail: string;
  connected: boolean;
  count: number;
}) {
  const router = useRouter();
  const copy = COPY[kind];
  const [draft, setDraft] = useState<Draft>(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const [savedAt, setSavedAt] = useState(initialSavedAt);
  const [audience, setAudience] = useState<Audience>("applicant");
  const [saving, startSave] = useTransition();
  const [testing, setTesting] = useState<Audience | null>(null);
  const dirty = JSON.stringify(draft) !== baseline;
  const sample = useMemo(() => sampleFor(kind), [kind]);

  const preview = useMemo(
    () =>
      renderEmail({
        template: draft[audience],
        vars: sample.vars,
        sections: sample.sections,
        action: audience === "admin" ? { label: "Open in admin", href: copy.adminPath } : undefined,
      }),
    [audience, copy.adminPath, draft, sample],
  );

  const save = () =>
    startSave(async () => {
      const result = await saveFormEmails(kind, draft);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setBaseline(JSON.stringify(draft));
      setSavedAt(result.savedAt);
      toast.success(`${copy.name} emails saved. The next submission uses them.`);
      router.refresh();
    });
  useEditorGuards(dirty, save);

  const test = async (which: Audience) => {
    setTesting(which);
    try {
      const result = await sendTestEmail(kind, which, draft[which]);
      if (!result.ok) toast.error(result.message);
      else if (result.status === "sent") toast.success(`Test sent to ${result.to}.`);
      else if (result.status === "failed") toast.error(`The provider refused the test: ${result.error ?? "unknown error"}`);
      else toast.info("Test kept in the outbox. Delivery is not connected yet, so open it under Email delivery.");
      router.refresh();
    } finally {
      setTesting(null);
    }
  };

  const set = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const to = audience === "applicant" ? sample.email : draft.recipient || "no desk address";

  return (
    <div className="space-y-5">
      <SaveBar dirty={dirty} saving={saving} savedAt={savedAt} onSave={save}>
        <span className="text-[12.5px] text-mid">
          {count.toLocaleString()} {kind === "order" ? "enquiries" : "registrations"} received so far
        </span>
      </SaveBar>

      <Panel icon={<Mail className="h-4 w-4" />} title="Where it goes" description={`What happens when a member ${copy.memberEvent}.`}>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            {kind === "zero" ? (
              <Switch
                checked={Boolean(draft.showOnHub)}
                onChange={(value) => set({ showOnHub: value })}
                label="Show the Aquifert Zero tab on the hub"
                description="Off hides the tab on Order Desk. Registrations already received stay in the admin."
              />
            ) : null}
            <Switch checked={draft.sendApplicant} onChange={(value) => set({ sendApplicant: value })} label="Email the member a confirmation" description="A copy of what they submitted, sent to the address on the form." />
            <Switch checked={draft.sendAdmin} onChange={(value) => set({ sendAdmin: value })} label="Alert the desk" description="Every submission, sent to the desk address below." />
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor={`${kind}-recipient`} className={label}>
                Desk address
              </label>
              <input id={`${kind}-recipient`} type="email" className={`${input} mt-1.5`} value={draft.recipient} onChange={(event) => set({ recipient: event.target.value })} placeholder="sales@aquifert.com" />
            </div>
            <div>
              <label htmlFor={`${kind}-success`} className={label}>
                Message after submitting
              </label>
              <input id={`${kind}-success`} className={`${input} mt-1.5`} value={draft.success} onChange={(event) => set({ success: event.target.value })} />
              <p className="mt-1.5 rounded-lg border border-[#cdebd8] bg-[#f1faf4] px-3 py-2 text-[12.5px] text-[#1f7a45]">{draft.success || "Members see this once their submission is saved."}</p>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {(["applicant", "admin"] as Audience[]).map((which) => (
            <TemplateEditor
              key={which}
              kind={kind}
              audience={which}
              template={draft[which]}
              fallback={defaults[which]}
              enabled={which === "applicant" ? draft.sendApplicant : draft.sendAdmin}
              onChange={(template) => {
                set({ [which]: template } as Partial<Draft>);
                setAudience(which);
              }}
              onFocus={() => setAudience(which)}
              focused={audience === which}
              onTest={() => {
                setAudience(which);
                void test(which);
              }}
              testing={testing === which}
            />
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(26,58,92,0.05)] xl:sticky xl:top-20">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-dim">Preview · sample submission</p>
            <div className="flex rounded-lg bg-s2 p-0.5" role="tablist" aria-label="Preview audience">
              {(["applicant", "admin"] as Audience[]).map((which) => (
                <button
                  key={which}
                  type="button"
                  role="tab"
                  aria-selected={audience === which}
                  onClick={() => setAudience(which)}
                  className={`rounded-md px-2.5 py-1 text-[12px] font-semibold transition ${audience === which ? "bg-white text-ink shadow-sm" : "text-mid hover:text-ink"}`}
                >
                  {which === "applicant" ? "Member" : "Desk"}
                </button>
              ))}
            </div>
          </div>
          <dl className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-border px-4 py-3 text-[12.5px]">
            <dt className="text-dim">To</dt>
            <dd className="truncate text-ink">{to}</dd>
            <dt className="text-dim">Subject</dt>
            <dd className="font-semibold text-ink">{preview.subject || "No subject"}</dd>
          </dl>
          <iframe title={`${copy.name} ${audience === "applicant" ? "member" : "desk"} email preview`} srcDoc={preview.html} sandbox="" className="h-[620px] w-full bg-[#f4f4f5]" />
          <p className="border-t border-border px-4 py-2.5 text-[11.5px] text-dim">
            {connected ? "Delivery is connected. Tests go to " : "Delivery is not connected yet. Tests are kept in the outbox for "}
            {adminEmail}.
          </p>
        </section>
      </div>
    </div>
  );
}
