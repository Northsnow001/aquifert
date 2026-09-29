import { Suspense } from "react";
import { FreightCalculator } from "@/components/calculators/freight-calculator";

export default function FreightPage() {
  return (
    <Suspense fallback={<p className="text-sm text-mid">Loading calculator…</p>}>
      <FreightCalculator />
    </Suspense>
  );
}
