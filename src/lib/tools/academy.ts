function round5(value: number) {
  return Math.round(value / 5) * 5;
}

const UREA_RAW = [
  { label: "Saudi Arabia", feedstock: 40, variable: 0, fixed: 0, fob: 0 },
  { label: "Turkmenistan", feedstock: 15, variable: 20, fixed: 15, fob: 30 },
  { label: "Iran", feedstock: 20, variable: 20, fixed: 20, fob: 30 },
  { label: "Qatar", feedstock: 25, variable: 20, fixed: 20, fob: 20 },
  { label: "Russia", feedstock: 65, variable: 20, fixed: 15, fob: 20 },
  { label: "Algeria", feedstock: 70, variable: 20, fixed: 15, fob: 25 },
  { label: "Bahrain", feedstock: 70, variable: 20, fixed: 15, fob: 25 },
  { label: "UAE", feedstock: 75, variable: 20, fixed: 15, fob: 20 },
  { label: "Nigeria", feedstock: 40, variable: 20, fixed: 15, fob: 25 },
  { label: "Egypt", feedstock: 70, variable: 30, fixed: 25, fob: 15 },
  { label: "Oman", feedstock: 75, variable: 20, fixed: 15, fob: 25 },
  { label: "Trinidad", feedstock: 65, variable: 20, fixed: 15, fob: 20 },
  { label: "Canada", feedstock: 35, variable: 25, fixed: 15, fob: 25 },
  { label: "USA", feedstock: 35, variable: 25, fixed: 15, fob: 25 },
  { label: "China (low)", feedstock: 95, variable: 25, fixed: 20, fob: 20 },
  { label: "Indonesia", feedstock: 155, variable: 20, fixed: 15, fob: 20 },
  { label: "Malaysia", feedstock: 110, variable: 20, fixed: 15, fob: 20 },
  { label: "Ukraine", feedstock: 105, variable: 20, fixed: 15, fob: 15 },
  { label: "Libya", feedstock: 110, variable: 20, fixed: 15, fob: 20 },
  { label: "Belarus", feedstock: 110, variable: 20, fixed: 15, fob: 15 },
  { label: "Qatar(hi)", feedstock: 120, variable: 20, fixed: 15, fob: 20 },
  { label: "Bolivia", feedstock: 75, variable: 20, fixed: 15, fob: 30 },
  { label: "Azerbaijan", feedstock: 80, variable: 20, fixed: 15, fob: 25 },
  { label: "China (coal)", feedstock: 75, variable: 80, fixed: 45, fob: 30 },
];

export type UreaBar = {
  label: string;
  feedstock: number;
  variable: number;
  fixed: number;
  fob: number;
  total: number;
};

export function ureaCurve(): UreaBar[] {
  return UREA_RAW.map((row) => {
    const feedstock = round5(row.feedstock);
    const variable = round5(row.variable);
    const fixed = round5(row.fixed);
    const fob = round5(row.fob);
    return {
      label: row.label,
      feedstock,
      variable,
      fixed,
      fob,
      total: round5(feedstock + variable + fixed + fob),
    };
  }).sort((left, right) => left.total - right.total);
}

export const PHOSPHATE_CURVE = [
  { label: "Morocco", cap: 46, mine: 10, ben: 10 },
  { label: "Egypt", cap: 5.2, mine: 15, ben: 15 },
  { label: "N. Korea", cap: 0.1, mine: 15, ben: 20 },
  { label: "Tanzania", cap: 0.1, mine: 15, ben: 20 },
  { label: "Uzbekistan", cap: 0.8, mine: 15, ben: 25 },
  { label: "China", cap: 84.2, mine: 20, ben: 25 },
  { label: "Nauru", cap: 0.5, mine: 20, ben: 10 },
  { label: "Australia", cap: 3.2, mine: 20, ben: 25 },
  { label: "Saudi", cap: 9.5, mine: 20, ben: 30 },
  { label: "Mexico", cap: 2.1, mine: 25, ben: 30 },
  { label: "India", cap: 2.5, mine: 25, ben: 35 },
  { label: "USA", cap: 29.7, mine: 25, ben: 35 },
  { label: "Vietnam", cap: 4.5, mine: 30, ben: 40 },
  { label: "Israel", cap: 4.8, mine: 30, ben: 45 },
  { label: "Turkey", cap: 0.5, mine: 35, ben: 45 },
  { label: "Senegal", cap: 4.2, mine: 35, ben: 45 },
  { label: "Togo", cap: 3.5, mine: 35, ben: 50 },
  { label: "Russia", cap: 14.4, mine: 30, ben: 55 },
  { label: "Jordan", cap: 11.7, mine: 35, ben: 50 },
  { label: "Finland", cap: 1.2, mine: 40, ben: 55 },
  { label: "Algeria", cap: 1.5, mine: 40, ben: 55 },
  { label: "Tunisia", cap: 7.7, mine: 40, ben: 60 },
  { label: "Venezuela", cap: 0.4, mine: 45, ben: 65 },
  { label: "Peru", cap: 3.9, mine: 50, ben: 75 },
  { label: "Brazil", cap: 7.2, mine: 50, ben: 80 },
  { label: "S. Africa", cap: 2.7, mine: 55, ben: 90 },
];

export const HOW_IT_IS_MADE = [
  {
    name: "Ammonia (NH3)",
    color: "#1a4a6e",
    steps: [
      "Natural gas extracted (feedstock)",
      "Steam methane reforming to produce H₂",
      "H₂ + N₂ from air via Haber-Bosch process",
      "Stored cryogenically at -33°C",
      "Transported in pressurised vessels",
    ],
    note: "32-38 MMBtu gas per tonne. Building block for all N fertilizers.",
  },
  {
    name: "Urea (46% N)",
    color: "#6baa8e",
    steps: [
      "NH3 produced via Haber-Bosch",
      "NH3 + CO₂ under pressure → ammonium carbamate",
      "Dehydration produces urea melt",
      "Prilled or granulated in tower",
      "Shipped in bulk — most traded N fertilizer",
    ],
    note: "0.58t NH3 + 0.76t CO₂ per tonne. CO₂ is a byproduct of reforming.",
  },
  {
    name: "Nitric Acid (HNO₃)",
    color: "#d97706",
    steps: [
      "NH3 vapourised and mixed with air",
      "Catalytic oxidation (Ostwald process)",
      "NH3 → NO → NO₂ → HNO₃",
      "Concentrated to 100% or used at 50-68%",
      "Used to make AN, UAN, CAN",
    ],
    note: "0.29t NH3 per tonne 100% HNO₃. Key intermediate for AN production.",
  },
  {
    name: "Ammonium Nitrate (AN 34%)",
    color: "#b45309",
    steps: [
      "NH3 + HNO₃ → ammonium nitrate solution",
      "Neutralisation reaction (exothermic)",
      "Evaporation and concentration",
      "Prilling or granulation",
      "Sold as 34% N granules (CAN/AN)",
    ],
    note: "0.436t NH3 + 0.78t HNO₃ per tonne. High N, fast-acting.",
  },
  {
    name: "UAN (32% N)",
    color: "#559278",
    steps: [
      "Urea dissolved in water",
      "Ammonium nitrate solution produced separately",
      "Two solutions blended to give 32% N liquid",
      "Stored in tanks — no solid handling",
      "Applied by sprayer or injector",
    ],
    note: "Liquid fertilizer. Requires specialist tankers, not dry bulk carriers.",
  },
  {
    name: "Ammonium Sulphate",
    color: "#6baa8e",
    steps: [
      "NH₃ reacted with sulphuric acid",
      "Or captured as byproduct from coke ovens",
      "Crystallisation of ammonium sulphate",
      "Dried and screened",
      "21% N + 24% S — sulphur-rich fertilizer",
    ],
    note: "0.26t NH3 + 0.75t H₂SO₄ per tonne. Often a byproduct so cheap vs cost-of-production.",
  },
  {
    name: "Sulphuric Acid (H₂SO₄)",
    color: "#2d6060",
    steps: [
      "Elemental sulphur melted and burned",
      "Combustion: S + O₂ → SO₂",
      "Catalytic conversion: SO₂ → SO₃",
      "Absorption in water → H₂SO₄",
      "Used in phos acid, Amsul, TSP, SSP",
    ],
    note: "0.33t sulphur per tonne H₂SO₄. Critical intermediate for all phosphate products.",
  },
  {
    name: "Phosphoric Acid (H₃PO₄)",
    color: "#1d7a5c",
    steps: [
      "Phosphate rock mined and beneficiated",
      "Rock + sulphuric acid (wet process)",
      "Reaction produces H₃PO₄ + gypsum (CaSO₄)",
      "Filtration to remove gypsum",
      "Concentrated and purified for DAP/MAP use",
    ],
    note: "3.6t rock (63% BPL) + 2.8t H₂SO₄ per tonne 100% P₂O₅.",
  },
  {
    name: "SSP (20% P₂O₅)",
    color: "#4d7a0f",
    steps: [
      "Phosphate rock ground and dried",
      "Rock + sulphuric acid (lower ratio)",
      "Produces calcium superphosphate + CaSO₄",
      "Mix stored to cure (den process)",
      "Contains 20% P₂O₅ + 11% S — dual nutrient",
    ],
    note: "0.71t rock + 0.21t sulphur per tonne. Cheapest P fertilizer.",
  },
  {
    name: "TSP (46% P₂O₅)",
    color: "#559913",
    steps: [
      "Phosphate rock dried and ground",
      "Rock reacted with phosphoric acid (not H₂SO₄)",
      "Higher P concentration than SSP",
      "Granulated and cooled",
      "Contains only P — no sulphur or nitrogen",
    ],
    note: "1.44t rock + 0.47t sulphur equivalent per tonne.",
  },
  {
    name: "MAP (11-52-0)",
    color: "#6baa8e",
    steps: [
      "Phosphoric acid produced from rock + H₂SO₄",
      "Phos acid reacted with ammonia (excess acid)",
      "Lower NH₃:acid ratio than DAP",
      "Granulation and drying",
      "11% N + 52% P₂O₅ — high P, lower N",
    ],
    note: "0.145t NH₃ + 1.91t rock + 0.475t sulphur per tonne.",
  },
  {
    name: "DAP (18-46-0)",
    color: "#1a3a5c",
    steps: [
      "Phosphoric acid produced from rock",
      "Phos acid reacted with excess ammonia",
      "Higher NH₃:acid ratio than MAP",
      "Granulation, cooling, screening",
      "18% N + 46% P₂O₅ — most traded P product",
    ],
    note: "0.219t NH₃ + 1.72t rock + 0.427t sulphur per tonne.",
  },
];

export const GLOSSARY = [
  ["FOB — Free On Board", "Price at the loading port. Seller delivers goods onto the ship. Buyer pays all freight and insurance onwards."],
  ["CFR — Cost and Freight", "Price includes cost plus freight to destination port. Buyer handles insurance and discharge costs."],
  ["CIF — Cost, Insurance & Freight", "Like CFR but seller also pays insurance to the destination port."],
  ["MOP — Muriate of Potash", "Potassium chloride (KCl), ~60% K₂O. The world's most traded potash product."],
  ["SOP — Sulphate of Potash", "Potassium sulphate (K₂SO₄), ~50% K₂O + 18% S. Premium for chloride-sensitive crops."],
  ["DAP — Di-Ammonium Phosphate", "18-46-0 fertilizer. World's most traded phosphate. Key suppliers: Morocco (OCP), China, Saudi Arabia."],
  ["MAP — Mono-Ammonium Phosphate", "11-52-0 fertilizer. Higher P₂O₅ than DAP. Russia is the leading global exporter."],
  ["TSP — Triple Superphosphate", "0-46-0 fertilizer. High P concentration. Made from rock + phosphoric acid."],
  ["SSP — Single Superphosphate", "0-20-0 + 11% S. Cheapest phosphate fertilizer. Contains sulphur."],
  ["Urea (46% N)", "World's most traded nitrogen fertilizer. Key exporters: Russia, China, Middle East, Egypt, Indonesia."],
  ["UAN — Urea Ammonium Nitrate", "32% or 28% N liquid. Blend of urea and AN solutions. Applied by sprayer or injector."],
  ["AN — Ammonium Nitrate", "34% N solid fertilizer. Fast-acting. Also used in explosives industry."],
  ["CAN — Calcium Ammonium Nitrate", "26-28% N. AN blended with calcium carbonate. Safer to handle."],
  ["Amsul — Ammonium Sulphate", "21% N + 24% S. Often a byproduct. Good sulphur source."],
  ["NH₃ — Ammonia", "Building block for all N fertilizers. Made from gas via Haber-Bosch. Traded at -33°C in cryogenic vessels."],
  ["BPL — Bone Phosphate of Lime", "Measure of phosphate rock quality. 63% BPL = ~29% P₂O₅."],
  ["MMBtu", "Million British Thermal Units — standard unit for natural gas pricing. ~28 cubic metres of gas."],
  ["Phosphoric Acid (H₃PO₄)", "Made from rock + H₂SO₄ (wet process). Intermediate for DAP, MAP, TSP."],
  ["H₂SO₄ — Sulphuric Acid", "Made by burning elemental sulphur. Essential for all phosphate fertilizer production."],
  ["TTF — Title Transfer Facility", "Dutch gas trading hub. The benchmark price for European fertilizer producers."],
  ["Henry Hub", "US natural gas benchmark (Louisiana). Typically cheaper than TTF."],
  ["Granular vs Prilled", "Two forms of solid fertilizer. Granules are harder and more uniform."],
] as const;
