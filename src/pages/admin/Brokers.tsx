/**
 * 1.5 admin — approved broker registry + introduction log.
 * Aquifert takes no commission position; this is an introduction-only flow.
 */
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";

export default function BrokersAdmin() {
  const utils = trpc.useUtils();
  const list = trpc.broker.adminList.useQuery();
  const sends = trpc.broker.adminSends.useQuery();
  const [form, setForm] = useState({ name: "", specialisms: "", regions: "", vesselClasses: "", contactName: "", contactEmail: "", status: "PENDING" as "PENDING" | "APPROVED" | "SUSPENDED", notes: "" });
  const [editing, setEditing] = useState<number | null>(null);
  const save = trpc.broker.adminSave.useMutation({ onSuccess: () => { toast.success("Broker saved"); utils.broker.adminList.invalidate(); setEditing(null); } });
  const logReply = trpc.broker.adminLogReply.useMutation({ onSuccess: () => { toast.success("Reply logged"); utils.broker.adminSends.invalidate(); } });
  const [replyFor, setReplyFor] = useState<number | null>(null);
  const [replyNote, setReplyNote] = useState("");

  const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <PageHeader title="Broker Registry" description="Approved brokers for the introduction flow. Consent is per-send and every send is logged — introduction only, no commission position." />

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="text-lg font-semibold">{editing ? `Edit broker #${editing}` : "Add broker"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="br-name">Name</Label><Input id="br-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label htmlFor="br-email">Contact email</Label><Input id="br-email" type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></div>
            <div><Label htmlFor="br-cn">Contact name</Label><Input id="br-cn" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
            <div>
              <Label htmlFor="br-status">Approval status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
                <SelectTrigger id="br-status"><SelectValue /></SelectTrigger>
                <SelectContent>{["PENDING", "APPROVED", "SUSPENDED"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="br-spec">Specialisms (comma-separated)</Label><Input id="br-spec" value={form.specialisms} onChange={(e) => setForm({ ...form, specialisms: e.target.value })} /></div>
            <div><Label htmlFor="br-reg">Regions</Label><Input id="br-reg" value={form.regions} onChange={(e) => setForm({ ...form, regions: e.target.value })} /></div>
            <div><Label htmlFor="br-vc">Vessel classes</Label><Input id="br-vc" value={form.vesselClasses} onChange={(e) => setForm({ ...form, vesselClasses: e.target.value })} /></div>
            <div><Label htmlFor="br-notes">Notes</Label><Input id="br-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => save.mutate({
              id: editing ?? undefined, name: form.name, contactEmail: form.contactEmail,
              contactName: form.contactName || undefined, status: form.status,
              specialisms: csv(form.specialisms), regions: csv(form.regions), vesselClasses: csv(form.vesselClasses),
              notes: form.notes || undefined,
            })}>Save broker</Button>
            {editing && <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {(list.data ?? []).map((b) => (
          <Card key={b.id}>
            <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.specialisms.join(", ")} · {b.regions.join(", ")} · {b.contactEmail}</p>
              </div>
              <Badge variant={b.status === "APPROVED" ? "default" : b.status === "SUSPENDED" ? "destructive" : "outline"}>{b.status}</Badge>
              <Button size="sm" variant="outline" onClick={() => { setEditing(b.id); setForm({ name: b.name, contactEmail: b.contactEmail, contactName: b.contactName ?? "", status: b.status, specialisms: b.specialisms.join(", "), regions: b.regions.join(", "), vesselClasses: b.vesselClasses.join(", "), notes: b.notes ?? "" }); }}>Edit</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-lg font-semibold">Introduction log</h2>
          <div className="space-y-2">
            {(sends.data ?? []).map((s) => (
              <div key={s.id} className="rounded-md border border-border p-3 text-sm">
                <p className="font-medium">{s.userName} → {s.brokerName}</p>
                <p className="text-xs text-muted-foreground">{new Date(s.sentAt).toISOString().slice(0, 16).replace("T", " ")} · fields: {Object.keys(s.fields).join(", ")}</p>
                {s.replyNote && <p className="mt-1 rounded bg-muted/60 p-2 text-xs">Reply: {s.replyNote}</p>}
                {replyFor === s.id ? (
                  <div className="mt-2 flex gap-2">
                    <Input value={replyNote} onChange={(e) => setReplyNote(e.target.value)} placeholder="Broker reply note" aria-label="Reply note" />
                    <Button size="sm" onClick={() => { logReply.mutate({ sendId: s.id, note: replyNote }); setReplyFor(null); setReplyNote(""); }}>Log</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" className="mt-1" onClick={() => setReplyFor(s.id)}>Log reply</Button>
                )}
              </div>
            ))}
            {sends.isLoading && <div className="h-20 animate-pulse rounded-md bg-muted/40" aria-label="Loading sends" />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
