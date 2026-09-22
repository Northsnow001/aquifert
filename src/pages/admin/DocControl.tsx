import { useMemo, useState } from "react";
import {
  BadgeCheck, Ban, FileScan, FileUp, OctagonX, ScanSearch, ShieldAlert, ShieldCheck, Wrench,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DOC_CLASSES, GATE_STATES } from "@contracts/constants";
import { fmtDateTime } from "@/lib/format";
import { toast } from "sonner";

function useQueue() {
  return trpc.docgate.queue.useQuery();
}
type DocRow = NonNullable<ReturnType<typeof useQueue>["data"]>[number];
type Finding = { kind: string; match: string; context: string; entityName?: string };

const GATE_TONES: Record<string, string> = {
  BLOCKED: "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300",
  PASS: "border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300",
  RESOLVE_THEN_PASS: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  HARD_NO_GO: "border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
};

function GateChip({ state }: { state: string }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${GATE_TONES[state] ?? GATE_TONES.BLOCKED}`}>
      {GATE_STATES[state as keyof typeof GATE_STATES]?.label ?? state}
    </span>
  );
}

const KIND_LABELS: Record<string, string> = {
  ENTITY: "Entity name", ALIAS: "Alias", PHONE: "Phone", ADDRESS: "Address",
  BANK: "Bank account", CONTACT: "Contact", ANNOTATION: "Internal annotation",
};

/* ============================ Ingest dialog ============================ */

function IngestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const trades = trpc.trade.list.useQuery();
  const [orderId, setOrderId] = useState<string>("");
  const [type, setType] = useState<"INVOICE" | "PACKING_LIST" | "BOL" | "CERTIFICATE" | "CUSTOMS" | "SDS">("INVOICE");
  const [docClass, setDocClass] = useState<"A" | "B" | "C">("A");
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Finding[] | null>(null);

  const scan = trpc.docgate.scanPreview.useMutation({
    onSuccess: (r) => {
      setPreview(r.findings as Finding[]);
      if (r.findings.length === 0) toast.success(`Clean against ${r.entityCount} protected entit${r.entityCount === 1 ? "y" : "ies"}`);
      else toast.warning(`${r.findings.length} leak finding(s), will be gated RESOLVE_THEN_PASS`);
    },
    onError: (e) => toast.error(e.message),
  });
  const ingest = trpc.docgate.ingest.useMutation({
    onSuccess: (r) => {
      toast.success(`Ingested, gate: ${r.gateState.replace(/_/g, " ")}`);
      utils.docgate.queue.invalidate();
      onClose();
      setOrderId(""); setName(""); setText(""); setPreview(null);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Ingest supplier document</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">
          The body (OCR-extracted upstream, multilingual) is screened against the trade's whole protected-entity set on arrival. Default: BLOCKED.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-[11px] text-muted-foreground">Trade</Label>
            <Select value={orderId} onValueChange={setOrderId}>
              <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select trade…" /></SelectTrigger>
              <SelectContent>
                {(trades.data ?? []).map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.tradeRef ?? t.orderNumber}, {t.buyerOrg?.name ?? t.buyerName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Document type</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["INVOICE", "PACKING_LIST", "BOL", "CERTIFICATE", "CUSTOMS", "SDS"].map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Document class</Label>
            <Select value={docClass} onValueChange={(v) => setDocClass(v as typeof docClass)}>
              <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["A", "B", "C"] as const).map((c) => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{DOC_CLASSES[docClass]}</p>
          </div>
          <div className="col-span-2">
            <Label className="text-[11px] text-muted-foreground">Document name</Label>
            <Input className="mt-1 h-9" placeholder="e.g. Commercial Invoice INV-2026-041" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label className="text-[11px] text-muted-foreground">Body text (as OCR'd)</Label>
            <Textarea className="mt-1 min-h-40 font-data text-xs" placeholder="Paste the document body…" value={text}
              onChange={(e) => { setText(e.target.value); setPreview(null); }} />
          </div>
        </div>

        {preview && preview.length > 0 && (
          <ul className="mt-3 max-h-36 space-y-1.5 overflow-y-auto rounded-lg border border-amber-500/30 bg-amber-50/50 p-3 dark:bg-amber-500/5">
            {preview.map((f, i) => (
              <li key={i} className="text-[11px]">
                <span className="font-semibold text-amber-700 dark:text-amber-300">{KIND_LABELS[f.kind] ?? f.kind}:</span>{" "}
                <span className="font-data font-semibold">{f.match}</span>{" "}
                <span className="text-muted-foreground">, …{f.context}…</span>
              </li>
            ))}
          </ul>
        )}
        {preview && preview.length === 0 && (
          <p className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50/60 p-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:text-emerald-300">
            No protected terms detected, document will still enter BLOCKED until a human reviews.
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <Button variant="outline" disabled={!orderId || !text.trim() || scan.isPending}
            onClick={() => scan.mutate({ orderId: Number(orderId), text })}>
            <ScanSearch className="mr-1.5 h-4 w-4" /> Preview scan
          </Button>
          <Button className="flex-1 bg-navy-600 hover:bg-navy-700" disabled={!orderId || !name.trim() || !text.trim() || ingest.isPending}
            onClick={() => ingest.mutate({ orderId: Number(orderId), type, name: name.trim(), text, docClass })}>
            <FileUp className="mr-1.5 h-4 w-4" /> Ingest into gate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ Detail sheet ============================ */

function DocSheet({ doc, onClose }: { doc: DocRow; onClose: () => void }) {
  const utils = trpc.useUtils();
  const findings = (doc.scanFindings as Finding[] | null) ?? [];
  const invalidate = () => utils.docgate.queue.invalidate();

  const fix = trpc.docgate.applyFix.useMutation({
    onSuccess: (r) => {
      if (r.gateState === "PASS") toast.success("Fix applied, re-scan clean. Gate: PASS (human clearance still required).");
      else toast.warning(`Fix applied, gate now ${r.gateState.replace(/_/g, " ")}`);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const clear = trpc.docgate.clear.useMutation({
    onSuccess: () => { toast.success("Cleared for buyer release, this is now visible to the buyer"); invalidate(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const block = trpc.docgate.hardBlock.useMutation({
    onSuccess: () => { toast.success("Hard no-go applied"); invalidate(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const canFix = doc.gateState === "RESOLVE_THEN_PASS";
  const canClear = doc.gateState === "PASS" && !doc.buyerReleasable;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex flex-wrap items-center gap-2">
            {doc.name ?? `Document #${doc.id}`}
            <GateChip state={doc.gateState} />
            {doc.buyerReleasable && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <BadgeCheck className="h-3 w-3" /> Buyer-visible
              </span>
            )}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {doc.type.replace(/_/g, " ")} · Class {doc.docClass} · Trade {doc.tradeRef ?? doc.orderNumber} · {fmtDateTime(doc.createdAt)}
          </p>
        </SheetHeader>

        {/* Gate explanation */}
        <div className={`rounded-xl border p-3.5 text-xs leading-relaxed ${GATE_TONES[doc.gateState]}`}>
          {doc.gateState === "BLOCKED" && "Default-deny: nothing moves until the scan completes and a human reviews."}
          {doc.gateState === "RESOLVE_THEN_PASS" && `${findings.length} leak finding(s). A known fix exists (${doc.fixAction?.replace(/_/g, " ") ?? "regenerate"}), apply it, then the engine re-scans.`}
          {doc.gateState === "PASS" && (doc.buyerReleasable ? "Clean and human-cleared, visible to the buyer." : "Clean scan. A human must still clear it before the buyer can see it.")}
          {doc.gateState === "HARD_NO_GO" && "Blocked outright, this document can never reach the buyer. An authority-issued replacement must be requested at source."}
        </div>

        {/* Findings */}
        {findings.length > 0 && (
          <div className="mt-5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" /> Leak findings ({findings.length})
            </p>
            <ul className="max-h-56 space-y-2 overflow-y-auto">
              {findings.map((f, i) => (
                <li key={i} className="rounded-lg border border-amber-500/30 bg-amber-50/50 p-2.5 text-[11px] dark:bg-amber-500/5">
                  <p>
                    <span className="font-semibold text-amber-700 dark:text-amber-300">{KIND_LABELS[f.kind] ?? f.kind}</span>
                    {f.entityName ? <span className="text-muted-foreground"> · {f.entityName}</span> : null}
                    {", "}<span className="font-data font-semibold text-foreground">{f.match}</span>
                  </p>
                  <p className="mt-0.5 font-data text-muted-foreground">…{f.context}…</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-2">
          {canFix && (
            <Button size="sm" className="bg-teal-500 hover:bg-teal-600 aqf-btn-press" disabled={fix.isPending}
              onClick={() => fix.mutate({ documentId: doc.id })}>
              <Wrench className="mr-1.5 h-3.5 w-3.5" />
              Apply fix ({doc.docClass === "A" ? "regenerate on Aquifert letterhead" : doc.docClass === "B" ? "switch B/L + LOI" : "masked substitute"})
            </Button>
          )}
          {canClear && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 aqf-btn-press" disabled={clear.isPending}
              onClick={() => clear.mutate({ documentId: doc.id })}>
              <BadgeCheck className="mr-1.5 h-3.5 w-3.5" /> Clear for buyer release
            </Button>
          )}
          {doc.gateState !== "HARD_NO_GO" && (
            <Button size="sm" variant="outline" className="text-danger hover:text-danger" disabled={block.isPending}
              onClick={() => block.mutate({ documentId: doc.id })}>
              <OctagonX className="mr-1.5 h-3.5 w-3.5" /> Hard no-go
            </Button>
          )}
        </div>

        {/* Bodies */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Raw supplier body</p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 font-data text-[11px] leading-relaxed">
              {doc.rawText ?? "(no body)"}
            </pre>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clean buyer-facing body</p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-teal-500/30 bg-teal-50/40 p-3 font-data text-[11px] leading-relaxed dark:bg-teal-500/5">
              {doc.cleanText ?? "(not generated yet, apply the fix)"}
            </pre>
          </div>
        </div>

        {doc.clearedAt && (
          <p className="mt-4 text-[11px] text-muted-foreground">Cleared {fmtDateTime(doc.clearedAt)}, engine PASS + human clearance, in that order.</p>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ============================ Page ============================ */

export default function AdminDocControl() {
  const queue = useQueue();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [ingestOpen, setIngestOpen] = useState(false);
  const [gateFilter, setGateFilter] = useState<string>("all");

  const rows = useMemo(
    () => (queue.data ?? []).filter((d) => gateFilter === "all" || d.gateState === gateFilter),
    [queue.data, gateFilter],
  );
  const selected = rows.find((d) => d.id === selectedId) ?? (queue.data ?? []).find((d) => d.id === selectedId) ?? null;

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const d of queue.data ?? []) c[d.gateState] = (c[d.gateState] ?? 0) + 1;
    return c;
  }, [queue.data]);

  const columns: Column<DocRow>[] = [
    {
      key: "name", header: "Document", searchValue: (d) => d.name ?? "",
      render: (d) => (
        <div>
          <p className="font-medium">{d.name ?? `Document #${d.id}`}</p>
          <p className="text-[11px] text-muted-foreground">{d.type.replace(/_/g, " ")} · Class {d.docClass}</p>
        </div>
      ),
    },
    { key: "trade", header: "Trade", searchValue: (d) => `${d.tradeRef ?? ""} ${d.orderNumber}`, render: (d) => <span className="font-data text-xs">{d.tradeRef ?? d.orderNumber}</span> },
    {
      key: "gate", header: "Gate", sortValue: (d) => d.gateState,
      render: (d) => (
        <div className="flex flex-col items-start gap-1">
          <GateChip state={d.gateState} />
          {d.buyerReleasable && <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">buyer-visible</span>}
        </div>
      ),
    },
    {
      key: "findings", header: "Findings", sortValue: (d) => ((d.scanFindings as Finding[] | null) ?? []).length,
      render: (d) => {
        const n = ((d.scanFindings as Finding[] | null) ?? []).length;
        return n > 0
          ? <span className="font-data text-xs font-semibold text-amber-600 dark:text-amber-400">{n} leak{n === 1 ? "" : "s"}</span>
          : <span className="text-xs text-muted-foreground">clean</span>;
      },
    },
    {
      key: "fix", header: "Fix",
      render: (d) => <span className="text-xs text-muted-foreground">{d.fixAction ? d.fixAction.replace(/_/g, " ") : "N/A"}</span>,
    },
    { key: "date", header: "Ingested", sortValue: (d) => d.createdAt, render: (d) => <span className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(d.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Document Control"
        description="Identity firewall, default-deny on every document. The engine flags; a human clears; nothing that could reveal a supplier reaches a buyer, ever."
        actions={
          <Button onClick={() => setIngestOpen(true)} className="bg-teal-500 hover:bg-teal-600 aqf-btn-press">
            <FileScan className="mr-1.5 h-4 w-4" /> Ingest document
          </Button>
        }
      />

      {/* Gate summary strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(Object.keys(GATE_STATES) as (keyof typeof GATE_STATES)[]).map((k) => (
          <button key={k} type="button" onClick={() => setGateFilter(gateFilter === k ? "all" : k)}
            className={`rounded-xl border p-3.5 text-left transition hover:shadow-sm ${gateFilter === k ? "ring-2 ring-teal-500/50" : ""} ${GATE_TONES[k]}`}>
            <p className="font-data text-2xl font-bold">{counts[k] ?? 0}</p>
            <p className="mt-0.5 text-[11px] font-medium leading-tight">{GATE_STATES[k].label}</p>
          </button>
        ))}
      </div>

      <div className="mb-5 rounded-xl border border-border bg-muted/30 p-3.5 text-[11px] leading-relaxed text-muted-foreground">
        <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground"><ShieldCheck className="h-3.5 w-3.5" /> Document classes</p>
        {(["A", "B", "C"] as const).map((c) => <p key={c}><span className="font-data font-semibold">Class {c}</span>, {DOC_CLASSES[c]}</p>)}
        <p className="mt-1 flex items-center gap-1.5"><Ban className="h-3 w-3" /> A letterhead is not a reissue, internal annotations ("Real Shipper / Real Consignee") are leaks.</p>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        onRowClick={(d) => setSelectedId(d.id)}
        searchPlaceholder="Search document or trade…"
        emptyTitle="No documents in the gate"
        emptyDescription="Ingest a supplier document to screen it against the trade's protected-entity set."
      />

      {selected && <DocSheet doc={selected} onClose={() => setSelectedId(null)} />}
      <IngestDialog open={ingestOpen} onClose={() => setIngestOpen(false)} />
    </div>
  );
}
