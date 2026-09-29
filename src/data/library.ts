export type LibraryDocument = {
  id: string;
  title: string;
  filename: string;
  collection: string;
  type: string;
  size: string;
  updated: string;
  summary: string;
};

export type CurveDirection = "up" | "down" | "flat";

export type CurveRow = {
  period: string;
  market: string;
  bid: string;
  ask: string;
  dir: CurveDirection;
};

export type HedgeBrief = {
  id: string;
  date: string;
  title: string;
  paragraphs: string[];
  rows: CurveRow[];
};

export const libraryCollections = ["All collections", "Repository", "Weekly Market Reports"] as const;

export const libraryDocuments: LibraryDocument[] = [
  {
    id: "w38-brazil",
    title: "Brazil fertiliser intelligence, week 38",
    filename: "AQ_Brazil_Fertiliser_Intelligence_W38_2026",
    collection: "Repository",
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
    collection: "Repository",
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
    collection: "Weekly Market Reports",
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
    collection: "Weekly Market Reports",
    type: "PDF",
    size: "541 KB",
    updated: "9 Sep 2026",
    summary: "Prior weekly report. India stepped back as the headline destination and Bangladesh took the enquiry count.",
  },
];

export const hedgeBriefs: HedgeBrief[] = [
  {
    id: "2026-07-19",
    date: "19 Jul 2026",
    title: "Direct Hedge | Paper Forward Curves",
    paragraphs: [
      "The paper market is not giving anything away this week. The forward curve on urea is flat across all tenors and benchmarks: no contango, no backwardation, no direction.",
      "In a week where physical Egypt has moved over USD 100 per tonne, paper sitting on its hands is itself a signal. The shorts that needed to cover have covered. What comes next requires real demand to show up, and real demand is on holiday.",
      "Egypt FOB at index 508.5, with August bid at USD 500 against an offer of USD 530, captures the uncertainty. The bid reflects where the market was earlier in the week. The offer reflects where Abu Qir just sold. Paper buyers and paper sellers cannot agree on which end of that range is right.",
      "Brazil CFR August at USD 465/475 is the most instructive benchmark. Paper is pricing August CFR materially above the current physical index of USD 442.5, which tells you the market expects Brazil to pay up when it comes back. Whether physical business confirms that in the next three to four weeks is the number to watch.",
      "MAP CFR Brazil is running USD 820–870 through August and September against a physical index of USD 890. That suggests the paper market expects modest phosphate softening. With sulphur at USD 1,000 FOB and phosphoric acid at USD 1,700 per tonne P2O5 CFR India, the cost floor makes that softening structurally difficult to deliver.",
    ],
    rows: [
      { period: "Aug 2026", market: "Egypt FOB", bid: "500", ask: "530", dir: "flat" },
      { period: "Aug 2026", market: "Brazil CFR urea", bid: "465", ask: "475", dir: "up" },
      { period: "Sep 2026", market: "Brazil CFR urea", bid: "465", ask: "475", dir: "flat" },
      { period: "Aug 2026", market: "Brazil CFR MAP", bid: "820", ask: "870", dir: "down" },
      { period: "Sep 2026", market: "Brazil CFR MAP", bid: "820", ask: "870", dir: "down" },
    ],
  },
  {
    id: "2026-07-12",
    date: "12 Jul 2026",
    title: "Direct Hedge | Paper Forward Curves",
    paragraphs: [
      "Paper was still doing the work physical would not. Urea forwards were a shade firmer on the front, led by short covering rather than fresh demand.",
      "Egypt FOB August was bid 490 and offered 520. Brazil CFR August sat at 455/468, only a small premium to the physical index. MAP CFR Brazil was unchanged on the week at 830/880.",
    ],
    rows: [
      { period: "Aug 2026", market: "Egypt FOB", bid: "490", ask: "520", dir: "up" },
      { period: "Aug 2026", market: "Brazil CFR urea", bid: "455", ask: "468", dir: "up" },
      { period: "Aug 2026", market: "Brazil CFR MAP", bid: "830", ask: "880", dir: "flat" },
    ],
  },
];
