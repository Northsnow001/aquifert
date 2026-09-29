export const telex = [
  {
    id: "tx-1",
    date: "Mon · 28 Sep 2026",
    title: "China fertiliser markets soften ahead of Golden Week. Urea holds; phosphates and potash slide.",
    paragraphs: [
      "Pre-holiday order pressure has pushed most domestic Chinese fertiliser prices lower in the days before the National Day break. The pattern is familiar: companies cut quotes to clear inventory, buyers take a little at reduced levels, then the market consolidates.",
      "Urea domestic prices edged down on small and medium granule routes as producers flexed to collect orders. The India standard announcement generated some speculation but limited directional impact.",
      "MAP is under genuine pressure. Hubei 55% powdered MAP is trading below the recent range, with some parcels already below the market.",
    ],
  },
  {
    id: "tx-2",
    date: "Fri · 26 Sep 2026",
    title: "Brazil urea enquiry returns for October laycan.",
    paragraphs: [
      "Named buyers are back for October granular urea into Brazil. Arab Gulf sellers are holding offers above last week's range rather than chasing the first bid.",
      "Freight ideas on the AG–Brazil supramax are steady. The enquiry is real, but coverage is still hand to mouth.",
    ],
  },
];

export const indicators = [
  {
    name: "Nitrogen",
    value: 60,
    summary:
      "China's next urea quota is talked under 2 million tonnes. Buyers back this week would lift prices.",
    note: "Rumours around China still saying a urea 3rd quota to be announced, under 2 mil mts is expected. Expect Brazil, EU, Turkey and UK to come to market this week, pushing up nitrogen prices.",
  },
  {
    name: "Phosphate",
    value: 45,
    summary:
      "Brunei is cheaper than Chinese urea in Asia, near USD 400 against USD 410 FOB.",
    note: "In Asia, Brunei seems to be cheaper than Chinese granular urea. USD 400 vs USD 410 FOB.",
  },
  {
    name: "Potassium",
    value: 45,
    summary:
      "Potash is well supplied. Buyers are covering nearby tonnes, not chasing forward.",
    note: "Potash remains supplied. Buyers are covering nearby needs and are not chasing forward tonnes.",
  },
];

export const freightEnquiries = [
  { account: "MISC", product: "BHF", qty: "12,000", origin: "Tianjin, China", destination: "South America", laycan: "Oct" },
  { account: "MISC", product: "BHF", qty: "39,000", origin: "St Petes, Russia", destination: "Brazil", laycan: "Oct" },
  { account: "MISC", product: "BHF", qty: "55,000", origin: "CJK, China", destination: "ECSA", laycan: "Nov" },
];

export const freightCommentary = {
  title: "Aquifert freight intelligence — data to 4 September 2026",
  paragraphs: [
    "~105 enquiries, approximately 3.0 million MT quantified. The equivalent week in September 2025 carried 166 enquiries and 5.1 million MT, with India, Bangladesh and Brazil as the three dominant discharge corridors.",
    "India has stepped back sharply from last year's position as the headline destination. Bangladesh has moved into the dominant slot, with a clustering of phosrock, TSP and DAP enquiries.",
    "Markets heating up by destination: Bangladesh is the dominant corridor by enquiry count. Morocco, Jorf Lasfar and Casablanca remain the primary load origins.",
  ],
};

export const aquibotSessions = [
  {
    id: "s1",
    title: "Brazil urea freight",
    messages: [
      { role: "user", text: "What was the Brazil freight talk last week?" },
      { role: "assistant", text: "Sample reply. Live Aquibot answers are not connected in this build." },
    ],
  },
  {
    id: "s2",
    title: "DAP Morocco",
    messages: [
      { role: "user", text: "DAP Morocco FOB this week?" },
      { role: "assistant", text: "Sample reply drawn from the library layout, not a model response." },
    ],
  },
];

export const payments = [
  { date: "01 Sep 2026", description: "Growth plan", amount: "$249.00", status: "Paid" },
  { date: "01 Aug 2026", description: "Growth plan", amount: "$249.00", status: "Paid" },
];

export const subscription = {
  plan: "Growth",
  status: "Active",
  renews: "01 Oct 2026",
};
