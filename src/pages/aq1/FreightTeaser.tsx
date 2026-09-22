import { Link } from "react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { InfoTip } from "@/components/aq1/InfoTip";
import { useAq1Tips } from "@/components/aq1/tips";

/** Freight Analytics — locked teaser for AQ Analytics. No real analytics data
 *  is requested or rendered; the samples below are static illustrative shapes,
 *  blurred and unreadable by design. */
export default function Aq1FreightTeaser() {
  const tips = useAq1Tips();
  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
      <PageHeader
        title={<span className="inline-flex items-center">Freight Analytics <Lock className="ml-2 h-4 w-4 text-muted-foreground" aria-label="Locked" /> <InfoTip label="Freight Analytics" text={tips.freightAnalytics} /></span>}
        description="AQ Analytics — low cost, high ROI, and an unbiased view."
      />
      <Card><CardContent className="p-5">
        <h2 className="text-lg font-semibold">What AQ Analytics covers</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Trade flows by corridor — who is moving what, where, and how much</li>
          <li>Freight rate benchmarks across the major fertilizer lanes</li>
          <li>Lane history and seasonality, so timing stops being guesswork</li>
          <li>Corridor anomaly alerts when a lane moves out of pattern</li>
        </ul>
      </CardContent></Card>

      <div className="grid gap-4 md:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="h-24 select-none blur-md">
                <svg viewBox="0 0 200 80" className="h-full w-full">
                  <polyline points={`0,${60 - i * 10} 40,${40 + i * 8} 80,${50 - i * 6} 120,${30 + i * 10} 160,${35} 200,${20 + i * 12}`} fill="none" stroke="#31648F" strokeWidth="3" />
                  <rect x="10" y="55" width="24" height="20" fill="#6E9A8E" /><rect x="60" y="45" width="24" height="30" fill="#254F76" /><rect x="110" y="58" width="24" height="17" fill="#6E9A8E" /><rect x="160" y="38" width="24" height="37" fill="#254F76" />
                </svg>
              </div>
              <div className="mt-2 space-y-1 blur-sm">
                <div className="h-3 w-3/4 rounded bg-muted" /><div className="h-3 w-1/2 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Sample visuals are intentionally obscured; AQ Analytics subscribers see the live data.</p>

      <div className="flex flex-wrap gap-3">
        <Button asChild><Link to="/account/order-now">Set up AQ Analytics</Link></Button>
        <Button asChild variant="outline"><Link to="/account/contact">Talk to the desk</Link></Button>
      </div>
    </div>
  );
}
