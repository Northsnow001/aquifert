/**
 * 1.8 admin — paid newsletter composer. Mirrors the Library review workflow:
 * DRAFT → IN_REVIEW → APPROVED → SCHEDULED → SENT. Never auto-publishes.
 * Content is scanned against licensed-redistribution terms before sending.
 */
import { useState } from "react";
import { Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/PageHeader";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";

const FLOW: Record<string, string[]> = { DRAFT: ["IN_REVIEW"], IN_REVIEW: ["APPROVED", "DRAFT"], APPROVED: [], SCHEDULED: [], SENT: [] };

export default function NewsletterAdmin() {
  const utils = trpc.useUtils();
  const list = trpc.newsletter.adminList.useQuery();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const save = trpc.newsletter.adminSave.useMutation({ onSuccess: () => { toast.success("Draft saved"); utils.newsletter.adminList.invalidate(); setSubject(""); setBody(""); setEditing(null); } });
  const transition = trpc.newsletter.adminTransition.useMutation({ onSuccess: () => { toast.success("Status updated"); utils.newsletter.adminList.invalidate(); } });
  const schedule = trpc.newsletter.adminSchedule.useMutation({ onSuccess: () => { toast.success("Scheduled"); utils.newsletter.adminList.invalidate(); } });
  const send = trpc.newsletter.adminSend.useMutation({
    onSuccess: (r) => toast.success(`Sent to ${r.sent} subscribers — licence check: ${r.scanNote}`),
    onError: (e) => toast.error(e.message),
  });
  const sweep = trpc.newsletter.sweep.useMutation({ onSuccess: (r) => toast.success(`Sweep: ${r.due} due, ${r.sent} delivered`) });

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <PageHeader
        title="Paid Newsletter"
        description="Compose, review, schedule, send. A human approves every issue; licensed content is scanned before anything leaves."
        actions={<Button variant="outline" onClick={() => sweep.mutate()}>Run schedule sweep</Button>}
      />

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="text-lg font-semibold">{editing ? `Edit draft #${editing}` : "New issue"}</h2>
          <div>
            <Label htmlFor="nl-subject">Subject</Label>
            <Input id="nl-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Urea: the October turnaround question" />
          </div>
          <div>
            <Label htmlFor="nl-body">Body</Label>
            <Textarea id="nl-body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Desk analysis…" />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => save.mutate({ id: editing ?? undefined, subject, body })}>Save draft</Button>
            {editing && <Button variant="ghost" onClick={() => { setEditing(null); setSubject(""); setBody(""); }}>Cancel edit</Button>}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {(list.data ?? []).map((i) => (
          <Card key={i.id}>
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{i.subject}</p>
                <p className="text-xs text-muted-foreground">
                  #{i.id} · {i.licenceChecked ? `licence check: ${i.licenceCheckNote}` : "licence check pending"}
                  {i.sentAt ? ` · sent ${new Date(i.sentAt).toISOString().slice(0, 16).replace("T", " ")}` : ""}
                </p>
              </div>
              <Badge variant={i.status === "SENT" ? "default" : "outline"}>{i.status}</Badge>
              <div className="flex flex-wrap gap-1.5">
                {i.status === "DRAFT" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => { setEditing(i.id); setSubject(i.subject); setBody(i.body); }}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => transition.mutate({ id: i.id, to: "IN_REVIEW" })}>Submit for review</Button>
                  </>
                )}
                {i.status === "IN_REVIEW" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => transition.mutate({ id: i.id, to: "DRAFT" })}>Return to draft</Button>
                    <Button size="sm" onClick={() => transition.mutate({ id: i.id, to: "APPROVED" })}>Approve</Button>
                  </>
                )}
                {i.status === "APPROVED" && (
                  <>
                    <Input type="datetime-local" className="w-52" onChange={(e) => e.target.value && schedule.mutate({ id: i.id, scheduledAt: e.target.value })} aria-label="Schedule at" />
                    <Button size="sm" onClick={() => send.mutate({ id: i.id })}><Send className="mr-1 h-3.5 w-3.5" /> Send now</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {list.isLoading && <div className="h-24 animate-pulse rounded-lg bg-muted/40" aria-label="Loading issues" />}
      </div>
    </div>
  );
}
