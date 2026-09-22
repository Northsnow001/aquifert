/**
 * Hub seed, run with: npx tsx db/seed-hub.ts
 * Idempotent: skips each section if already populated.
 *
 * News: publisher RSS feeds are registered for syndication ingestion.
 * The sandbox has no outbound network, so demo content comes from the
 * Aquifert Desk Wire source; publisher feeds populate on first successful
 * ingestion once deployed (headline + <=200-char snippet only, ever).
 */
import "dotenv/config";
import { getDb } from "../server/queries/connection";
import * as s from "./schema";

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(7);
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5);
const hoursAgo = (n: number) => new Date(Date.now() - n * 36e5);

const NEWS_SOURCES = [
  {
    code: "AQUIFERT_DESK_WIRE", name: "Aquifert Desk Wire",
    feedUrl: "https://aquifert.com/desk-wire", siteUrl: "https://aquifert.com",
    licenceType: "First-party desk content", attributionText: "Source: Aquifert Trading Desk.",
    refreshCadence: "4 hours", geography: "GLOBAL", owner: "Aquifert Trading Desk", enabled: true,
  },
  {
    code: "AGWEB", name: "AgWeb",
    feedUrl: "https://www.agweb.com/rss.xml", siteUrl: "https://www.agweb.com",
    licenceType: "Publisher RSS syndication", attributionText: "Source: AgWeb (Farm Journal).",
    refreshCadence: "6 hours", geography: "NORTH_AMERICA", owner: "Aquifert Market Data", enabled: true,
  },
  {
    code: "FARM_PROGRESS", name: "Farm Progress",
    feedUrl: "https://www.farmprogress.com/rss.xml", siteUrl: "https://www.farmprogress.com",
    licenceType: "Publisher RSS syndication", attributionText: "Source: Farm Progress (Informa).",
    refreshCadence: "6 hours", geography: "NORTH_AMERICA", owner: "Aquifert Market Data", enabled: true,
  },
  {
    code: "WORLD_GRAIN", name: "World-Grain",
    feedUrl: "https://www.world-grain.com/rss", siteUrl: "https://www.world-grain.com",
    licenceType: "Publisher RSS syndication", attributionText: "Source: World-Grain (Sosland).",
    refreshCadence: "12 hours", geography: "GLOBAL", owner: "Aquifert Market Data", enabled: true,
  },
  {
    code: "FERTILIZER_DAILY", name: "Fertilizer Daily",
    feedUrl: "https://fertilizerdaily.com/feed/", siteUrl: "https://fertilizerdaily.com",
    licenceType: "Publisher RSS syndication", attributionText: "Source: Fertilizer Daily.",
    refreshCadence: "6 hours", geography: "GLOBAL", owner: "Aquifert Market Data", enabled: true,
  },
  {
    code: "ABG", name: "AgriBusiness Global",
    feedUrl: "https://www.agribusinessglobal.com/feed/", siteUrl: "https://www.agribusinessglobal.com",
    licenceType: "Publisher RSS syndication", attributionText: "Source: AgriBusiness Global (Meister Media).",
    refreshCadence: "12 hours", geography: "GLOBAL", owner: "Aquifert Market Data", enabled: true,
  },
  {
    code: "FAO_NEWS", name: "FAO Newsroom",
    feedUrl: "https://www.fao.org/newsroom/rss/en", siteUrl: "https://www.fao.org/newsroom/en",
    licenceType: "Publisher RSS syndication", attributionText: "Source: FAO Newsroom.",
    refreshCadence: "24 hours", geography: "GLOBAL", owner: "Aquifert Market Data", enabled: true,
  },
];

const DESK_WIRE: [string, string, string, string, number][] = [
  // [headline, snippet, product, geography, hoursAgo]
  ["India IPL issues urea tender for October shipment", "India's IPL has issued a purchase tender for urea with October laycans; offers are expected from Middle East and FSU origins. Desk view: supports prompt sentiment.", "NITROGEN", "SOUTH_ASIA", 3],
  ["Egyptian urea FOB indications edge higher", "Egyptian granular urea FOB indications moved up on steady European enquiry and limited September availability. Ranges remain desk-assessed.", "NITROGEN", "AFRICA", 6],
  ["Brazil MAP CFR levels steady as safrinha buying winds down", "Brazilian MAP CFR indications are stable; the desk notes reduced spot liquidity as the safrinha programme completes. Watch October reloads.", "PHOSPHATE", "SOUTH_AMERICA", 9],
  ["MOP sentiment quiet in SE Asia ahead of contract talks", "Standard MOP indications in Southeast Asia are flat; buyers are waiting for clarity on the next contract round before committing.", "POTASSIUM", "EAST_ASIA", 12],
  ["Handysize Atlantic basket softens on prompt tonnage", "Handysize freight indications in the Atlantic eased as prompt tonnage built. The desk expects support from grains stems into Q4.", "FREIGHT", "GLOBAL", 18],
  ["Chinese urea export policy remains the swing factor", "Desk note: any change to Chinese urea export inspection policy remains the single largest swing factor for Q4 nitrogen balances.", "NITROGEN", "EAST_ASIA", 24],
  ["Moroccan OCP phosphates programmes steady into Europe", "Moroccan DAP/MAP programmes into Northwest Europe are reported steady; indications unchanged week-on-week.", "PHOSPHATE", "EUROPE", 30],
  ["Baltic potash availability watched after logistics works", "The desk is monitoring Baltic standard MOP availability following scheduled port maintenance; no supply disruption confirmed.", "POTASSIUM", "FSU", 36],
  ["US NOLA urea barge market quiet post-fill", "NOLA urea barge indications are steady-to-quiet after the river fill programme; deferred values carry a mild contango.", "NITROGEN", "NORTH_AMERICA", 42],
  ["Supramax Pacific rates firm on Indonesian coal stems", "Supramax indications in the Pacific firmed on coal and fertiliser stems ex-Indonesia; period cover interest is rising.", "FREIGHT", "EAST_ASIA", 48],
  ["West Africa NPK tender interest building for Q4", "West African NPK tender interest is building for fourth-quarter delivery; blended grades remain the desk's focus.", "GENERAL", "AFRICA", 54],
  ["Ammonia CFR Far East indications stable", "Ammonia CFR Far East indications are stable with balanced prompt supply; turnaround season limits spot availability.", "NITROGEN", "GLOBAL", 60],
];

const TELEX: [string, string, string, string, number][] = [
  ["NITROGEN, India tender live", "IPL urea tender issued, October laycans. Desk expects healthy offer coverage from Middle East; watch the counter level versus last award.", "NITROGEN", "SOUTH_ASIA", 2],
  ["FREIGHT, Atlantic Handysize softer", "Prompt Handysize tonnage building in the Atlantic; the desk's basket indication is off $1.50/t w/w. Enquiry flow remains two-way.", "FREIGHT", "GLOBAL", 4],
  ["PHOSPHATE, Brazil steady", "MAP CFR Brazil indications flat. Liquidity thinning as safrinha completes; October reload offers begin to surface.", "PHOSPHATE", "SOUTH_AMERICA", 7],
  ["POTASSIUM, SE Asia flat", "Standard MOP CFR SE Asia unchanged. Contract round chatter continues; spot buyers content to wait.", "POTASSIUM", "EAST_ASIA", 10],
  ["NITROGEN, Egypt FOB up", "Egyptian granular urea FOB indications firmer on European enquiry. September cargoes largely committed.", "NITROGEN", "AFRICA", 14],
  ["FREIGHT, Pacific Supramax firmer", "Supramax Pacific indications up on Indonesian stems. Period interest noted for Q4 cover.", "FREIGHT", "EAST_ASIA", 20],
  ["NITROGEN, NOLA quiet", "NOLA barge urea steady-to-quiet post-fill. Deferred values in mild contango; desk sees limited downside near term.", "NITROGEN", "NORTH_AMERICA", 26],
  ["POTASSIUM, Baltic watch", "Monitoring Baltic MOP availability through scheduled port works. No disruption confirmed; keep laycans flexible.", "POTASSIUM", "FSU", 32],
  ["PHOSPHATE, Morocco steady", "OCP programmes into NWE steady. DAP/MAP indications unchanged; desk notes comfortable producer order books.", "PHOSPHATE", "EUROPE", 38],
  ["GENERAL, West Africa NPK", "West African NPK tender interest building for Q4. Blends desk expects competitive offers from two origins.", "GENERAL", "AFRICA", 44],
  ["NITROGEN, Ammonia balanced", "Ammonia CFR Far East stable; turnaround season caps spot supply. Desk neutral into October.", "NITROGEN", "GLOBAL", 50],
  ["FREIGHT, Container FEU steady", "Container FEU indications on Asia–North Europe steady; equipment availability normal at load ports.", "FREIGHT", "GLOBAL", 56],
  ["PHOSPHATE, India DAP watch", "India DAP import parity tightening against CFR indications; subsidy clarity awaited before fresh tendering.", "PHOSPHATE", "SOUTH_ASIA", 62],
  ["NITROGEN, China policy watch", "No change to Chinese urea export inspection policy reported. Remains the Q4 swing factor, desk monitoring weekly.", "NITROGEN", "EAST_ASIA", 70],
  ["POTASSIUM, Brazil granular firm", "Granular MOP CFR Brazil a touch firmer on restock enquiry; standard grade flat.", "POTASSIUM", "SOUTH_AMERICA", 78],
  ["FREIGHT, Bunkers stable", "VLSFO indications stable at major bunkering hubs; no near-term freight cost pressure from fuel.", "FREIGHT", "GLOBAL", 84],
  ["NITROGEN, Middle East sold out", "Middle East granular urea largely committed for September; October offers expected at a premium to last done.", "NITROGEN", "MIDDLE_EAST", 92],
  ["PHOSPHATE, China DAP exports slow", "Chinese DAP export allocations running behind expectations; desk sees support for regional CFR levels.", "PHOSPHATE", "EAST_ASIA", 100],
  ["POTASSIUM, Europe quiet", "NWE standard MOP quiet; buyers covered into Q4. Desk expects sideways trade.", "POTASSIUM", "EUROPE", 110],
  ["GENERAL, FX watch", "BRL and INR moves worth monitoring for import affordability; the desk flags INR at multi-month lows.", "GENERAL", "GLOBAL", 118],
  ["NITROGEN, US fill done", "US river fill programmes complete; attention shifts to autumn application weather windows.", "NITROGEN", "NORTH_AMERICA", 126],
  ["FREIGHT, Baltic dry index flat", "Dry bulk benchmark indications flat w/w; fertiliser-relevant sizes mixed by basin.", "FREIGHT", "GLOBAL", 132],
  ["PHOSPHATE, TSP niche firm", "TSP indications firm in niche LatAm demand; limited spot availability ex-Med.", "PHOSPHATE", "SOUTH_AMERICA", 140],
  ["POTASSIUM, Contract chatter", "Market awaiting signals on the next SE Asia standard MOP contract; desk expects a narrow range versus last settlement.", "POTASSIUM", "EAST_ASIA", 150],
];

const FREIGHT_ENQUIRIES = [
  ["AQ-1042", "Granular urea", 30000, "Arabian Gulf", "WC India", "1–10 Oct"],
  ["AQ-1187", "MAP 11-52", 25000, "Morocco", "Brazil (Santos)", "5–15 Oct"],
  ["AQ-0931", "Standard MOP", 20000, "Baltic", "SE Asia", "10–20 Oct"],
  ["AQ-1254", "Prilled urea", 15000, "Egypt", "Med Europe", "Prompt"],
  ["AQ-1108", "DAP 18-46", 27000, "China", "India (East Coast)", "15–25 Oct"],
  ["AQ-0876", "Granular MOP", 35000, "Canada (Vancouver)", "Brazil (Paranaguá)", "Oct laycan"],
];

const INDICATORS: [s.HubIndicator["nutrient"], number, string][] = [
  ["NITROGEN", 62, "Supported by the fresh Indian tender, firm Egyptian FOB indications and sold-out Middle East prompt positions. China export policy is the two-way risk; desk holds a modest bullish bias while gas costs underpin the floor."],
  ["PHOSPHATE", 54, "Balanced. Brazil demand is winding down after safrinha but Chinese export allocations are running slow and Indian parity is tightening. Desk neutral-to-firm into Q4 tendering."],
  ["POTASSIUM", 47, "Quiet and rangebound. SE Asia spot is flat ahead of contract talks; Baltic logistics works are a watch item but no disruption is confirmed. Neutral with a slight soft bias near term."],
];

async function main() {
  const db = getDb();

  // --- news sources
  const existingSources = await db.query.newsSources.findMany({ limit: 1 });
  let deskWireId: number;
  if (existingSources.length === 0) {
    for (const src of NEWS_SOURCES) {
      const [{ id }] = await db.insert(s.newsSources).values(src).returning({ id: s.newsSources.id });
      if (src.code === "AQUIFERT_DESK_WIRE") deskWireId = id;
    }
    console.log("news sources seeded");
  } else {
    deskWireId = (await db.query.newsSources.findFirst())!.id;
  }

  // --- desk wire items
  const existingNews = await db.query.newsItems.findMany({ limit: 1 });
  if (existingNews.length === 0) {
    const desk = await db.query.newsSources.findFirst();
    for (const [headline, snippet, product, geography, h] of DESK_WIRE) {
      await db.insert(s.newsItems).values({
        sourceId: desk!.id, headline, snippet, product, geography,
        url: `https://aquifert.com/desk-wire#${headline.slice(0, 24).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
        publishedAt: hoursAgo(h),
      });
    }
    await db.update(s.newsSources)
      .set({ lastFetchedAt: new Date(), dataAsOf: hoursAgo(3) });
    console.log("desk wire items seeded");
  }

  // --- indicators with 90-day history
  const existingInd = await db.query.hubIndicators.findMany({ limit: 1 });
  if (existingInd.length === 0) {
    for (const [nutrient, score, rationale] of INDICATORS) {
      const history: { date: string; score: number }[] = [];
      let v = score - 8 + Math.floor(rand() * 6);
      for (let d = 90; d >= 0; d -= 3) {
        v = Math.max(15, Math.min(85, v + Math.round((rand() - 0.48) * 6)));
        history.push({ date: daysAgo(d).toISOString().slice(0, 10), score: v });
      }
      history[history.length - 1].score = score;
      await db.insert(s.hubIndicators).values({
        nutrient, score, rationale, history,
        updatedBy: "Aquifert Trading Desk", updatedAt: hoursAgo(20),
      });
    }
    console.log("indicators seeded");
  }

  // --- telex
  const existingTelex = await db.query.telexItems.findMany({ limit: 1 });
  if (existingTelex.length === 0) {
    for (const [title, body, product, geography, h] of TELEX) {
      await db.insert(s.telexItems).values({
        title, body, product, geography, createdAt: hoursAgo(h), updatedAt: hoursAgo(h),
      });
    }
    console.log("telex seeded");
  }

  // --- freight enquiries (anonymised account codes only, never real identities)
  const existingF = await db.query.freightEnquiries.findMany({ limit: 1 });
  if (existingF.length === 0) {
    for (const [accountCode, product, qtyMt, origin, destination, laycan] of FREIGHT_ENQUIRIES) {
      await db.insert(s.freightEnquiries).values({ accountCode, product, qtyMt, origin, destination, laycan });
    }
    console.log("freight enquiries seeded");
  }

  // --- commentary
  const existingC = await db.query.hubCommentary.findMany({ limit: 1 });
  if (existingC.length === 0) {
    await db.insert(s.hubCommentary).values({
      kind: "FREIGHT",
      title: "Corridor analysis, Atlantic Handysize and the grains swing",
      byline: "Aquifert Freight Desk",
      paragraphs: [
        "The Atlantic Handysize basket has softened $1.50/t week-on-week as prompt tonnage built in the US Gulf and Continent. The desk reads this as positioning rather than trend: grains stems ex-US Gulf are expected to absorb tonnage into Q4, and fertiliser enquiry out of the Arabian Gulf remains steady.",
        "On the key urea corridor (AG–WC India, 30,000 MT), the desk's voyage indication implies a delivered cost sensitivity of roughly $4/t of urea for every $1/t move in freight. Members with October laycans should note that period cover is still available at levels below the Q2 average.",
        "Pacific Supramax has firmed on Indonesian coal and fertiliser stems; the desk expects the firm tone to hold while SE Asia potash and phosphate programmes run. Container FEU indications on Asia–North Europe are steady, with equipment availability normal at load ports.",
      ],
      publishedAt: hoursAgo(10),
    });
    await db.insert(s.hubCommentary).values({
      kind: "MARKET",
      title: "Nitrogen firms on tight prompt supply; phosphates hold their premium into Brazil",
      byline: "Aquifert Trading Desk",
      paragraphs: [
        "Nitrogen markets firmed through the week as prompt supply tightened against fresh demand. The Indian tender has given the market a clear reference point, and Middle East producers are largely sold out for September. Egyptian FOB indications moved higher on European enquiry, and the NOLA barge market, while quiet post-fill, shows a mild contango that suggests limited downside pressure.",
        "Phosphates remain the most structurally supported of the three nutrients. Chinese export allocations are running behind expectations, Indian import parity is tightening, and Brazilian buyers, though winding down after safrinha, are paying steady CFR levels for remaining slots. The desk sees the DAP/MAP premium to nitrogen persisting into Q4.",
        "Potash continues to trade sideways. Spot indications in Southeast Asia are flat as buyers hold out for the next contract settlement. The Baltic logistics watch is the main supply-side variable; absent disruption, the desk expects a narrow range.",
        "Our base case into year-end: nitrogen supported by gas costs and Indian demand, phosphates structurally tight, potash rangebound with an upward bias. Members can find the full regional breakdowns and hedge indications in this week's AQ VIEW.",
      ],
      publishedAt: daysAgo(1),
    });
    console.log("commentary seeded");
  }

  console.log("hub seed complete");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
