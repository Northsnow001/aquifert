/**
 * Nitrogen assessment: turns the four-section questionnaire into a Markdown report.
 * Deterministic desk rules, so the same answers always give the same report.
 */

export type NitrogenPriority = "COST" | "BALANCED" | "EFFICIENCY";

export type NitrogenAnswers = {
  destinationCountry: string;
  destinationPort: string;
  preferredOrigin: string;
  /** Months as YYYY-MM, picked from the next twelve. */
  preferredMonths: string[];
  /** Reports saved before preferred months asked for a single delivery window instead. */
  deliveryWindow?: string;
  packaging: string;
  nitrogenSources: string[];
  annualVolume: string;
  warehouseCapacity: string;
  cropType: string;
  areaHectares: string;
  soilTexture: string;
  applicationMethod: string;
  priority: NitrogenPriority;
  additives: string[];
  siteNotes: string;
};

export const PACKAGING = ["Bulk", "Big bags (500–1,000 kg)", "50 kg bags", "25 kg bags"];
export const SOURCES = ["Urea", "Ammonium Nitrate", "CAN", "UAN solution", "Ammonium Sulphate", "Inhibited urea"];
const ORDER_PRODUCT: Record<string, string> = {
  Urea: "Urea - Granular",
  "Inhibited urea": "Urea - Granular",
  "Ammonium Nitrate": "AN",
  CAN: "CAN",
  "UAN solution": "UAN",
  "Ammonium Sulphate": "Amsul",
};

/** Order Desk link with the report's product and destination filled in. */
export function orderDeskHref(a: Pick<NitrogenAnswers, "nitrogenSources" | "destinationPort" | "destinationCountry">) {
  const params = new URLSearchParams();
  const product = ORDER_PRODUCT[a.nitrogenSources?.[0] ?? ""];
  const destination = [a.destinationPort, a.destinationCountry].map((part) => part?.trim()).filter(Boolean).join(", ");
  if (product) params.set("product", product);
  if (destination) params.set("destination", destination);
  const query = params.toString();
  return query ? `/hub/order-desk?${query}` : "/hub/order-desk";
}

export const CROPS = ["Winter wheat", "Winter barley", "Oilseed rape", "Maize", "Sugar beet", "Potatoes", "Grassland (grazed)", "Grassland (silage)", "Other"];
export const SOILS = ["Sandy", "Sandy loam", "Loam", "Clay loam", "Clay", "Peaty"];
export const METHODS = ["Broadcast (granular)", "Liquid injection", "Fertigation", "Foliar feed", "Precision placement"];

/** The current month and the eleven after it, as YYYY-MM in UTC so server and browser agree. */
export function upcomingMonths(from = new Date(), count = 12): string[] {
  return Array.from({ length: count }, (_, n) => {
    const month = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + n, 1));
    return `${month.getUTCFullYear()}-${String(month.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function monthLabel(value: string, style: "short" | "long" = "short") {
  const [year, month] = value.split("-").map(Number);
  const name = MONTH_NAMES[month - 1];
  if (!year || !name) return value;
  return `${style === "short" ? name.slice(0, 3) : name} ${year}`;
}

/** Preferred months for display, falling back to the delivery window older reports stored. */
export function deliveryText(a: Pick<NitrogenAnswers, "preferredMonths" | "deliveryWindow">, style: "short" | "long" = "short") {
  return a.preferredMonths?.length ? a.preferredMonths.map((month) => monthLabel(month, style)).join(", ") : (a.deliveryWindow ?? "");
}
export const ADDITIVES = ["Urease inhibitor", "Nitrification inhibitor", "Sulphur blend", "None"];
export const PRIORITIES: { value: NitrogenPriority; label: string; hint: string }[] = [
  { value: "COST", label: "Lowest cost", hint: "Urea backbone, shoulder-season buying" },
  { value: "BALANCED", label: "Balanced", hint: "Urea base with efficient top-ups" },
  { value: "EFFICIENCY", label: "Maximum efficiency", hint: "Inhibited and nitrate sources, tight timing" },
];

export const EMPTY_ANSWERS: NitrogenAnswers = {
  destinationCountry: "",
  destinationPort: "",
  preferredOrigin: "",
  preferredMonths: [],
  packaging: "",
  nitrogenSources: [],
  annualVolume: "",
  warehouseCapacity: "",
  cropType: "",
  areaHectares: "",
  soilTexture: "",
  applicationMethod: "",
  priority: "BALANCED",
  additives: [],
  siteNotes: "",
};

/** Indicative kg N/ha bands per crop, before the soil adjustment. */
export const N_RATE: Record<string, [number, number]> = {
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
  Sandy: { delta: 10, note: "sandy, free-draining soils raise leaching risk, so split applications and consider a nitrification inhibitor" },
  "Sandy loam": { delta: 5, note: "sandy loam drains freely, so favour split applications to protect uptake efficiency" },
  Loam: { delta: 0, note: "loam soils give the most predictable nitrogen response, so standard programmes apply" },
  "Clay loam": { delta: -5, note: "heavier clay loam holds ammonium well, so slightly lower rates with good timing usually suffice" },
  Clay: { delta: -5, note: "clay soils buffer nitrogen effectively, so watch waterlogging rather than leaching" },
  Peaty: { delta: -15, note: "organic peaty soils mineralise significant nitrogen, so reduce applied rates accordingly" },
};

const METHOD_NOTE: Record<string, string> = {
  "Broadcast (granular)": "Broadcast granular application suits urea and AN/CAN; apply ahead of rain or irrigation to move nitrogen into the root zone.",
  "Liquid injection": "Liquid injection pairs with UAN solutions; keep boom or injector spacing even to avoid striping.",
  Fertigation: "Fertigation supports little-and-often dosing; soluble sources such as urea or AN solution fit best.",
  "Foliar feed": "Foliar feeding is a supplement, not a base programme, so plan soil-applied nitrogen as the backbone.",
  "Precision placement": "Precision placement cuts rates materially; let variable-rate maps drive the purchase split.",
};

export function parseNumber(value: string): number {
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

/** The kg N/ha band after the soil adjustment, shown live while members fill the form. */
export function rateBand(crop: string, soil: string): [number, number] | null {
  if (!crop) return null;
  const [lo, hi] = N_RATE[crop] ?? N_RATE.Other;
  const delta = SOIL_ADJ[soil]?.delta ?? 0;
  return [Math.max(40, lo + delta), Math.max(60, hi + delta)];
}

/** Returns the first problem with a step, or null when it can move on. */
export function stepProblem(step: number, a: NitrogenAnswers): string | null {
  if (step === 0) {
    if (!a.destinationCountry.trim()) return "Add the destination country.";
    if (!a.preferredMonths.length) return "Choose at least one preferred month.";
    if (!a.packaging) return "Choose the shipment packing.";
  }
  if (step === 1) {
    if (!a.nitrogenSources.length) return "Pick at least one nitrogen source.";
    if (!(parseNumber(a.annualVolume) > 0)) return "Add your annual volume in tonnes.";
  }
  if (step === 2) {
    if (!a.cropType) return "Choose the crop.";
    if (!(parseNumber(a.areaHectares) > 0)) return "Add the area in hectares.";
    if (!a.soilTexture) return "Choose the soil texture.";
    if (!a.applicationMethod) return "Choose how you apply.";
  }
  return null;
}

export const firstName = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] ?? "";

/** Markdown table rows must sit on consecutive lines, so each table is one block. */
const table = (rows: [string, string][]) => ["| Parameter | Value |", "|---|---|", ...rows.map(([name, value]) => `| ${name} | ${value.replace(/\|/g, "/")} |`)].join("\n");

export function generateNitrogenReport(a: NitrogenAnswers, { preparedFor = "", date = new Date() }: { preparedFor?: string; date?: Date } = {}): string {
  const area = parseNumber(a.areaHectares);
  const soil = SOIL_ADJ[a.soilTexture] ?? SOIL_ADJ.Loam;
  const [adjLo, adjHi] = rateBand(a.cropType || "Other", a.soilTexture) ?? [120, 180];
  const totalLo = area ? Math.round((area * adjLo) / 100) / 10 : null;
  const totalHi = area ? Math.round((area * adjHi) / 100) / 10 : null;
  const annualVol = parseNumber(a.annualVolume);
  const sources = a.nitrogenSources.length ? a.nitrogenSources : ["Urea"];
  const additives = a.additives.filter((item) => item !== "None");

  const priorityLine =
    a.priority === "COST"
      ? "Your stated priority is **cost**. The programme leans on urea as the backbone, the lowest cost per unit of nitrogen, buys in the seasonal shoulder and accepts slightly wider application windows."
      : a.priority === "EFFICIENCY"
        ? "Your stated priority is **efficiency**. The programme favours inhibited and ammonium-nitrate-based sources, tighter split timing and placement accuracy over headline price."
        : "Your stated priority is **balanced cost and efficiency**. The programme blends a urea backbone with inhibited or nitrate-based top-ups where response is most reliable.";

  const inhibitorNote = additives.length
    ? [
        `You selected ${additives.join(" and ")}.`,
        additives.includes("Nitrification inhibitor") ? "A nitrification inhibitor holds ammonium in the root zone through wet periods." : "",
        additives.includes("Urease inhibitor") ? "A urease inhibitor is strongly advised wherever urea is surface-applied without incorporation, cutting volatilisation losses." : "",
      ]
        .filter(Boolean)
        .join(" ")
    : "No additives selected. If any urea is surface-applied without incorporation, the desk would flag a urease inhibitor as the cheapest efficiency gain available.";

  const capacity = parseNumber(a.warehouseCapacity) || 50;
  const shipments = Math.max(1, Math.min(6, Math.round(annualVol / Math.max(25, capacity)) || 1));

  const months = deliveryText(a, "long");
  const title = [a.destinationCountry || "Destination", a.destinationPort, sources.join(", ")].filter(Boolean).join(" / ");

  return [
    `# Nitrogen Assessment: ${title}`,
    preparedFor.trim() ? `**Prepared for:** ${preparedFor.trim()}` : "",
    `**Date:** ${date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    `---`,
    `## 1. Agronomic nitrogen allocation`,
    table([
      ["Crop", a.cropType || "Not given"],
      ["Area", a.areaHectares ? `${a.areaHectares} ha` : "Not given"],
      ["Soil texture", a.soilTexture || "Not given"],
      ["Application method", a.applicationMethod || "Not given"],
      ["Indicative N rate", `${adjLo}–${adjHi} kg N/ha`],
      ["Total seasonal N requirement", totalLo != null ? `${totalLo}–${totalHi} t N` : "Not computed, area not given"],
    ]),
    `The indicative band for **${a.cropType || "your crop"}** is adjusted for your soils: ${soil.note}. ${METHOD_NOTE[a.applicationMethod] ?? ""}`.trim(),
    `## 2. Sourcing and delivery schedule`,
    table([
      ["Preferred sources", sources.join(", ")],
      ["Annual volume", a.annualVolume ? `${a.annualVolume} t` : "Not given"],
      ["Destination", [a.destinationPort, a.destinationCountry].filter(Boolean).join(", ") || "Not given"],
      ["Preferred origin", a.preferredOrigin || "Open"],
      [a.preferredMonths?.length ? "Preferred months" : "Delivery window", months || "Not given"],
      ["Shipment packing", a.packaging || "Not given"],
      ["Warehouse capacity", a.warehouseCapacity ? `${a.warehouseCapacity} t` : "Not given"],
    ]),
    `Given the stated warehouse capacity, the desk would structure this as **${shipments} shipment${shipments > 1 ? "s" : ""}** across ${a.preferredMonths?.length ? "your preferred months" : "the delivery window"}, protecting you against a single delayed vessel and smoothing working capital. ${
      a.preferredOrigin
        ? `Your origin preference (${a.preferredOrigin}) is noted; the desk quotes it alongside at least one alternative so you can see the freight-adjusted spread.`
        : "No origin preference was given, so the desk quotes the two or three most competitive origins on a freight-adjusted basis."
    }`,
    `## 3. Cost and efficiency recommendations`,
    priorityLine,
    inhibitorNote,
    a.siteNotes.trim() ? `**Site notes recorded:** ${a.siteNotes.trim()}` : "",
    `---`,
    `*This assessment is indicative, generated from your answers and desk reference data. It is not an offer or agronomic advice; confirm final programmes with a qualified agronomist.*`,
  ]
    .filter((line) => line !== "")
    .join("\n\n");
}
