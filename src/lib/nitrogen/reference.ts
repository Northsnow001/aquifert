/** The desk's market views and guidance that every Nitrogen brief is written from. Admins edit them in the report template. */

export type PulseSignal = "Firm" | "Soft" | "Balanced" | "Watch";

export type MarketView = { view: string; signal: PulseSignal };
export type ProductReference = MarketView & { note: string };

export type DeskReference = {
  products: Record<string, ProductReference>;
  freight: Record<string, MarketView>;
  shipping: Record<string, string>;
  packing: Record<string, string>;
};

export const DEFAULT_REFERENCE: DeskReference = {
  products: {
    Urea: {
      view: "The deepest and most liquid nitrogen market. Origin competition is wide and prompt availability is adequate. Brazilian and European programmes set the tone into the next quarter.",
      signal: "Firm",
      note: "Urea (46% N) is the reference nitrogen market, with the widest origin competition and typically the lowest cost per unit of N.",
    },
    "Ammonium Nitrate": {
      view: "European supply is orderly and demand is seasonal. Regulatory handling limits keep trade regional rather than global.",
      signal: "Balanced",
      note: "Ammonium nitrate (33.5-34.5% N) offers fast, reliable uptake. Storage and transport regulation is tighter in several jurisdictions.",
    },
    CAN: {
      view: "Stable European grade with steady seasonal interest. Availability is comfortable across northern ports.",
      signal: "Balanced",
      note: "CAN (27% N) is a stable calcium ammonium nitrate grade popular across Europe, easier to store and handle than straight AN.",
    },
    "UAN solution": {
      view: "Freight weight per unit of N keeps UAN a regional trade. Rouen and Hamburg sets are quoted flat to slightly easier.",
      signal: "Soft",
      note: "UAN suits liquid application systems and blending. Freight is weight-heavy per unit of N, so regional sourcing matters.",
    },
    "Ammonium Sulphate": {
      view: "Chinese auction clears and Brazilian granular demand underpin the complex. Export allocation is the near-term swing factor.",
      signal: "Firm",
      note: "Ammonium sulphate (21% N plus 24% S) adds a sulphur credit and is competitive where sulphur deficiency is a factor.",
    },
    "Inhibited urea": {
      view: "A premium efficiency grade following the underlying urea complex. Margins over standard urea are steady.",
      signal: "Firm",
      note: "Inhibited urea adds a urease or nitrification inhibitor to standard urea, protecting efficiency where incorporation is delayed.",
    },
  },
  freight: {
    Bulk: { view: "Dry bulk rates are range-bound; prompt handysize and supramax tonnage is available on the main nitrogen routes.", signal: "Balanced" },
    "Break Bulk": { view: "Geared tonnage is available on most nitrogen routes; stevedoring capacity at discharge is the constraint to watch.", signal: "Balanced" },
    Container: { view: "Container indices remain elevated on main east-west lanes; booking lead times of three to four weeks are prudent.", signal: "Watch" },
  },
  shipping: {
    Bulk: "Bulk vessel shipment is the lowest-cost mode per tonne and suits single-product parcels of 3,000 t and up. It requires berth access, grab or conveyor discharge and covered bulk storage at destination. Demurrage risk is managed with clear laytime terms and an agreed discharge rate.",
    "Break Bulk":
      "Break bulk shipment carries bagged or big-bag cargo in a geared vessel's holds. It suits multi-product consignments and ports without bulk handling. It adds stevedoring cost and weather-sensitive discharge, so arrival windows should carry buffer days.",
    Container:
      "Containerised shipment gives the most flexible routing, the widest port coverage and the simplest onward distribution in smaller lots, at the highest per-tonne freight. It suits parcels under roughly 500 t and buyers with limited storage.",
  },
  packing: {
    "Big Bags": "Big bags (500-1,000 kg) suit forklift handling and direct transfer to spreaders or blending lines. They keep port and store handling simple at moderate volumes.",
    "50kg": "Fifty-kilogram bags suit manual handling and merchant distribution. Palletised and shrink-wrapped presentation protects the product through onward retail channels.",
    "25kg": "Twenty-five-kilogram bags suit specialty and retail channels. Unit handling cost is highest, so packing at origin should be confirmed against the resale format.",
    "In bulk":
      "Unpacked cargo is the lowest-cost presentation per tonne. It needs grab or conveyor discharge and covered bulk storage, and any bagging is done at destination against local demand.",
  },
};
