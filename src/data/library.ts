import type { Collection, CurveDirection, HedgeCommodity, HedgeReport, LibraryDocument } from "@/lib/content-types";

export const collections: Collection[] = [
  { id: "col-aquibot", name: "AquiBot", slug: "aquibot", parentId: null, description: "AquiBot", private: false },
  {
    id: "col-data",
    name: "Data",
    slug: "data",
    parentId: null,
    description: "Downloadable import / export data – charge fee to download",
    private: false,
  },
  { id: "col-misc", name: "Miscellaneous", slug: "miscellaneous", parentId: null, description: "", private: false },
  { id: "col-premium", name: "Premium", slug: "premium", parentId: null, description: "", private: false },
  { id: "col-repository", name: "Repository", slug: "reports", parentId: null, description: "", private: false },
  { id: "col-top-secret", name: "TOP SECRET P&C", slug: "top-secret-pc", parentId: null, description: "TOP SECRET P&C", private: false },
  { id: "col-training", name: "Training", slug: "training", parentId: null, description: "", private: false },
  { id: "col-weekly", name: "Weekly Market Reports", slug: "weekly-reports", parentId: null, description: "", private: false },
];

type SeedDocument = Omit<LibraryDocument, "access" | "private" | "author" | "storedName">;

const seedDocuments: SeedDocument[] = [
  {
    id: "w38-brazil",
    title: "Brazil fertiliser intelligence, week 38",
    filename: "AQ_Brazil_Fertiliser_Intelligence_W38_2026",
    collectionIds: ["col-repository"],
    type: "PDF",
    size: "2.7 MB",
    updated: "17 Sep 2026",
    summary:
      "Desk note on Brazil enquiry returning for October laycan, Arab Gulf urea offers, and freight ideas on the AG–Brazil supramax.",
  },
  {
    id: "cme-paper",
    title: "CME versus paper forward curve",
    filename: "AQ_ONE_Hub CME vs Paper forward curve",
    collectionIds: ["col-repository"],
    type: "PDF",
    size: "24 KB",
    updated: "17 Sep 2026",
    summary:
      "Side-by-side of the CME print and the desk paper curve for urea and MAP, with the points where paper is leading physical.",
  },
  {
    id: "w37-view",
    title: "Week 37 AQ View",
    filename: "Week 37 2026 AQ View",
    collectionIds: ["col-weekly"],
    type: "PDF",
    size: "628 KB",
    updated: "16 Sep 2026",
    summary:
      "Weekly market report covering nitrogen, phosphate and potash, plus the freight corridors the desk is watching into October.",
  },
  {
    id: "w36-view",
    title: "Week 36 AQ View",
    filename: "Week 36 2026 AQ View",
    collectionIds: ["col-weekly"],
    type: "PDF",
    size: "541 KB",
    updated: "9 Sep 2026",
    summary: "Prior weekly report. India stepped back as the headline destination and Bangladesh took the enquiry count.",
  },
];

export const libraryDocuments: LibraryDocument[] = seedDocuments.map((file) => ({
  ...file,
  access: "public",
  private: false,
  author: "Phil Sunderland",
  storedName: null,
}));

type SeedRow = [period: string, bid: string, ask: string, dir?: CurveDirection];

function commodity(id: string, label: string, index: string, rows: SeedRow[]): HedgeCommodity {
  return {
    id,
    label,
    index,
    rows: rows.map(([period, bid, ask, dir = "flat"], i) => ({ id: `${id}-${i}`, period, bid, ask, dir })),
  };
}

export const hedgeReports: HedgeReport[] = [
  {
    id: "hedge-2026-07-19",
    title: "Daily Hedge Update – 2026-07-19",
    date: "2026-07-19",
    status: "published",
    updatedAt: "2026-07-19T07:00",
    narrative: [
      "The paper market is not giving anything away this week. The forward curve on urea is flat across all tenors and benchmarks: no contango, no backwardation, no direction.",
      "In a week where physical Egypt has moved over USD 100 per tonne, paper sitting on its hands is itself a signal. The shorts that needed to cover have covered. What comes next requires real demand to show up, and real demand is on holiday.",
      "Brazil CFR August at USD 465/475 is the most instructive benchmark. Paper is pricing August CFR materially above the current physical index, which tells you the market expects Brazil to pay up when it comes back.",
      "MAP CFR Brazil is running USD 820–870 through August and September against a physical index of USD 890. With sulphur at USD 1,000 FOB and phosphoric acid at USD 1,700 per tonne P2O5 CFR India, the cost floor makes that softening structurally difficult to deliver.",
    ].join("\n\n"),
    sections: [
      {
        id: "sec-phosphate",
        label: "Phosphate",
        commodities: [
          commodity("map-cfr-brazil", "MAP CFR Brazil", "Index 890", [
            ["Aug", "820", "870"],
            ["Sept", "820", "870"],
            ["Oct", "800", "850"],
          ]),
          commodity("dap-fob-nola", "DAP FOB NOLA", "", [
            ["Aug", "760", "775"],
            ["Sept", "760", "775"],
          ]),
        ],
      },
      {
        id: "sec-intl-urea",
        label: "International Urea & Amsul",
        commodities: [
          commodity("urea-fob-ag", "Urea FOB AG", "Index 405", [
            ["Aug", "420", "440"],
            ["Sept", "420", "440"],
            ["Oct", "410", "440"],
          ]),
          commodity("fob-egypt", "FOB Egypt", "Index 508.50", [
            ["Aug", "500", "530"],
            ["Sept", "500", "530"],
          ]),
          commodity("fob-nigeria", "FOB Nigeria", "Index 432.50", [
            ["Aug", "440", "460"],
            ["Sept", "440", "460"],
            ["Oct", "430", "470"],
          ]),
          commodity("fob-nola", "FOB NOLA", "Index 383", [
            ["Aug", "420", "430"],
            ["Sept", "420", "430"],
          ]),
          commodity("amsul-cfr-brazil", "Amsul CFR Brazil", "Index 210", [
            ["Aug", "220", "250"],
            ["Sept", "220", "245"],
            ["Oct", "220", "240"],
          ]),
        ],
      },
    ],
  },
  {
    id: "hedge-2026-07-12",
    title: "Daily Hedge Update – 2026-07-12",
    date: "2026-07-12",
    status: "published",
    updatedAt: "2026-07-12T07:00",
    narrative: [
      "Paper was still doing the work physical would not. Urea forwards were a shade firmer on the front, led by short covering rather than fresh demand.",
      "Egypt FOB August was bid 490 and offered 520. Brazil CFR August sat at 455/468, only a small premium to the physical index. MAP CFR Brazil was unchanged on the week at 830/880.",
    ].join("\n\n"),
    sections: [
      {
        id: "sec-phosphate-12",
        label: "Phosphate",
        commodities: [commodity("map-cfr-brazil-12", "MAP CFR Brazil", "", [["Aug", "830", "880"]])],
      },
      {
        id: "sec-intl-urea-12",
        label: "International Urea & Amsul",
        commodities: [
          commodity("fob-egypt-12", "FOB Egypt", "", [["Aug", "490", "520", "up"]]),
          commodity("brazil-cfr-12", "Brazil CFR Urea", "", [["Aug", "455", "468", "up"]]),
        ],
      },
    ],
  },
];
