import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/shared/PageHeader";
import { InfoTip } from "@/components/aq1/InfoTip";
import { useAq1Tips } from "@/components/aq1/tips";
import { toast } from "sonner";

type CalcResult = {
  id: number; impliedFob: number | null; warnings: string[]; assumption: string;
  ladder: { fob: number; cfr: number; landed: number; duty: number; bagged: number; finance: number; onFarm: number };
  ranking: { rank: number; origin: string; fob: number; onFarm: number; asOf: string }[];
};

function quotaMessage(raw: string): string | null {
  try {
    const p = JSON.parse(raw);
    if (p.reason === "QUOTA") return `You've used all ${p.limit} calculations for this calendar month. Your allowance resets on ${p.resetsOn}. Upgrade to AQ0 for a higher allowance.`;
  } catch { /* not quota */ }
  return null;
}

const money = (n: number, c: string) => `${n.toFixed(2)} ${c}`;

/** Urea Cost Calculator — netback, both directions, origin ranking. */
export default function Aq1UreaCalc() {
  const tips = useAq1Tips();
  const usage = trpc.aq1.usage.useQuery();
  const origins = trpc.aq1.ureaOrigins.useQuery();
  const [direction, setDirection] = useState<"FOB_TO_FARM" | "FARM_TO_FOB">("FOB_TO_FARM");
  const [form, setForm] = useState<"granular" | "prilled">("granular");
  const [origin, setOrigin] = useState("");
  const [fobPrice, setFobPrice] = useState("");
  const [farmGatePrice, setFarmGatePrice] = useState("");
  const [oceanFreight, setOceanFreight] = useState("");
  const [discharge, setDischarge] = useState("");
  const [bagging, setBagging] = useState("0");
  const [dutyPct, setDutyPct] = useState("0");
  const [financePct, setFinancePct] = useState("0");
  const [currency, setCurrency] = useState<"USD" | "GBP" | "EUR">("USD");
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<CalcResult | null>(null);

  const calc = trpc.aq1.ureaCalc.useMutation({
    onSuccess: (r) => { (window as unknown as { __aqBusy?: boolean }).__aqBusy = false; usage.refetch(); setResult(r as CalcResult); toast.success("Calculation complete — saved to your account"); },
    onError: (e) => {
      (window as unknown as { __aqBusy?: boolean }).__aqBusy = false;
      const qm = quotaMessage(e.message);
      if (qm) toast.info(qm); else toast.error(e.message);
    },
  });

  const remaining = usage.data ? usage.data.ureaCalcs.limit - usage.data.ureaCalcs.used : null;
  const chosen = origins.data?.find((o) => o.origin === origin);
  const effectiveFob = fobPrice ? Number(fobPrice) : chosen?.fob;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
      <PageHeader
        title={<span className="inline-flex items-center">Urea Cost Calculator <InfoTip label="Urea Cost Calculator" text={tips.ureaCalc} /></span>}
        description={usage.data ? `${remaining} of ${usage.data.ureaCalcs.limit} calculations remaining this month (resets ${usage.data.resetsOn}).` : undefined}
      />
      {usage.data && remaining !== null && remaining > 0 && usage.data.ureaCalcs.used / usage.data.ureaCalcs.limit >= 0.8 && (
        <p role="status" className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">You have {remaining} calculation{remaining === 1 ? "" : "s"} left this month.</p>
      )}

      <Card><CardContent className="grid gap-4 p-5 md:grid-cols-2">
        <div>
          <Label htmlFor="direction">Direction</Label>
          <Select value={direction} onValueChange={(v) => setDirection(v as typeof direction)}>
            <SelectTrigger id="direction" className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="FOB_TO_FARM">FOB → delivered on-farm cost</SelectItem>
              <SelectItem value="FARM_TO_FOB">On-farm price → implied FOB (netback)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="form">Urea form</Label>
          <Select value={form} onValueChange={(v) => setForm(v as typeof form)}>
            <SelectTrigger id="form" className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="granular">Granular</SelectItem>
              <SelectItem value="prilled">Prilled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="origin">Origin</Label>
          <Select value={origin} onValueChange={setOrigin}>
            <SelectTrigger id="origin" className="mt-1"><SelectValue placeholder="Select origin" /></SelectTrigger>
            <SelectContent>
              {(origins.data ?? []).map((o) => (
                <SelectItem key={o.origin} value={o.origin}>{o.origin} — latest FOB {o.fob} {o.currency}/t (as of {new Date(o.asOf).toLocaleDateString("en-GB")})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {direction === "FOB_TO_FARM" ? (
          <div>
            <Label htmlFor="fobPrice">FOB price (optional — defaults to the latest assessment)</Label>
            <Input id="fobPrice" type="number" inputMode="decimal" className="mt-1 tabular-nums" value={fobPrice} onChange={(e) => setFobPrice(e.target.value)} placeholder={chosen ? String(chosen.fob) : ""} />
          </div>
        ) : (
          <div>
            <Label htmlFor="farmGatePrice">On-farm price (per tonne)</Label>
            <Input id="farmGatePrice" type="number" inputMode="decimal" className="mt-1 tabular-nums" value={farmGatePrice} onChange={(e) => setFarmGatePrice(e.target.value)} required />
          </div>
        )}
        {([
          ["oceanFreight", "Ocean freight (per tonne)", oceanFreight, setOceanFreight],
          ["discharge", "Discharge & port costs (per tonne)", discharge, setDischarge],
          ["bagging", "Bagging (per tonne, 0 if bulk)", bagging, setBagging],
          ["dutyPct", "Import duty (%)", dutyPct, setDutyPct],
          ["financePct", "Finance cost (%)", financePct, setFinancePct],
        ] as const).map(([id, label, val, set]) => (
          <div key={id}>
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} type="number" inputMode="decimal" min={0} className="mt-1 tabular-nums" value={val} onChange={(e) => set(e.target.value)} required />
          </div>
        ))}
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select value={currency} onValueChange={(v) => { setCurrency(v as typeof currency); setConfirmed(false); }}>
            <SelectTrigger id="currency" className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem><SelectItem value="GBP">GBP</SelectItem><SelectItem value="EUR">EUR</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 md:col-span-2">
          <Checkbox id="cc" checked={confirmed} onCheckedChange={(v) => setConfirmed(Boolean(v))} />
          <Label htmlFor="cc" className="font-normal">I confirm all figures above are in {currency}.</Label>
        </div>
        <div className="md:col-span-2">
          <Button
            disabled={calc.isPending || !origin || !confirmed || !oceanFreight || !discharge || (direction === "FARM_TO_FOB" ? !farmGatePrice : !(effectiveFob != null)) || remaining === 0}
            onClick={() => {
              (window as unknown as { __aqBusy?: boolean }).__aqBusy = true;
              calc.mutate({
                direction, form, origin, currency, currencyConfirmed: true,
                fobPrice: direction === "FOB_TO_FARM" && fobPrice ? Number(fobPrice) : undefined,
                farmGatePrice: direction === "FARM_TO_FOB" ? Number(farmGatePrice) : undefined,
                oceanFreight: Number(oceanFreight), discharge: Number(discharge),
                bagging: Number(bagging || 0), dutyPct: Number(dutyPct || 0), financePct: Number(financePct || 0),
              });
            }}>
            {calc.isPending ? "Calculating…" : "Calculate"}
          </Button>
        </div>
      </CardContent></Card>

      {result && (
        <div aria-live="polite" className="space-y-4">
          {result.warnings.map((w, i) => (
            <p key={i} role="alert" className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{w}</p>
          ))}
          <Card><CardContent className="p-5">
            <h2 className="text-lg font-semibold" tabIndex={-1} ref={(el) => el?.focus()}>
              {result.impliedFob != null ? `Implied FOB: ${money(result.impliedFob, currency)}/t` : `Delivered on-farm cost: ${money(result.ladder.onFarm, currency)}/t`}
            </h2>
            <table className="mt-3 w-full text-sm">
              <caption className="text-left text-xs text-muted-foreground">Full cost ladder, per tonne</caption>
              <tbody className="tabular-nums">
                {([
                  ["FOB", result.ladder.fob], ["+ Ocean freight → CFR", result.ladder.cfr],
                  ["+ Discharge → landed", result.ladder.landed], [`+ Duty (${dutyPct || 0}%)`, result.ladder.duty],
                  ["+ Bagging", result.ladder.bagged], [`+ Finance (${financePct || 0}%)`, result.ladder.finance],
                  ["= On-farm", result.ladder.onFarm],
                ] as const).map(([label, v], i, arr) => (
                  <tr key={label} className={i === arr.length - 1 ? "border-t border-border font-semibold" : ""}>
                    <td className="py-1.5">{label}</td><td className="py-1.5 text-right">{money(v, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <h2 className="text-lg font-semibold">Origin ranking</h2>
            <p className="mt-1 text-xs text-muted-foreground">{result.assumption}</p>
            <table className="mt-3 w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1">Rank</th><th>Origin</th><th className="text-right">FOB</th><th className="text-right">On-farm</th></tr></thead>
              <tbody className="tabular-nums">
                {result.ranking.map((r) => (
                  <tr key={r.origin} className={r.origin === origin ? "font-semibold" : ""}>
                    <td className="py-1.5">{r.rank}</td><td>{r.origin}</td>
                    <td className="text-right">{money(r.fob, currency)}</td><td className="text-right">{money(r.onFarm, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent></Card>
        </div>
      )}
    </div>
  );
}
