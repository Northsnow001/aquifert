import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { InfoTip } from "@/components/aq1/InfoTip";
import { useAq1Tips } from "@/components/aq1/tips";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

/** Community Call — registration for the free 45-minute desk call. */
export default function Aq1CommunityCall() {
  const tips = useAq1Tips();
  const { user, organization } = useProfile();
  const q = trpc.aq1.communityNext.useQuery();
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [question, setQuestion] = useState("");
  const [reminders, setReminders] = useState(false);
  const [confirmed, setConfirmed] = useState<{ id: number; ics?: string } | null>(null);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const register = trpc.aq1.communityRegister.useMutation({
    onSuccess: (r) => { setConfirmed(r); q.refetch(); toast.success(r.already ? "You're already registered" : "Registered — confirmation email on its way"); },
    onError: (e) => toast.error(e.message),
  });
  const cancel = trpc.aq1.communityCancel.useMutation({ onSuccess: () => { setConfirmed(null); q.refetch(); toast.success("Registration cancelled"); } });

  const next = q.data?.next;
  const isRegistered = next != null && (q.data?.mySessionIds ?? []).includes(next.id);

  const downloadIcs = () => {
    if (!confirmed?.ics) return;
    const blob = new Blob([confirmed.ics], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "aquifert-community-call.ics"; a.click();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <PageHeader
        title={<span className="inline-flex items-center">Community Call <InfoTip label="Community Call" text={tips.communityCall} /></span>}
        description="A free 45-minute market and fertilizer call with the Aquifert desk."
      />
      {q.isLoading && <Card><CardContent className="p-5 text-sm text-muted-foreground">Loading…</CardContent></Card>}
      {q.data && !next && <EmptyState title="No call scheduled right now" description="The next community call hasn't been scheduled yet. Check back soon — the desk runs them regularly." />}
      {next && (
        <Card><CardContent className="space-y-4 p-5">
          <div>
            <h2 className="text-lg font-semibold">{next.topic}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Hosted by {next.host} · {next.durationMinutes} minutes<br />
              <span className="tabular-nums">{next.startsAt ? new Date(next.startsAt).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" }) : ""}</span> ({tz})
            </p>
            <p className="mt-2 text-sm text-muted-foreground">The desk walks through the current market — prices, tenders, supply events — and takes questions from buyers and traders.</p>
          </div>

          {isRegistered || confirmed ? (
            <div className="space-y-3 rounded-lg border border-teal-500/40 bg-teal-50 p-4 dark:bg-teal-500/10" role="status">
              <p className="text-sm font-semibold">You're registered.</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={downloadIcs} disabled={!confirmed?.ics}>Add to calendar (.ics)</Button>
                <Button size="sm" variant="ghost" onClick={() => cancel.mutate({ sessionId: next.id })}>Cancel registration</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div><Label htmlFor="cc-name">Name</Label><Input id="cc-name" className="mt-1" defaultValue={user?.name ?? ""} readOnly /></div>
                <div><Label htmlFor="cc-email">Email</Label><Input id="cc-email" className="mt-1" defaultValue={user?.email ?? ""} readOnly /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div><Label htmlFor="cc-company">Company</Label><Input id="cc-company" className="mt-1" defaultValue={organization?.name ?? ""} onChange={(e) => setCompany(e.target.value)} /></div>
                <div><Label htmlFor="cc-country">Country</Label><Input id="cc-country" className="mt-1" value={country} onChange={(e) => setCountry(e.target.value)} /></div>
              </div>
              <div>
                <Label htmlFor="cc-q">What would you like covered on the call? (optional)</Label>
                <Textarea id="cc-q" className="mt-1" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={1000} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="cc-rem" checked={reminders} onCheckedChange={(v) => setReminders(Boolean(v))} />
                <Label htmlFor="cc-rem" className="font-normal">Send me call reminders</Label>
              </div>
              <div>
                <Button disabled={register.isPending} onClick={() => register.mutate({
                  sessionId: next.id, name: user?.name ?? "", email: user?.email ?? "",
                  company: company || organization?.name || "", country, question, reminders,
                })}>{register.isPending ? "Registering…" : "Register for the call"}</Button>
              </div>
            </div>
          )}
        </CardContent></Card>
      )}

      {q.data && q.data.past.length > 0 && (
        <section aria-label="Past calls">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Past call recordings</h2>
          <ul className="space-y-2">
            {q.data.past.map((p) => (
              <li key={p.id} className="text-sm">
                <a className="text-teal-700 underline underline-offset-2 dark:text-teal-300" href={p.recordingUrl!} target="_blank" rel="noreferrer">{p.topic}</a>
                <span className="ml-2 text-xs text-muted-foreground">{new Date(p.startsAt).toLocaleDateString("en-GB")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
