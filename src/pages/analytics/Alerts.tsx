/**
 * 1.9 tailored alerts + 1.10 daily brief preferences + delivery centre.
 * Channels: in-app and email; WhatsApp requires a verified number on prefs.
 */
import { useState } from "react";
import { BellPlus, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { trpc } from "@/providers/trpc";
import { LockedTeaser } from "@/components/analytics/shared";
import { toast } from "sonner";

const SUBJECT_TYPES = ["PRODUCT", "REGION", "LANE", "COUNTERPARTY"] as const;
const TRIGGERS = ["PRICE_MOVE", "LINEUP", "TENDER", "ANOMALY", "SUPPLY_DISRUPTION"] as const;

export default function Alerts() {
  const rules = trpc.alerts.myRules.useQuery(undefined, { retry: 0 });
  const locked = rules.error && !rules.isLoading;
  const prefs = trpc.alerts.prefs.useQuery();
  const feed = trpc.alerts.feed.useQuery({ limit: 20 });
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    subjectType: "PRODUCT" as (typeof SUBJECT_TYPES)[number],
    subjectKey: "",
    triggerType: "PRICE_MOVE" as (typeof TRIGGERS)[number],
    thresholdPct: "3",
    delivery: "DAILY_DIGEST" as "IMMEDIATE" | "DAILY_DIGEST" | "WEEKLY_DIGEST",
    channels: ["IN_APP"] as ("IN_APP" | "EMAIL" | "WHATSAPP")[],
  });
  const save = trpc.alerts.saveRule.useMutation({
    onSuccess: () => { toast.success("Alert saved"); utils.alerts.myRules.invalidate(); setForm({ ...form, subjectKey: "" }); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.alerts.deleteRule.useMutation({ onSuccess: () => { toast.success("Alert removed"); utils.alerts.myRules.invalidate(); } });
  const savePrefs = trpc.alerts.savePrefs.useMutation({ onSuccess: () => toast.success("Preferences saved") });
  const [brief, setBrief] = useState(false);

  const toggleChannel = (c: "IN_APP" | "EMAIL" | "WHATSAPP") =>
    setForm({ ...form, channels: form.channels.includes(c) ? form.channels.filter((x) => x !== c) : [...form.channels, c] });

  // All hooks above this line — the locked return must not change hook count.
  if (locked) {
    return (
      <LockedTeaser capability="push.tailored_alerts" title="Tailored Alerts & Daily Brief">
        <p>Your subjects, your thresholds, your delivery. Price moves beyond your limit, line-up activity on your lanes, tenders, anomalies and supply disruptions — as they happen, digested daily, or weekly. Plus a morning brief at your time, in your timezone.</p>
      </LockedTeaser>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
      <PageHeader title="Tailored Alerts & Daily Brief" description="Alerts that respect your attention: your subjects, your thresholds, capped volume with a digest rollup." />

      {/* New rule */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><BellPlus className="h-5 w-5" aria-hidden="true" /> New alert</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="al-type">Subject</Label>
              <Select value={form.subjectType} onValueChange={(v) => setForm({ ...form, subjectType: v as typeof form.subjectType })}>
                <SelectTrigger id="al-type"><SelectValue /></SelectTrigger>
                <SelectContent>{SUBJECT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="al-key">Subject detail</Label>
              <Input id="al-key" placeholder='e.g. "Urea (granular)" or "Middle East→India"' value={form.subjectKey} onChange={(e) => setForm({ ...form, subjectKey: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="al-trigger">Trigger</Label>
              <Select value={form.triggerType} onValueChange={(v) => setForm({ ...form, triggerType: v as typeof form.triggerType })}>
                <SelectTrigger id="al-trigger"><SelectValue /></SelectTrigger>
                <SelectContent>{TRIGGERS.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.triggerType === "PRICE_MOVE" && (
              <div>
                <Label htmlFor="al-th">Move beyond (%)</Label>
                <Input id="al-th" inputMode="decimal" value={form.thresholdPct} onChange={(e) => setForm({ ...form, thresholdPct: e.target.value })} />
              </div>
            )}
            <div>
              <Label htmlFor="al-del">Delivery</Label>
              <Select value={form.delivery} onValueChange={(v) => setForm({ ...form, delivery: v as typeof form.delivery })}>
                <SelectTrigger id="al-del"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMMEDIATE">Immediate</SelectItem>
                  <SelectItem value="DAILY_DIGEST">Daily digest</SelectItem>
                  <SelectItem value="WEEKLY_DIGEST">Weekly digest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Channels</legend>
            <div className="flex flex-wrap gap-4">
              {(["IN_APP", "EMAIL", "WHATSAPP"] as const).map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.channels.includes(c)} onCheckedChange={() => toggleChannel(c)} aria-label={c} /> {c === "IN_APP" ? "In-app" : c === "EMAIL" ? "Email" : "WhatsApp"}
                </label>
              ))}
            </div>
          </fieldset>
          <Button onClick={() => save.mutate({
            subjectType: form.subjectType, subjectKey: form.subjectKey,
            triggerType: form.triggerType, thresholdPct: form.triggerType === "PRICE_MOVE" ? Number(form.thresholdPct) : undefined,
            delivery: form.delivery, channels: form.channels, active: true,
          })}>
            <Plus className="mr-1.5 h-4 w-4" /> Create alert
          </Button>
        </CardContent>
      </Card>

      {/* My rules */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-lg font-semibold">Your alerts</h2>
          <div className="space-y-2">
            {(rules.data ?? []).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                <span><Badge variant="outline">{r.subjectType}</Badge> <span className="font-medium">{r.subjectKey}</span> · {r.triggerType.replace(/_/g, " ")}{r.thresholdPct != null && ` > ${r.thresholdPct}%`} · {r.delivery.replace(/_/g, " ").toLowerCase()}</span>
                <Button size="sm" variant="ghost" onClick={() => del.mutate({ id: r.id })} aria-label={`Delete alert ${r.subjectKey}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            {rules.isLoading && <div className="h-20 animate-pulse rounded-md bg-muted/40" aria-label="Loading alerts" />}
            {rules.data && !rules.data.length && <p className="text-sm text-muted-foreground">No alerts yet. Create one above — start with a product and a threshold you care about.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Delivery centre */}
      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-lg font-semibold">Delivery centre</h2>
          <div className="space-y-2">
            {(feed.data ?? []).map((d) => (
              <div key={d.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium">{d.title}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">{d.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(d.sentAt).toISOString().slice(0, 16).replace("T", " ")} · {d.channel}{d.readAt ? " · read" : ""}</p>
              </div>
            ))}
            {feed.isLoading && <div className="h-20 animate-pulse rounded-md bg-muted/40" aria-label="Loading deliveries" />}
            {feed.data && !feed.data.length && <p className="text-sm text-muted-foreground">Nothing delivered yet — alerts and briefs land here.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Brief prefs */}
      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="text-lg font-semibold">Morning brief</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="br-time">Brief time</Label>
              <Input id="br-time" type="time" defaultValue={prefs.data?.briefTime ?? "07:00"} onBlur={(e) => savePrefs.mutate({ timezone: prefs.data?.timezone ?? "Europe/London", briefTime: e.target.value, briefEnabled: prefs.data?.briefEnabled ?? true, whatsappNumber: prefs.data?.whatsappNumber })} />
            </div>
            <div>
              <Label htmlFor="br-tz">Timezone</Label>
              <Input id="br-tz" defaultValue={prefs.data?.timezone ?? "Europe/London"} onBlur={(e) => savePrefs.mutate({ timezone: e.target.value || "Europe/London", briefTime: prefs.data?.briefTime ?? "07:00", briefEnabled: prefs.data?.briefEnabled ?? true, whatsappNumber: prefs.data?.whatsappNumber })} />
            </div>
            <div>
              <Label htmlFor="br-wa">WhatsApp number (optional)</Label>
              <Input id="br-wa" placeholder="+44…" defaultValue={prefs.data?.whatsappNumber ?? ""} onBlur={(e) => savePrefs.mutate({ timezone: prefs.data?.timezone ?? "Europe/London", briefTime: prefs.data?.briefTime ?? "07:00", briefEnabled: prefs.data?.briefEnabled ?? true, whatsappNumber: e.target.value || null })} />
            </div>
          </div>
          <Button variant="outline" onClick={() => setBrief(!brief)}>{brief ? "Hide preview" : "Preview tomorrow's brief"}</Button>
          {brief && <BriefPreview />}
        </CardContent>
      </Card>
    </div>
  );
}

function BriefPreview() {
  const q = trpc.alerts.briefPreview.useQuery(undefined, { retry: 0 });
  if (q.error) return <p className="text-sm text-muted-foreground">The daily brief is part of your plan's push settings — unlock AQ Analytics for the morning brief.</p>;
  return (
    <div className="rounded-md border border-border bg-muted/40 p-4">
      <p className="mb-2 text-sm font-semibold">{q.data?.title ?? "Building your brief…"}</p>
      <div className="whitespace-pre-wrap text-sm text-muted-foreground">{q.data?.body ?? "…"}</div>
    </div>
  );
}
