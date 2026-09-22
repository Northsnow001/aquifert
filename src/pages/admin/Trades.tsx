import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft, ArrowLeftRight, BadgeDollarSign, Check, ChevronRight, FileCheck2,
  FileText, Gavel, GitCompareArrows, Plus, ShieldCheck, Ship, Trash2, Truck,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRADE_STAGES } from "@contracts/constants";
import { fmtDateTime } from "@/lib/format";
import { toast } from "sonner";

function useTrades() {
  return trpc.trade.list.useQuery();
}
type TradeRow = NonNullable<ReturnType<typeof useTrades>["data"]>[number];

const DEAL_STYLES: Record<string, string> = {
  AQ_ZERO: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  TRADITIONAL: "bg-navy-100 text-navy-700 dark:bg-navy-500/20 dark:text-navy-200",
};

function DealChip({ dealType }: { dealType: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${DEAL_STYLES[dealType] ?? DEAL_STYLES.AQ_ZERO}`}>
      {dealType === "AQ_ZERO" ? "AQ Zero · £0 margin" : "Traditional · margin trade"}
    </span>
  );
}

const money = (currency: string | null | undefined, n: number | null | undefined) =>
  n == null ? "N/A" : `${currency ?? "USD"} ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ============================== List view ============================== */

function TradeList() {
  const trades = useTrades();
  const navigate = useNavigate();

  const columns: Column<TradeRow>[] = [
    {
      key: "ref", header: "Trade",
      searchValue: (t) => `${t.tradeRef ?? ""} ${t.orderNumber}`,
      render: (t) => (
        <div>
          <p className="font-data text-xs font-semibold">{t.tradeRef ?? t.orderNumber}</p>
          <p className="text-[11px] text-muted-foreground">{t.orderNumber}</p>
        </div>
      ),
    },
    { key: "deal", header: "Deal type", render: (t) => <DealChip dealType={t.dealType} /> },
    {
      key: "buyer", header: "Buyer", searchValue: (t) => t.buyerOrg?.name ?? t.buyerName,
      render: (t) => (
        <div>
          <p className="font-medium">{t.buyerOrg?.name ?? t.buyerName}</p>
          <p className="text-[11px] text-muted-foreground">margin profile {t.buyerOrg?.marginProfilePct ?? 0}%</p>
        </div>
      ),
    },
    {
      key: "stage", header: "Lifecycle", sortValue: (t) => t.tradeStage ?? 1,
      render: (t) => (
        <div className="min-w-36">
          <p className="text-xs font-medium">Stage {t.tradeStage ?? 1}/14 · {TRADE_STAGES[(t.tradeStage ?? 1) - 1]}</p>
          <div className="mt-1 h-1.5 w-36 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-teal-500" style={{ width: `${(((t.tradeStage ?? 1) - 1) / 13) * 100}%` }} />
          </div>
        </div>
      ),
    },
    {
      key: "buffers", header: "Back-to-back buffers",
      render: (t) => (
        <div className="text-[11px] leading-relaxed text-muted-foreground">
          <p>Buy {t.buySpec ?? "N/A"} · {t.buyQtyMt ?? "N/A"} MT firm</p>
          <p>Sell {t.sellSpec ?? "N/A"} · {t.sellQtyMt ?? "N/A"} MT ±{t.tolerancePct ?? 0}%</p>
        </div>
      ),
    },
    {
      key: "commercials", header: "Commercials /MT",
      render: (t) => (
        <div className="font-data text-[11px] leading-relaxed">
          <p className="text-muted-foreground">buy {money(t.tradeCurrency, t.buyPricePerMt)} + freight {money(t.tradeCurrency, t.freightPerMt)}</p>
          <p className="font-semibold text-foreground">sell {money(t.tradeCurrency, t.sellPricePerMt)}</p>
        </div>
      ),
    },
    { key: "chev", header: "", render: () => <ChevronRight className="h-4 w-4 text-muted-foreground" /> },
  ];

  return (
    <div>
      <PageHeader
        title="Trade Desk"
        description="Back-to-back trades on the 14-stage lifecycle, spec and quantity buffers, dual margin architecture, masked freight bidding."
      />
      <DataTable
        columns={columns}
        rows={trades.data ?? []}
        onRowClick={(t) => navigate(`/admin/trades/${t.id}`)}
        searchPlaceholder="Search trade ref or buyer…"
        emptyTitle="No trades yet"
        emptyDescription="Accepted quotes become trades and move through the 14-stage lifecycle here."
      />
    </div>
  );
}

/* ============================== Detail view ============================== */

function StageStepper({ trade, onAdvance, advancing }: { trade: TradeRow; onAdvance: (stage: number) => void; advancing: boolean }) {
  const current = trade.tradeStage ?? 1;
  return (
    <div className="aqf-card-3d p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">14-stage trade lifecycle</p>
        <span className="text-xs font-data text-muted-foreground">Stage {current}/14</span>
      </div>
      <ol className="grid gap-1.5 sm:grid-cols-2">
        {TRADE_STAGES.map((label, i) => {
          const n = i + 1;
          const done = n < current;
          const active = n === current;
          return (
            <li key={n}>
              <button
                type="button"
                disabled={advancing || n === current}
                onClick={() => onAdvance(n)}
                title={n === current ? "Current stage" : `Advance to stage ${n}`}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-xs transition ${
                  active
                    ? "border-teal-500/50 bg-teal-50 font-semibold text-teal-800 dark:bg-teal-500/10 dark:text-teal-200"
                    : done
                      ? "border-border bg-muted/40 text-muted-foreground"
                      : "border-border text-muted-foreground hover:border-teal-500/40 hover:text-foreground"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    active ? "bg-teal-500 text-white" : done ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-3 w-3" /> : n}
                </span>
                <span className="leading-tight">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {(trade.stageHistory as { stage: number; note: string | null; actor: string; at: string }[] | null)?.length ? (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Stage history</p>
          <ul className="space-y-1 text-[11px] text-muted-foreground">
            {(trade.stageHistory as { stage: number; note: string | null; actor: string; at: string }[]).slice(-5).reverse().map((h, i) => (
              <li key={i}>
                <span className="font-data">S{h.stage}</span> · {h.actor} · {fmtDateTime(h.at)}{h.note ? `, ${h.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------- Buffers editor ------------------------- */

function BuffersCard({ trade }: { trade: TradeRow }) {
  const utils = trpc.useUtils();
  const [f, setF] = useState({
    buySpec: trade.buySpec ?? "",
    sellSpec: trade.sellSpec ?? "",
    buyQtyMt: trade.buyQtyMt?.toString() ?? "",
    sellQtyMt: trade.sellQtyMt?.toString() ?? "",
    tolerancePct: trade.tolerancePct?.toString() ?? "",
    buyContractRef: trade.buyContractRef ?? "",
    sellContractRef: trade.sellContractRef ?? "",
    inspectionBasis: (trade.inspectionBasis ?? "SELLER_CERT") as "SELLER_CERT" | "THIRD_PARTY",
    documentaryInstructions: trade.documentaryInstructions ?? "",
  });
  const save = trpc.trade.setBuffers.useMutation({
    onSuccess: () => { toast.success("Back-to-back buffers saved"); utils.trade.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const num = (v: string) => (v.trim() === "" ? undefined : Number(v));
  const field = (key: keyof typeof f, label: string, placeholder?: string) => (
    <div>
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input className="mt-1 h-8 text-xs" value={f[key] as string} placeholder={placeholder}
        onChange={(e) => setF({ ...f, [key]: e.target.value })} />
    </div>
  );

  return (
    <div className="aqf-card-3d p-5">
      <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <GitCompareArrows className="h-3.5 w-3.5" /> Back-to-back contract buffers
      </p>
      <p className="mb-4 text-[11px] text-muted-foreground">
        The sell side never exceeds the buy side, tighter spec bought than sold, firm quantity bought with tolerance sold.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {field("buySpec", "Buy spec (tighter)", "Fe 19.7% min")}
        {field("sellSpec", "Sell spec (wider)", "Fe 19% min")}
        {field("buyQtyMt", "Buy qty MT (firm)", "48")}
        {field("sellQtyMt", "Sell qty MT", "50")}
        {field("tolerancePct", "Tolerance ±%", "10")}
        <div>
          <Label className="text-[11px] text-muted-foreground">Inspection basis</Label>
          <Select value={f.inspectionBasis} onValueChange={(v) => setF({ ...f, inspectionBasis: v as "SELLER_CERT" })}>
            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SELLER_CERT">Seller's certificate final</SelectItem>
              <SelectItem value="THIRD_PARTY">Third-party at loading</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {field("buyContractRef", "Buy contract ref")}
        {field("sellContractRef", "Sell contract ref")}
      </div>
      <div className="mt-3">
        <Label className="text-[11px] text-muted-foreground">Documentary instructions to supplier</Label>
        <Textarea className="mt-1 min-h-16 text-xs" value={f.documentaryInstructions}
          onChange={(e) => setF({ ...f, documentaryInstructions: e.target.value })}
          placeholder="e.g. No supplier letterhead on any document; B/L to order; COO consigned to Aquifert…" />
      </div>
      <Button
        size="sm" className="mt-3 bg-navy-600 hover:bg-navy-700 aqf-btn-press"
        disabled={save.isPending}
        onClick={() =>
          save.mutate({
            orderId: trade.id,
            buySpec: f.buySpec || undefined, sellSpec: f.sellSpec || undefined,
            buyQtyMt: num(f.buyQtyMt), sellQtyMt: num(f.sellQtyMt), tolerancePct: num(f.tolerancePct),
            buyContractRef: f.buyContractRef || undefined, sellContractRef: f.sellContractRef || undefined,
            inspectionBasis: f.inspectionBasis,
            documentaryInstructions: f.documentaryInstructions || undefined,
          })
        }
      >
        Save buffers
      </Button>
    </div>
  );
}

/* ------------------------- Commercials + margin ------------------------- */

function CommercialsCard({ trade }: { trade: TradeRow }) {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const propose = trpc.agent.proposeMargin.useMutation({
    onSuccess: (r) => {
      toast.success(`Margin proposal drafted, ${money(trade.tradeCurrency, r.sellPerMt)}/MT. Human review required in the AI Communication Hub.`);
      utils.agent.queue.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const c = trade.tradeCurrency;
  const rows: [string, string, string?][] = [
    ["Buy side (FOB) /MT", money(c, trade.buyPricePerMt)],
    ["Freight + clearing /MT", money(c, trade.freightPerMt)],
    [`Margin /MT (${trade.buyerOrg?.marginProfilePct ?? 0}% profile)`, money(c, trade.marginPerMt)],
    ["Sell price /MT (buyer-facing)", money(c, trade.sellPricePerMt), "font-bold text-foreground"],
  ];
  return (
    <div className="aqf-card-3d p-5">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <BadgeDollarSign className="h-3.5 w-3.5" /> Commercials
      </p>
      <dl className="space-y-2">
        {rows.map(([k, v, cls]) => (
          <div key={k} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className={`font-data ${cls ?? "font-medium"}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-50/60 p-3 text-[11px] leading-relaxed text-amber-800 dark:bg-amber-500/5 dark:text-amber-200">
        The profit margin varies per buyer and is <strong>always a final human-review step</strong> in the AI communication
        channel, nothing reaches the buyer until a human approves.
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" className="bg-teal-500 hover:bg-teal-600 aqf-btn-press" disabled={propose.isPending}
          onClick={() => propose.mutate({ orderId: trade.id })}>
          Propose margin for human review
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate("/admin/communications")}>
          Open approval channel
        </Button>
      </div>
    </div>
  );
}

/* ------------------------- Protected entities ------------------------- */

const ROLE_LABELS: Record<string, string> = {
  CONTRACTING_SELLER: "Contracting seller",
  MAINLAND_ENTITY: "Mainland trading entity",
  EXPORT_OF_RECORD: "Exporter of record",
  CONTACT: "Contact person",
  BANK: "Bank account",
  OTHER: "Other",
};

function EntitiesCard({ trade }: { trade: TradeRow }) {
  const utils = trpc.useUtils();
  const entities = trpc.docgate.listEntities.useQuery({ orderId: trade.id });
  const [name, setName] = useState("");
  const [role, setRole] = useState<keyof typeof ROLE_LABELS>("CONTRACTING_SELLER");
  const [aliases, setAliases] = useState("");
  const add = trpc.docgate.addEntity.useMutation({
    onSuccess: () => { toast.success("Protected entity added, firewall now screens for it"); setName(""); setAliases(""); utils.docgate.listEntities.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.docgate.removeEntity.useMutation({
    onSuccess: () => { utils.docgate.listEntities.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="aqf-card-3d p-5">
      <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" /> Protected-entity set
      </p>
      <p className="mb-4 text-[11px] text-muted-foreground">
        The supplier is a <em>set</em>, every name, alias (incl. non-Latin scripts), phone, address and bank account is screened on every document and outgoing message.
      </p>
      <ul className="space-y-2">
        {(entities.data ?? []).map((e) => (
          <li key={e.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{e.entityName}</p>
              <p className="text-[11px] text-muted-foreground">
                {ROLE_LABELS[e.role] ?? e.role}
                {(e.aliases as string[] | null)?.length ? ` · aliases: ${(e.aliases as string[]).join(", ")}` : ""}
              </p>
            </div>
            <Button size="sm" variant="ghost" className="h-7 w-7 shrink-0 p-0 text-danger" aria-label={`Remove ${e.entityName}`}
              onClick={() => remove.mutate({ id: e.id })} disabled={remove.isPending}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
        {entities.data?.length === 0 && (
          <li className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            No protected entities yet, the firewall has nothing to screen against.
          </li>
        )}
      </ul>
      <div className="mt-4 grid gap-2 border-t border-border pt-4">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input className="h-8 text-xs" placeholder="Entity name (any script)" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={role} onValueChange={(v) => setRole(v as keyof typeof ROLE_LABELS)}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Input className="h-8 text-xs" placeholder="Aliases, comma-separated (e.g. Chinese name, trading name)" value={aliases} onChange={(e) => setAliases(e.target.value)} />
        <Button size="sm" variant="outline" className="justify-self-start" disabled={name.trim().length < 2 || add.isPending}
          onClick={() => add.mutate({ orderId: trade.id, entityName: name.trim(), role: role as "CONTRACTING_SELLER" | "MAINLAND_ENTITY" | "EXPORT_OF_RECORD" | "CONTACT" | "BANK" | "OTHER", aliases: aliases.split(",").map((a) => a.trim()).filter(Boolean) })}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add to protected set
        </Button>
      </div>
    </div>
  );
}

/* ------------------------- Freight bidding (masked) ------------------------- */

const BID_STYLES: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  WON: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  LOST: "bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-400",
  WITHDRAWN: "bg-slate-100 text-slate-400 dark:bg-slate-500/15 dark:text-slate-500",
};

function FreightCard({ trade }: { trade: TradeRow }) {
  const utils = trpc.useUtils();
  const bids = trpc.trade.freightBids.useQuery({ orderId: trade.id });
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("");
  const add = trpc.trade.addFreightBid.useMutation({
    onSuccess: (r) => { toast.success(`Bid logged as ${r.alias}, identity masked`); setPrice(""); setDays(""); utils.trade.freightBids.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const award = trpc.trade.awardFreightBid.useMutation({
    onSuccess: () => { toast.success("Freight awarded, other open bids closed"); utils.trade.freightBids.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="aqf-card-3d p-5">
      <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Ship className="h-3.5 w-3.5" /> Freight-forwarder bidding
      </p>
      <p className="mb-4 text-[11px] text-muted-foreground">
        Forwarders bid blind, identities stay masked behind aliases end-to-end, so no freight partner can ever triangulate buyer or supplier.
      </p>
      <ul className="space-y-2">
        {(bids.data ?? []).map((b) => (
          <li key={b.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium">
                <Truck className="h-3.5 w-3.5 text-muted-foreground" /> {b.forwarderAlias}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${BID_STYLES[b.status]}`}>{b.status}</span>
              </p>
              <p className="mt-0.5 font-data text-[11px] text-muted-foreground">
                {money(b.currency, b.pricePerContainer)} / container{b.transitDays ? ` · ${b.transitDays} days transit` : ""}
              </p>
            </div>
            {b.status === "OPEN" && (
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={award.isPending}
                onClick={() => award.mutate({ bidId: b.id })}>
                <Gavel className="mr-1 h-3 w-3" /> Award
              </Button>
            )}
          </li>
        ))}
        {bids.data?.length === 0 && (
          <li className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">No bids yet.</li>
        )}
      </ul>
      <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4">
        <div>
          <Label className="text-[11px] text-muted-foreground">Price / container ({trade.tradeCurrency ?? "USD"})</Label>
          <Input className="mt-1 h-8 w-36 text-xs" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Transit days</Label>
          <Input className="mt-1 h-8 w-24 text-xs" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
        <Button size="sm" variant="outline" disabled={!price || add.isPending}
          onClick={() => add.mutate({ orderId: trade.id, pricePerContainer: Number(price), transitDays: days ? Number(days) : undefined, currency: trade.tradeCurrency ?? "USD" })}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Log masked bid
        </Button>
      </div>
    </div>
  );
}

/* ------------------------- Agent actions + consistency ------------------------- */

function AgentActionsCard({ trade }: { trade: TradeRow }) {
  const utils = trpc.useUtils();
  const [flags, setFlags] = useState<{ field: string; message: string; values: { docName: string; value: string }[] }[] | null>(null);
  const recap = trpc.agent.draftRecap.useMutation({
    onSuccess: () => { toast.success("Recap drafted, awaiting human approval in the Communication Hub"); utils.agent.queue.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const contract = trpc.agent.draftContract.useMutation({
    onSuccess: () => { toast.success("Contract summary drafted, awaiting human sign-off"); utils.agent.queue.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const consistency = trpc.docgate.runConsistencyCheck.useMutation({
    onSuccess: (r) => {
      setFlags(r.flags as typeof flags);
      if (r.flags.length === 0) toast.success(`Consistency check clean across ${r.documentsChecked} document(s)`);
      else toast.warning(`${r.flags.length} cross-document mismatch flag(s) raised`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="aqf-card-3d p-5">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <FileText className="h-3.5 w-3.5" /> Agent drafts & consistency
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={recap.isPending} onClick={() => recap.mutate({ orderId: trade.id })}>
          Draft trade recap (Stage 5)
        </Button>
        <Button size="sm" variant="outline" disabled={contract.isPending} onClick={() => contract.mutate({ orderId: trade.id })}>
          Draft contract summary (Stage 7)
        </Button>
        <Button size="sm" variant="outline" disabled={consistency.isPending} onClick={() => consistency.mutate({ orderId: trade.id })}>
          <FileCheck2 className="mr-1 h-3.5 w-3.5" /> Run cross-document check
        </Button>
      </div>
      {flags && flags.length > 0 && (
        <ul className="mt-4 space-y-2">
          {flags.map((f, i) => (
            <li key={i} className="rounded-lg border border-red-300 bg-red-50/60 p-3 text-xs dark:border-red-500/30 dark:bg-red-500/5">
              <p className="font-semibold text-red-700 dark:text-red-300">{f.field}: {f.message}</p>
              <ul className="mt-1 space-y-0.5 font-data text-[11px] text-muted-foreground">
                {f.values.map((v, j) => <li key={j}>{v.docName}: <span className="font-semibold text-foreground">{v.value}</span></li>)}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {flags && flags.length === 0 && (
        <p className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50/60 p-3 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:text-emerald-300">
          All numeric fields agree across documents, price, quantity, weight, contract refs and specs.
        </p>
      )}
    </div>
  );
}

/* ------------------------- Detail shell ------------------------- */

function TradeDetail({ orderId }: { orderId: number }) {
  const trades = useTrades();
  const utils = trpc.useUtils();
  const navigate = useNavigate();
  const [advStage, setAdvStage] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [marginPct, setMarginPct] = useState<string | null>(null);

  const advance = trpc.trade.advanceStage.useMutation({
    onSuccess: (r) => { toast.success(`Advanced to stage ${r.stage}/14, ${TRADE_STAGES[r.stage - 1]}`); setAdvStage(null); setNote(""); utils.trade.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const setDeal = trpc.trade.setDealType.useMutation({
    onSuccess: () => { utils.trade.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const setProfile = trpc.trade.setBuyerMarginProfile.useMutation({
    onSuccess: () => { toast.success("Buyer margin profile updated"); setMarginPct(null); utils.trade.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const trade = (trades.data ?? []).find((t) => t.id === orderId);
  useEffect(() => { setMarginPct(null); }, [orderId]);
  if (trades.isLoading) return <div className="py-16 text-center text-sm text-muted-foreground">Loading trade…</div>;
  if (!trade) return <div className="py-16 text-center text-sm text-muted-foreground">Trade not found.</div>;

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground" onClick={() => navigate("/admin/trades")}>
        <ArrowLeft className="mr-1 h-4 w-4" /> All trades
      </Button>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="font-data">{trade.tradeRef ?? trade.orderNumber}</span>
            <DealChip dealType={trade.dealType} />
          </span>
        }
        description={`${trade.request?.product ?? "Trade"} · ${trade.buyerOrg?.name ?? trade.buyerName} · ${trade.request?.destination ?? ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={trade.dealType} onValueChange={(v) => setDeal.mutate({ orderId: trade.id, dealType: v as "AQ_ZERO" })}>
              <SelectTrigger className="h-9 w-52" aria-label="Deal type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AQ_ZERO">AQ Zero, £0 margin (member)</SelectItem>
                <SelectItem value="TRADITIONAL">Traditional, margin trade</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <Input
                className="h-9 w-28 text-xs" inputMode="decimal" aria-label="Buyer margin profile %"
                placeholder="Margin %"
                value={marginPct ?? String(trade.buyerOrg?.marginProfilePct ?? 0)}
                onChange={(e) => setMarginPct(e.target.value)}
              />
              <Button size="sm" variant="outline" className="h-9"
                disabled={!trade.buyerOrg || setProfile.isPending}
                onClick={() => trade.buyerOrg && setProfile.mutate({ organizationId: trade.buyerOrg.id, marginProfilePct: Number(marginPct ?? 0) })}>
                Set buyer profile
              </Button>
            </div>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <StageStepper trade={trade} advancing={advance.isPending} onAdvance={(s) => setAdvStage(s)} />
          <BuffersCard trade={trade} />
        </div>
        <div className="space-y-5">
          <CommercialsCard trade={trade} />
          <EntitiesCard trade={trade} />
          <FreightCard trade={trade} />
          <AgentActionsCard trade={trade} />
        </div>
      </div>

      {/* Advance-stage confirm */}
      <Dialog open={advStage != null} onOpenChange={(o) => !o && setAdvStage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Advance to stage {advStage}/14, {advStage ? TRADE_STAGES[advStage - 1] : ""}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This is a human action on the trade record. Gates (firm offer, recap, contract, margin) still require approval in the AI Communication Hub.
          </p>
          <Textarea className="mt-2 min-h-16 text-sm" placeholder="Optional note for the audit log…" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button className="mt-3 w-full bg-teal-500 hover:bg-teal-600" disabled={advance.isPending}
            onClick={() => advStage && advance.mutate({ orderId: trade.id, stage: advStage, note: note || undefined })}>
            <ArrowLeftRight className="mr-1.5 h-4 w-4" /> Advance stage
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminTrades() {
  const { id } = useParams();
  return id ? <TradeDetail orderId={Number(id)} /> : <TradeList />;
}
