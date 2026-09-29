import { Suspense } from "react";
import { NetbackCalculator } from "@/components/calculators/netback-calculator";

export default function NetbackPage() {
  return (
    <Suspense fallback={<p className="text-sm text-mid">Loading calculator…</p>}>
      <NetbackCalculator />
    </Suspense>
  );
}
