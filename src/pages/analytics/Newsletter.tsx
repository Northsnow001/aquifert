/**
 * 1.8 Paid newsletter — subscriber archive + preference control.
 * Clear opt-out; unsubscribes are honoured in delivery.
 */
import { useState } from "react";
import { MailOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared/PageHeader";
import { trpc } from "@/providers/trpc";
import { LockedTeaser } from "@/components/analytics/shared";
import { toast } from "sonner";

export default function Newsletter() {
  const archive = trpc.newsletter.archive.useQuery(undefined, { retry: 0 });
  const locked = archive.error && !archive.isLoading;
  const optOut = trpc.newsletter.setOptOut.useMutation({ onSuccess: () => { toast.success("Preference saved"); archive.refetch(); } });
  const [openId, setOpenId] = useState<number | null>(null);
  const issue = trpc.newsletter.issue.useQuery({ id: openId ?? 0 }, { enabled: openId != null });

  if (locked) {
    return (
      <LockedTeaser capability="push.paid_newsletter" title="The Aquifert Briefing">
        <p>The subscriber-only newsletter: desk analysis, scheduled events and what actually moved — composed by the desk, delivered by email, and archived here so past issues stay readable.</p>
      </LockedTeaser>
    );
  }

  const data = archive.data;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <PageHeader title="The Aquifert Briefing" description="Your subscriber newsletter — every past issue, readable in your account." />

      <Card>
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div>
            <Label htmlFor="nl-optout" className="text-sm font-medium">Pause delivery</Label>
            <p className="text-xs text-muted-foreground">One switch, honoured immediately. Your archive stays available either way.</p>
          </div>
          <Switch
            id="nl-optout"
            checked={data?.optOut ?? false}
            onCheckedChange={(v) => optOut.mutate({ optOut: v })}
            aria-label="Pause newsletter delivery"
          />
        </CardContent>
      </Card>

      {data?.optOut && (
        <p className="rounded-md bg-muted/60 p-3 text-sm text-muted-foreground">Delivery is paused. Past issues remain below.</p>
      )}

      {openId == null ? (
        <div className="space-y-3">
          {(data?.issues ?? []).map((i) => (
            <Card key={i.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <button className="min-w-0 flex-1 text-left" onClick={() => setOpenId(i.id)}>
                  <p className="font-semibold">{i.subject}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{i.excerpt}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{i.sentAt ? new Date(i.sentAt).toISOString().slice(0, 10) : ""}</p>
                </button>
                <MailOpen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </CardContent>
            </Card>
          ))}
          {archive.isLoading && <div className="h-32 animate-pulse rounded-lg bg-muted/40" aria-label="Loading archive" />}
          {data && !data.issues.length && !data.optOut && (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">No issues delivered yet — the next scheduled issue will appear here.</CardContent></Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">{issue.data?.subject ?? "…"}</h2>
              <Button variant="outline" size="sm" onClick={() => setOpenId(null)}>Back to archive</Button>
            </div>
            <article className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{issue.data?.body ?? "…"}</article>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
