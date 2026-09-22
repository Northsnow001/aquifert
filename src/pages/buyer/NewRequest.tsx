import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, PackageSearch } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useProfile } from "@/hooks/useProfile";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PRODUCTS, PRODUCT_META, type Product } from "@contracts/constants";
import { fmtDate, tons } from "@/lib/format";
import { format } from "date-fns";
import { toast } from "sonner";

const UK_CITIES = [
  "Felixstowe, UK", "Liverpool, UK", "Southampton, UK", "Immingham, UK",
  "Belfast, UK", "Teesport, UK", "London Gateway, UK", "Bristol, UK",
];

const PRODUCT_ICONS: Record<Product, string> = {
  UREA: "🌾", DAP: "🟤", MOP: "🔴", MAP: "🟠", NPK: "🟢",
};

export default function BuyerNewRequest() {
  const navigate = useNavigate();
  const { isMember } = useProfile();
  const [step, setStep] = useState(1);
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
  const [destination, setDestination] = useState("");
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>();
  const [incoterms, setIncoterms] = useState<"DDP" | "FOB" | "CIF">("CIF");
  const [instructions, setInstructions] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const create = trpc.requests.create.useMutation({
    onSuccess: (r) => {
      setSubmitted(r.requestNumber);
      toast.success(`Request ${r.requestNumber} submitted`);
    },
    onError: (e) => toast.error(e.message),
  });

  const filteredCities = UK_CITIES.filter((c) => c.toLowerCase().includes(destination.toLowerCase()));
  const step2Valid = Number(quantity) > 0 && destination.length >= 2;

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="aqf-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Request submitted</h1>
        <p className="mt-2 text-muted-foreground">
          Request <span className="font-data font-semibold text-foreground">{submitted}</span> is with our
          sourcing team. You'll be notified the moment a quote is ready, usually within 24 hours.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Button variant="outline" onClick={() => navigate("/buyer")}>Dashboard</Button>
          <Button className="bg-teal-500 hover:bg-teal-600" onClick={() => navigate("/buyer/quotes")}>
            Track quotes <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New Sourcing Request" description="Three steps, product, quantity & destination, review." />

      {/* Stepper */}
      <div className="mb-7 flex items-center gap-2">
        {["Product", "Quantity & destination", "Review"].map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              step > i + 1 ? "bg-teal-500 text-white" : step === i + 1 ? "bg-navy-600 text-white" : "bg-muted text-muted-foreground"
            }`}>
              {step > i + 1 ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={`hidden text-xs font-medium sm:block ${step === i + 1 ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
            {i < 2 && <div className={`h-0.5 flex-1 rounded ${step > i + 1 ? "bg-teal-500" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {PRODUCTS.map((p) => (
              <button
                key={p}
                onClick={() => setProduct(p)}
                className={`aqf-card-hover aqf-btn-press rounded-xl border-2 p-4 text-left transition-colors ${
                  product === p ? "border-teal-500 bg-teal-50/60 dark:bg-teal-500/10" : "border-border bg-card hover:border-teal-500/40"
                }`}
                aria-label={`Select ${PRODUCT_META[p].label}`}
              >
                <span className="text-2xl">{PRODUCT_ICONS[p]}</span>
                <p className="mt-2 font-bold">{PRODUCT_META[p].label}</p>
                <p className="font-data text-xs text-teal-600">{PRODUCT_META[p].formula}</p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{PRODUCT_META[p].desc}</p>
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <Button disabled={!product} className="bg-navy-600 hover:bg-navy-700" onClick={() => setStep(2)}>
              Continue <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="qty">Quantity</Label>
                <div className="relative">
                  <Input
                    id="qty"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="100"
                    className="pr-14"
                  />
                  <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">tons</span>
                </div>
              </div>
              <div className="relative">
                <Label htmlFor="dest">Destination</Label>
                <Input
                  id="dest"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Felixstowe, UK"
                />
                {destination.length > 0 && filteredCities.length > 0 && !UK_CITIES.includes(destination) && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                    {filteredCities.map((c) => (
                      <button
                        key={c}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => setDestination(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Delivery date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal" aria-label="Pick delivery date">
                      {deliveryDate ? format(deliveryDate, "dd MMM yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} disabled={(d) => d < new Date()} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Incoterms</Label>
                <Select value={incoterms} onValueChange={(v) => setIncoterms(v as typeof incoterms)}>
                  <SelectTrigger aria-label="Incoterms"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DDP">DDP, Delivered duty paid</SelectItem>
                    <SelectItem value="CIF">CIF, Cost, insurance, freight</SelectItem>
                    <SelectItem value="FOB">FOB, Free on board</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="instr">Special instructions (optional)</Label>
              <Textarea
                id="instr"
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Granular grade, palletised delivery, spreader-compatible bags…"
              />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
              <Button disabled={!step2Valid} className="bg-navy-600 hover:bg-navy-700" onClick={() => setStep(3)}>
                Review request <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && product && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <PackageSearch className="h-5 w-5 text-teal-600" />
              <p className="font-bold">Review your request</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Product", `${PRODUCT_META[product].label} (${PRODUCT_META[product].formula})`],
                ["Quantity", tons(Number(quantity))],
                ["Destination", destination],
                ["Delivery date", fmtDate(deliveryDate)],
                ["Incoterms", incoterms],
                ["Instructions", instructions || "None"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted/60 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{k}</p>
                  <p className="mt-0.5 text-sm font-medium">{v}</p>
                </div>
              ))}
            </div>
            <div className={`mt-4 rounded-xl border p-3.5 text-sm ${isMember ? "border-teal-500/40 bg-teal-50/60 dark:bg-teal-500/10" : "border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10"}`}>
              {isMember ? (
                <p><strong>Cost-to-cost pricing applied</strong>, your quote will show the full landed-cost breakdown with zero margin.</p>
              ) : (
                <p><strong>Standard pricing</strong>, your quote will include AQUIFERT's margin. <a href="/buyer/membership" className="font-semibold text-teal-600 underline">Membership removes it.</a></p>
              )}
            </div>
            <div className="mt-5 flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
              <Button
                className="bg-teal-500 hover:bg-teal-600 aqf-btn-press"
                disabled={create.isPending}
                onClick={() =>
                  create.mutate({
                    product,
                    quantity: Number(quantity),
                    destination,
                    deliveryDate,
                    incoterms,
                    specialInstructions: instructions || undefined,
                  })
                }
              >
                Submit request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
