import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/** AQ1 admin console: analysis notes editor, community call sessions and
 *  registrations export, order-requirement queue, and free-tier limits. */
export default function AdminAq1() {
  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <PageHeader title="AQ1 Free Plan" description="Analysis feed, community calls, requirement queue and free-tier limits." />
      <Tabs defaultValue="analysis">
        <TabsList>
          <TabsTrigger value="analysis">Analysis feed</TabsTrigger>
          <TabsTrigger value="calls">Community calls</TabsTrigger>
          <TabsTrigger value="requirements">Order requirements</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
        </TabsList>
        <TabsContent value="analysis"><AnalysisTab /></TabsContent>
        <TabsContent value="calls"><CallsTab /></TabsContent>
        <TabsContent value="requirements"><RequirementsTab /></TabsContent>
        <TabsContent value="limits"><LimitsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function AnalysisTab() {
  const list = trpc.aq1.analysisAdmin.useQuery();
  const [draft, setDraft] = useState({ id: 0, title: "", body: "", authorName: "", products: "", regions: "", relatedTelexIds: "", status: "DRAFT" as "DRAFT" | "SCHEDULED" | "PUBLISHED" });
  const save = trpc.aq1.analysisSave.useMutation({
    onSuccess: () => { list.refetch(); setDraft({ id: 0, title: "", body: "", authorName: "", products: "", regions: "", relatedTelexIds: "", status: "DRAFT" }); toast.success("Saved"); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card><CardContent className="space-y-3 p-4">
        <h2 className="font-semibold">{draft.id ? "Edit note" : "New note"}</h2>
        <div><Label htmlFor="an-title">Title</Label><Input id="an-title" className="mt-1" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></div>
        <div><Label htmlFor="an-author">Author byline</Label><Input id="an-author" className="mt-1" value={draft.authorName} onChange={(e) => setDraft({ ...draft, authorName: e.target.value })} /></div>
        <div><Label htmlFor="an-body">Body (blank line between paragraphs)</Label><Textarea id="an-body" className="mt-1 min-h-40" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></div>
        <div><Label htmlFor="an-prod">Products (comma-separated)</Label><Input id="an-prod" className="mt-1" value={draft.products} onChange={(e) => setDraft({ ...draft, products: e.target.value })} /></div>
        <div><Label htmlFor="an-reg">Regions (comma-separated)</Label><Input id="an-reg" className="mt-1" value={draft.regions} onChange={(e) => setDraft({ ...draft, regions: e.target.value })} /></div>
        <div><Label htmlFor="an-rel">Related TELEX ids (comma-separated)</Label><Input id="an-rel" className="mt-1" value={draft.relatedTelexIds} onChange={(e) => setDraft({ ...draft, relatedTelexIds: e.target.value })} /></div>
        <div>
          <Label htmlFor="an-status">Status</Label>
          <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as typeof draft.status })}>
            <SelectTrigger id="an-status" className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="DRAFT">Draft</SelectItem><SelectItem value="SCHEDULED">Scheduled</SelectItem><SelectItem value="PUBLISHED">Publish now</SelectItem></SelectContent>
          </Select>
        </div>
        <Button disabled={save.isPending || !draft.title || !draft.body || !draft.authorName} onClick={() => save.mutate({
          id: draft.id || undefined, title: draft.title, body: draft.body, authorName: draft.authorName,
          products: draft.products.split(",").map((x) => x.trim()).filter(Boolean),
          regions: draft.regions.split(",").map((x) => x.trim()).filter(Boolean),
          relatedTelexIds: draft.relatedTelexIds.split(",").map((x) => Number(x.trim())).filter((n) => Number.isFinite(n) && n > 0),
          status: draft.status,
        })}>Save</Button>
      </CardContent></Card>
      <Card><CardContent className="p-4">
        <h2 className="mb-2 font-semibold">Notes</h2>
        <ul className="space-y-2">
          {(list.data ?? []).map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-2 rounded border border-border p-2 text-sm">
              <span className="min-w-0 truncate">{n.title}</span>
              <span className="flex items-center gap-2">
                <Badge variant={n.status === "PUBLISHED" ? "default" : "secondary"}>{n.status}</Badge>
                <Button size="sm" variant="outline" onClick={() => setDraft({
                  id: n.id, title: n.title, body: n.body, authorName: n.authorName,
                  products: n.products.join(", "), regions: n.regions.join(", "),
                  relatedTelexIds: n.relatedTelexIds.join(", "), status: n.status,
                })}>Edit</Button>
              </span>
            </li>
          ))}
          {list.data?.length === 0 && <li className="text-sm text-muted-foreground">No notes yet.</li>}
        </ul>
      </CardContent></Card>
    </div>
  );
}

function CallsTab() {
  const q = trpc.aq1.communitySessionsAdmin.useQuery();
  const [d, setD] = useState({ id: 0, startsAt: "", topic: "", host: "", joiningLink: "", recordingUrl: "", status: "SCHEDULED" as "SCHEDULED" | "COMPLETED" | "CANCELLED" });
  const save = trpc.aq1.communitySessionSave.useMutation({
    onSuccess: () => { q.refetch(); setD({ id: 0, startsAt: "", topic: "", host: "", joiningLink: "", recordingUrl: "", status: "SCHEDULED" }); toast.success("Saved"); },
    onError: (e) => toast.error(e.message),
  });
  const exportCsv = () => {
    const rows = [["session", "name", "email", "company", "country", "question", "reminders", "status"]];
    const topics = new Map((q.data?.sessions ?? []).map((x) => [x.id, x.topic]));
    (q.data?.registrations ?? []).forEach((r) => rows.push([topics.get(r.sessionId) ?? String(r.sessionId), r.name, r.email, r.company ?? "", r.country ?? "", (r.question ?? "").replaceAll("\n", " "), String(r.reminders), r.status]));
    const blob = new Blob([rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "community-call-registrations.csv"; a.click();
  };
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card><CardContent className="space-y-3 p-4">
        <h2 className="font-semibold">{d.id ? "Edit session" : "New session"}</h2>
        <div><Label htmlFor="cs-when">Date & time</Label><Input id="cs-when" type="datetime-local" className="mt-1" value={d.startsAt} onChange={(e) => setD({ ...d, startsAt: e.target.value })} /></div>
        <div><Label htmlFor="cs-topic">Topic</Label><Input id="cs-topic" className="mt-1" value={d.topic} onChange={(e) => setD({ ...d, topic: e.target.value })} /></div>
        <div><Label htmlFor="cs-host">Host</Label><Input id="cs-host" className="mt-1" value={d.host} onChange={(e) => setD({ ...d, host: e.target.value })} /></div>
        <div><Label htmlFor="cs-link">Joining link</Label><Input id="cs-link" className="mt-1" value={d.joiningLink} onChange={(e) => setD({ ...d, joiningLink: e.target.value })} /></div>
        <div><Label htmlFor="cs-rec">Recording URL (past calls)</Label><Input id="cs-rec" className="mt-1" value={d.recordingUrl} onChange={(e) => setD({ ...d, recordingUrl: e.target.value })} /></div>
        <div>
          <Label htmlFor="cs-status">Status</Label>
          <Select value={d.status} onValueChange={(v) => setD({ ...d, status: v as typeof d.status })}>
            <SelectTrigger id="cs-status" className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="SCHEDULED">Scheduled</SelectItem><SelectItem value="COMPLETED">Completed</SelectItem><SelectItem value="CANCELLED">Cancelled</SelectItem></SelectContent>
          </Select>
        </div>
        <Button disabled={save.isPending || !d.startsAt || !d.topic || !d.host} onClick={() => save.mutate({ id: d.id || undefined, startsAt: new Date(d.startsAt).toISOString(), topic: d.topic, host: d.host, joiningLink: d.joiningLink, recordingUrl: d.recordingUrl, status: d.status, durationMinutes: 45 })}>Save</Button>
      </CardContent></Card>
      <Card><CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Sessions</h2>
          <Button size="sm" variant="outline" onClick={exportCsv}>Export registrations (CSV)</Button>
        </div>
        <ul className="space-y-2">
          {(q.data?.sessions ?? []).map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-2 rounded border border-border p-2 text-sm">
              <span>{x.topic} · {new Date(x.startsAt).toLocaleString("en-GB")} · {x.registrations} registered</span>
              <Button size="sm" variant="outline" onClick={() => setD({ id: x.id, startsAt: new Date(x.startsAt).toISOString().slice(0, 16), topic: x.topic, host: x.host, joiningLink: x.joiningLink ?? "", recordingUrl: x.recordingUrl ?? "", status: x.status })}>Edit</Button>
            </li>
          ))}
          {q.data?.sessions.length === 0 && <li className="text-sm text-muted-foreground">No sessions yet.</li>}
        </ul>
      </CardContent></Card>
    </div>
  );
}

function RequirementsTab() {
  const q = trpc.aq1.requirementsAdmin.useQuery();
  return (
    <Card><CardContent className="p-4">
      <h2 className="mb-2 font-semibold">Order requirements (captured at Step 1, including abandoned funnels)</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted-foreground">
            <th className="py-1 pr-3">When</th><th className="pr-3">User</th><th className="pr-3">Requirement</th><th className="pr-3">Ports</th><th className="pr-3">Window</th><th>Status</th>
          </tr></thead>
          <tbody>
            {(q.data ?? []).map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="py-2 pr-3 tabular-nums">{new Date(r.createdAt).toLocaleDateString("en-GB")}</td>
                <td className="pr-3">{r.userName ?? r.userEmail ?? `#${r.userId}`}</td>
                <td className="pr-3">{r.quantityMt} MT {r.product}{r.grade ? ` (${r.grade})` : ""}, {r.packingStyle}{r.targetPrice ? `, target ${r.targetPrice} ${r.currency ?? ""}` : ""}</td>
                <td className="pr-3">{r.portOfEntry} → {r.destinationPort}</td>
                <td className="pr-3 tabular-nums">{r.deliveryWindowFrom} → {r.deliveryWindowTo}</td>
                <td><Badge variant="secondary">{r.status}</Badge></td>
              </tr>
            ))}
            {q.data?.length === 0 && <tr><td colSpan={6} className="py-4 text-muted-foreground">No requirements captured yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </CardContent></Card>
  );
}

function LimitsTab() {
  const q = trpc.aq1.settings.useQuery();
  const [v, setV] = useState<{ nitrogenReportsPerMonth: string; ureaCalcsPerMonth: string; savedReportsRetained: string } | null>(null);
  const save = trpc.aq1.updateSettings.useMutation({
    onSuccess: () => { q.refetch(); setV(null); toast.success("Limits updated — tooltips reflect this immediately"); },
    onError: (e) => toast.error(e.message),
  });
  const cur = v ?? (q.data ? { nitrogenReportsPerMonth: String(q.data.nitrogenReportsPerMonth), ureaCalcsPerMonth: String(q.data.ureaCalcsPerMonth), savedReportsRetained: String(q.data.savedReportsRetained) } : null);
  return (
    <Card><CardContent className="max-w-md space-y-3 p-4">
      <h2 className="font-semibold">Free-tier limits</h2>
      {cur && ([
        ["nitrogenReportsPerMonth", "Nitrogen reports per calendar month"],
        ["ureaCalcsPerMonth", "Urea cost calculations per calendar month"],
        ["savedReportsRetained", "Saved reports retained per user"],
      ] as const).map(([k, label]) => (
        <div key={k}>
          <Label htmlFor={`lim-${k}`}>{label}</Label>
          <Input id={`lim-${k}`} type="number" min={0} className="mt-1 tabular-nums" value={cur[k]} onChange={(e) => setV({ ...cur, [k]: e.target.value })} />
        </div>
      ))}
      <Button disabled={save.isPending || !cur} onClick={() => cur && save.mutate({
        nitrogenReportsPerMonth: Number(cur.nitrogenReportsPerMonth),
        ureaCalcsPerMonth: Number(cur.ureaCalcsPerMonth),
        savedReportsRetained: Number(cur.savedReportsRetained),
      })}>Save limits</Button>
    </CardContent></Card>
  );
}
