/**
 * Nitrogen Assessment synthesis, deterministic desk-logic simulation,
 * structured so a real LLM client can be swapped in without touching callers.
 * Input: the four-section questionnaire answers. Output: Markdown report.
 */

export type NitrogenAnswers = {
  // a) Logistics & Delivery
  destinationCountry: string;
  destinationPort: string;
  preferredOrigin: string;
  deliveryWindow: string;
  packaging: string;
  // b) Products & Volumes
  nitrogenSources: string[];
  annualVolume: string;
  warehouseCapacity: string;
  // c) Agronomic Profile
  cropType: string;
  areaHectares: string;
  soilTexture: string;
  applicationMethod: string;
  // d) Strategic Goals
  priority: string; // COST | BALANCED | EFFICIENCY
  additives: string[];
  siteNotes: string;
};

const N_RATE: Record<string, [number, number]> = {
  "Winter wheat": [170, 220],
  "Winter barley": [130, 170],
  "Oilseed rape": [180, 220],
  Maize: [150, 200],
  "Sugar beet": [100, 140],
  Potatoes: [160, 220],
  "Grassland (grazed)": [120, 200],
  "Grassland (silage)": [200, 280],
  Other: [120, 180],
};

const SOIL_ADJ: Record<string, { delta: number; note: string }> = {
  Sandy: { delta: 10, note: "sandy, free-draining soils raise leaching risk, split applications and consider a nitrification inhibitor" },
  "Sandy loam": { delta: 5, note: "sandy loam drains freely, favour split applications to protect uptake efficiency" },
  Loam: { delta: 0, note: "loam soils give the most predictable nitrogen response, standard programmes apply" },
  "Clay loam": { delta: -5, note: "heavier clay loam holds ammonium well, slightly lower rates with good timing usually suffice" },
  Clay: { delta: -5, note: "clay soils buffer nitrogen effectively, watch waterlogging rather than leaching" },
  Peaty: { delta: -15, note: "organic peaty soils mineralise significant N, reduce applied rates accordingly" },
};

const METHOD_NOTE: Record<string, string> = {
  "Broadcast (granular)": "Broadcast granular application suits urea and AN/CAN; apply ahead of rain or irrigation to move N into the root zone.",
  "Liquid injection": "Liquid injection pairs with UAN solutions; ensure even boom or injector spacing to avoid striping.",
  Fertigation: "Fertigation supports little-and-often dosing; soluble sources (urea solution, AN solution) fit best.",
  "Foliar feed": "Foliar feeding is a supplement, not a base programme, plan soil-applied N as the backbone.",
  "Precision placement": "Precision placement cuts rates materially; variable-rate maps should drive the purchase split.",
};

function parseVolume(v: string): number {
  const m = v.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : 0;
}

export function generateNitrogenReport(a: NitrogenAnswers, refNo: string): string {
  const area = parseVolume(a.areaHectares);
  const [lo, hi] = N_RATE[a.cropType] ?? N_RATE["Other"];
  const soil = SOIL_ADJ[a.soilTexture] ?? SOIL_ADJ["Loam"];
  const adjLo = Math.max(40, lo + soil.delta);
  const adjHi = Math.max(60, hi + soil.delta);
  const totalLo = area ? Math.round((area * adjLo) / 100) / 10 : null;
  const totalHi = area ? Math.round((area * adjHi) / 100) / 10 : null;
  const annualVol = parseVolume(a.annualVolume);
  const sources = a.nitrogenSources.length ? a.nitrogenSources : ["Urea"];

  const priorityLine =
    a.priority === "COST"
      ? "Your stated priority is **cost**. The programme below leans on urea as the backbone (lowest cost per unit of N), buys in the seasonal shoulder, and accepts slightly wider application windows."
      : a.priority === "EFFICIENCY"
        ? "Your stated priority is **efficiency**. The programme below favours inhibited and ammonium-nitrate-based sources, tighter split timing, and placement accuracy over headline price."
        : "Your stated priority is **balanced cost and efficiency**. The programme below blends a urea backbone with inhibited or nitrate-based top-ups where response is most reliable.";

  const inhibitorNote = a.additives.length
    ? `You selected ${a.additives.join(" and ")}. ${a.additives.includes("Nitrification inhibitor") ? "A nitrification inhibitor is well matched to your soil notes, it holds ammonium in the root zone through wet periods." : ""} ${a.additives.includes("Urease inhibitor") ? "A urease inhibitor is strongly advised where urea is surface-applied without incorporation, cutting volatilisation losses." : ""}`.trim()
    : "No additives selected. If any urea is surface-applied without incorporation, the desk would flag a urease inhibitor as the single cheapest efficiency gain available.";

  const shipments = Math.max(1, Math.min(6, Math.round(annualVol / Math.max(25, parseVolume(a.warehouseCapacity) || 50)) || 1));

  return [
    `# Nitrogen Assessment, ${a.destinationCountry || "Destination"}`,
    ``,
    `**Reference:** ${refNo}`,
    ``,
    `**Prepared by:** Aquifert Trading Desk`,
    ``,
    `**Date:** ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    ``,
    `---`,
    ``,
    `## 1. Agronomic Nitrogen Allocation`,
    ``,
    `| Parameter | Value |`,
    `|---|---|`,
    `| Crop | ${a.cropType || "N/A"} |`,
    `| Area | ${a.areaHectares || "N/A"} ha |`,
    `| Soil texture | ${a.soilTexture || "N/A"} |`,
    `| Application method | ${a.applicationMethod || "N/A"} |`,
    `| Indicative N rate | ${adjLo}–${adjHi} kg N/ha |`,
    totalLo != null ? `| Total seasonal N requirement | ${totalLo}–${totalHi} t N |` : `| Total seasonal N requirement | Not computed, area not supplied |`,
    ``,
    `The indicative band for **${a.cropType || "your crop"}** is adjusted for your soils: ${soil.note}. ${METHOD_NOTE[a.applicationMethod] ?? ""}`,
    ``,
    `## 2. Sourcing & Delivery Schedule`,
    ``,
    `| Parameter | Value |`,
    `|---|---|`,
    `| Preferred sources | ${sources.join(", ")} |`,
    `| Annual volume | ${a.annualVolume || "N/A"} |`,
    `| Destination | ${[a.destinationCountry, a.destinationPort].filter(Boolean).join(", ") || "N/A"} |`,
    `| Preferred origin | ${a.preferredOrigin || "Open"} |`,
    `| Delivery window | ${a.deliveryWindow || "N/A"} |`,
    `| Packaging | ${a.packaging || "N/A"} |`,
    `| Warehouse capacity | ${a.warehouseCapacity || "N/A"} |`,
    ``,
    `Given the stated warehouse capacity, the desk would structure this as **${shipments} shipment${shipments > 1 ? "s" : ""}** spread across the delivery window, protecting you against single-vessel delay and smoothing working capital. ${a.preferredOrigin ? `Origin preference (${a.preferredOrigin}) is noted; the desk will quote it alongside at least one alternative origin so you can see the freight-adjusted spread.` : "No origin preference was stated, so the desk will quote the two or three most competitive origins on a freight-adjusted basis."}`,
    ``,
    `## 3. Cost / Efficiency Recommendations`,
    ``,
    priorityLine,
    ``,
    inhibitorNote,
    ``,
    a.siteNotes ? `**Site notes recorded:** ${a.siteNotes}` : "",
    ``,
    `---`,
    ``,
    `*This assessment is indicative, generated from your questionnaire answers and desk reference data. It is not an offer or agronomic advice; final programmes should be confirmed with a FACTS-qualified agronomist. Pricing, when requested, is supplier cost plus pass-through freight and a stated fee, full document trail.*`,
  ].filter((l) => l !== "").join("\n");
}
