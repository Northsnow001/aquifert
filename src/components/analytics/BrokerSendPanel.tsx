/**
 * 1.5 — "Send to an approved broker" from a completed calculation.
 * Consent is explicit and PER-SEND: the user sees precisely which fields go
 * to which broker and confirms. Aquifert takes no commission position.
 */
import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";

export type CalcSummary = {
  product: string;
  origin: string;
  quantityMt?: number;
  oceanFreight: number;
  currency: string;
  cfr: number;
  landed: number;
  onFarm: number;
};

export function BrokerSendPanel({ calc, onClose }: { calc: CalcSummary; onClose?: () => void }) {
  const matching = trpc.broker.matching.useQuery({ regions: [calc.origin], vesselClasses: [] }, { retry: 0 });
  const send = trpc.broker.send.useMutation({
    onSuccess: () => { toast.success("Introduction sent — the broker replies by email."); onClose?.(); },
    onError: (e) => toast.error(e.message),
  });
  const [brokerId, setBrokerId] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  if (matching.error) return null; // capability locked: the control never renders
  const brokers = matching.data?.brokers ?? [];
  const broker = brokers.find((b) => b.id === brokerId);

  const fields: Record<string, string | number> = {
    product: calc.product,
    origin: calc.origin,
    oceanFreight: calc.oceanFreight,
    currency: calc.currency,
    cfrPerTonne: calc.cfr,
    landedPerTonne: calc.landed,
    onFarmPerTonne: calc.onFarm,
  };
  const sharedKeys = Object.keys(fields);

  return (
    <Card className="border-teal-500/40">
      <CardContent className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">Send to an approved broker</h2>
        <p className="text-xs text-muted-foreground">{matching.data?.notice}</p>

        <div className="space-y-2">
          {brokers.map((b) => (
            <label key={b.id} className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm">
              <Checkbox checked={brokerId === b.id} onCheckedChange={() => { setBrokerId(b.id); setConfirmed(false); }} aria-label={`Choose ${b.name}`} />
              <span>
                <span className="font-medium">{b.name}</span>
                <span className="block text-xs text-muted-foreground">{b.specialisms.join(", ")} · {b.regions.join(", ")}{b.contactName ? ` · ${b.contactName}` : ""}</span>
              </span>
            </label>
          ))}
          {matching.isLoading && <div className="h-16 animate-pulse rounded-md bg-muted/40" aria-label="Loading brokers" />}
          {brokers.length === 0 && !matching.isLoading && (
            <p className="text-sm text-muted-foreground">No approved brokers match this origin right now. The desk can place you manually: enquiry@aquifert.com.</p>
          )}
        </div>

        {broker && (
          <div className="space-y-3 rounded-md bg-muted/50 p-4" aria-live="polite">
            <p className="text-sm font-medium">Exactly what {broker.name} receives:</p>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {Object.entries(fields).map(([k, v]) => (
                <li key={k} className="tabular-nums">{k}: <span className="text-muted-foreground">{v}</span></li>
              ))}
              <li>your name and email</li>
            </ul>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} aria-label="Confirm share" />
              <span>I confirm these fields go to {broker.name} now. I understand this is an introduction, brokers are separate data controllers, and Aquifert takes no commission.</span>
            </label>
            <Button
              disabled={!confirmed || send.isPending}
              onClick={() => send.mutate({ brokerId: broker.id, fields, consentFields: sharedKeys, consentConfirmed: true })}
            >
              <Send className="mr-1.5 h-4 w-4" /> Send introduction
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
