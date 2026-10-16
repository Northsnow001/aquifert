import assert from "node:assert/strict";
import test from "node:test";
import { briefRequest, cleanText, knowledgeQuery, mergeReply, OUTPUT_CONTRACT, parseReply } from "./ai-brief";
import { buildBrief, storedBrief, withoutNames, type NitrogenAnswers } from "./engine";
import { DEFAULT_REFERENCE } from "./reference";
import { briefHeader, briefMarkdown } from "./render";
import { contentProblem, DEFAULT_CONTENT, DEFAULT_DESIGN, designProblem, fill, hexToRgb, normalizeContent, normalizeDesign, normalizeSections } from "./template";

const answers: NitrogenAnswers = {
  destinationCountry: "Kenya",
  destinationPort: "Mombasa",
  preferredOrigin: "",
  products: ["Urea", "CAN"],
  annualTonnage: "1,200",
  arrivalMonths: ["2026-11", "2027-01"],
  shipmentType: "Break Bulk",
  packing: "Big Bags",
  cargoSize: "400",
};
const brief = buildBrief(answers, { refNo: "NR-1", partner: "Harvest Co", date: new Date("2026-10-06T09:00:00Z") });

test("a missing or damaged template falls back to the launch content and design", () => {
  assert.deepEqual(normalizeContent(null), DEFAULT_CONTENT);
  assert.deepEqual(normalizeDesign("junk"), DEFAULT_DESIGN);
  const design = normalizeDesign({ colors: { header: "#ABCDEF", accent: "teal", body: "#12345" }, textSize: "huge", title: 7 });
  assert.equal(design.colors.header, "#abcdef");
  assert.equal(design.colors.accent, DEFAULT_DESIGN.colors.accent);
  assert.equal(design.colors.body, DEFAULT_DESIGN.colors.body);
  assert.equal(design.textSize, "standard");
  assert.equal(design.title, DEFAULT_DESIGN.title);
  const content = normalizeContent({ model: "gpt-9", reference: { products: { Urea: { signal: "Sideways", view: "Tight." } } } });
  assert.equal(content.model, DEFAULT_CONTENT.model);
  assert.equal(content.reference.products.Urea.signal, "Firm");
  assert.equal(content.reference.products.Urea.view, "Tight.");
  assert.equal(content.reference.products.CAN.note, DEFAULT_REFERENCE.products.CAN.note);
});

test("section order keeps the saved order, drops unknown and repeated sections, and adds missing ones", () => {
  const sections = normalizeSections([
    { key: "call", heading: "Our call", hidden: false },
    { key: "nope", heading: "x" },
    { key: "position", heading: "Our read", hidden: true },
    { key: "call", heading: "Again" },
  ]);
  assert.deepEqual(
    sections.map((section) => section.key),
    ["call", "position", "pulse", "products", "macro", "logistics", "requirement", "recommendations"],
  );
  assert.equal(sections[0].heading, "Our call");
  assert.equal(sections[1].hidden, true);
  assert.equal(sections.find((section) => section.key === "requirement")?.hidden, true);
});

test("a layout or writing guide saved before the market-first brief moves to the new one", () => {
  const old = normalizeSections([
    { key: "requirement", heading: "Supply Requirement", hidden: false },
    { key: "pulse", heading: "Market Pulse | {week}", hidden: false },
    { key: "recommendations", heading: "Recommendations", hidden: false },
  ]);
  assert.deepEqual(old, DEFAULT_DESIGN.sections);
  const retired = "# AQ View Nitrogen Brief: writing guide\n\n- Prices are never quoted. Any pricing is landed cost: supplier cost plus pass-through freight and a stated fee.";
  const content = normalizeContent({ prompt: retired });
  assert.equal(content.prompt, DEFAULT_CONTENT.prompt);
  assert.equal(content.previousPrompt, retired);
  assert.equal(normalizeContent({ prompt: "Our own guide, written by the desk, with plenty of detail to follow." }).prompt, "Our own guide, written by the desk, with plenty of detail to follow.");
});

test("saves are refused when the brief would be empty or the prompt is missing", () => {
  assert.equal(designProblem(DEFAULT_DESIGN), null);
  assert.match(designProblem({ ...DEFAULT_DESIGN, sections: DEFAULT_DESIGN.sections.map((section) => ({ ...section, hidden: true })) }) ?? "", /at least one section/);
  assert.match(designProblem({ ...DEFAULT_DESIGN, sections: [{ key: "pulse", heading: " ", hidden: false }] }) ?? "", /Market pulse/);
  assert.equal(contentProblem(DEFAULT_CONTENT), null);
  assert.match(contentProblem({ ...DEFAULT_CONTENT, prompt: "Be nice." }) ?? "", /too short/);
  assert.equal(contentProblem({ ...DEFAULT_CONTENT, aiEnabled: false, prompt: "" }), null);
});

test("the desk wording follows the saved market views", () => {
  const reference = { ...DEFAULT_REFERENCE, products: { ...DEFAULT_REFERENCE.products, Urea: { view: "Supply is tight after the tender.", signal: "Watch" as const, note: "Urea note." } } };
  const custom = buildBrief(answers, { refNo: "NR-2", partner: "Harvest Co", reference });
  assert.deepEqual(custom.pulse[0], { market: "Urea", view: "Supply is tight after the tender.", signal: "Watch" });
  assert.equal(custom.products[0].note, "Urea note.");
});

test("the Markdown follows the design: order, headings, hidden sections, quote and placeholders", () => {
  const design = normalizeDesign({
    ...DEFAULT_DESIGN,
    title: "Desk Brief for {partner}",
    sections: [
      { key: "call", heading: "Advice", hidden: false },
      { key: "products", heading: "Product: {product}", hidden: false },
      { key: "pulse", heading: "Pulse {week}", hidden: true },
    ],
    quote: { ...DEFAULT_DESIGN.quote, hidden: true },
  });
  const md = briefMarkdown(brief, design);
  assert.match(md, /^# Desk Brief for Harvest Co$/m);
  assert.ok(md.indexOf("## Advice") < md.indexOf("## Product: Urea"));
  assert.match(md, /^## Product: CAN$/m);
  assert.doesNotMatch(md, /Pulse W41/);
  assert.doesNotMatch(md, /Benjamin Graham/);
  assert.doesNotMatch(md, /## Macro Context/, "an empty macro section is left out");
  assert.match(briefMarkdown(brief), /^## Market Pulse \| W41 2026$/m);
  assert.match(briefMarkdown(brief), /^> \*\*AQ View\.\*\* \*Urea is a market to cover in tranches/m);
  assert.doesNotMatch(briefMarkdown(brief), /## Supply Requirement|## Recommendations/);
  const older = { ...brief, call: undefined };
  assert.match(briefMarkdown(older), /^> \*\*What to do now\.\*\*/m, "a brief written before the call shows its recommendations there");
  assert.equal(fill("{partner} {unknown}", { partner: "A" }), "A {unknown}");
  assert.deepEqual(hexToRgb("#1a2b4a"), [26, 43, 74]);
});

test("the AI reply only replaces wording, and anything missing keeps the desk text", () => {
  assert.equal(parseReply("not json"), null);
  const reply = parseReply(
    '```json\n{"pulse":[{"market":"urea","view":"**Firm** bids into Q1.","signal":"Watch"},{"market":"CAN","view":"Quiet.","signal":"Sideways"}],"position":["One.","","Two."],"products":[{"name":"CAN","note":"CAN note.","view":""}],"recommendations":[{"label":"What to do now:","text":"Send it."},{"label":"","text":"No label."}]}\n```',
  );
  assert.ok(reply);
  const { brief: merged, parts } = mergeReply(brief, reply);
  assert.equal(parts, 4);
  assert.deepEqual(merged.pulse[0], { market: "Urea", view: "Firm bids into Q1.", signal: "Watch" });
  assert.equal(merged.pulse[1].signal, "Balanced");
  assert.deepEqual(merged.position, ["One.", "Two."]);
  assert.equal(merged.products[0].note, brief.products[0].note);
  assert.equal(merged.products[1].note, "CAN note.");
  assert.equal(merged.products[1].view, brief.products[1].view);
  assert.deepEqual(merged.logistics, brief.logistics);
  assert.deepEqual(merged.recommendations, [{ label: "What to do now", text: "Send it." }]);
  assert.equal(merged.refNo, "NR-1");
  assert.deepEqual(merged.requirement, brief.requirement);
  assert.equal(mergeReply(brief, {}).parts, 0);
  assert.equal(cleanText("## Heading\n- point  one"), "Heading point one");
});

test("the AI's market drivers, product commentary, macro context and call replace the desk text", () => {
  const { brief: merged, parts } = mergeReply(brief, {
    pulse: [
      { driver: "North Africa / urea", prior: "Helwan USD 518/t fob.", now: "Deals stand; Arab Gulf USD 400/430 fob.", signal: "Firm", read: "October priced; buyers behind" },
      { driver: "China quota", prior: "Third batch 1.0-1.5 million t.", now: "Revised to 1.6-2.0 million t.", signal: "Soft" },
      { driver: "", now: "No driver name." },
    ],
    products: [{ name: "Urea", paragraphs: ["Helwan sold 7,000 t granular.", "", "Brazil needs 1 million t a month."] }],
    macro: ["The Fed is expected to hike 25 basis points."],
    call: "The next four weeks are constructive for granular.",
    risk: "A Hormuz opening releases pre-loaded tonnage.",
  });
  assert.equal(parts, 4);
  assert.deepEqual(merged.pulse, [
    { market: "North Africa / urea", prior: "Helwan USD 518/t fob.", view: "Deals stand; Arab Gulf USD 400/430 fob.", signal: "Firm", read: "October priced; buyers behind" },
    { market: "China quota", prior: "Third batch 1.0-1.5 million t.", view: "Revised to 1.6-2.0 million t.", signal: "Soft" },
  ]);
  assert.deepEqual(merged.products[0].paragraphs, ["Helwan sold 7,000 t granular.", "Brazil needs 1 million t a month."]);
  assert.equal(merged.products[1].paragraphs, undefined);
  assert.deepEqual(merged.macro, ["The Fed is expected to hike 25 basis points."]);
  assert.equal(merged.call, "The next four weeks are constructive for granular.");
  assert.equal(merged.risk, "A Hormuz opening releases pre-loaded tonnage.");
  const md = briefMarkdown(merged);
  assert.match(md, /^\| Driver \| Prior read \| This week \| Signal \|$/m);
  assert.match(md, /^\| China quota \| Third batch 1\.0-1\.5 million t\. \| Revised to 1\.6-2\.0 million t\. \| Soft \|$/m);
  assert.ok(md.indexOf("## Urea") < md.indexOf("## Macro Context") && md.indexOf("## Macro Context") < md.indexOf("## The Call"));
  assert.match(md, /^A Hormuz opening releases pre-loaded tonnage\.$/m);
  assert.deepEqual(mergeReply(brief, { pulse: [{ driver: "Only one", now: "Row." }] }).brief.pulse, brief.pulse, "one driver row is not enough to replace the pulse");
});

test("the knowledge search follows the buyer's answers, and passages are sent only when found", () => {
  assert.equal(
    knowledgeQuery({ ...answers, preferredOrigin: "Egypt" }),
    "Urea, CAN market outlook, prices, supply and demand; imports into Mombasa, Kenya; origin Egypt; arrivals November 2026, January 2027; break bulk freight",
  );
  assert.equal(knowledgeQuery({ ...answers, products: [], destinationPort: "", arrivalMonths: [], shipmentType: "" }), "nitrogen fertiliser market outlook, prices, supply and demand; imports into Kenya");
  const without = JSON.parse(briefRequest(answers, brief, DEFAULT_REFERENCE));
  assert.equal(without.deskKnowledge, undefined);
  const passages = [{ source: "Desk research", text: "Kenyan CAN demand peaks before the long rains." }];
  assert.deepEqual(JSON.parse(briefRequest(answers, brief, DEFAULT_REFERENCE, passages)).deskKnowledge, passages);
  const notes = [{ source: "Desk telex", date: "2026-10-12", text: "Helwan sold 7,000 t granular at USD 518/t fob." }];
  const request = JSON.parse(briefRequest(answers, brief, DEFAULT_REFERENCE, [], notes));
  assert.deepEqual(request.recentDeskNotes, notes);
  assert.equal(request.deskKnowledge, undefined);
  assert.equal(normalizeContent({ useKnowledge: false }).useKnowledge, false);
  assert.equal(normalizeContent({}).useKnowledge, true);
});

test("no person is named in a report", () => {
  const named = {
    ...brief,
    partner: "Kayode Daniel",
    position: ["Kayode Daniel is buying urea.", "The programme suits kayode  daniel's storage."],
    call: "Phil Sunderland expects a firm October; the view of Phil Sunderland is shared by Sunderland port agents.",
  };
  const clean = withoutNames(named, ["Kayode Daniel"], "the buyer");
  assert.equal(clean.partner, "");
  assert.deepEqual(clean.position, ["The buyer is buying urea.", "The programme suits the buyer's storage."]);
  assert.equal(withoutNames(named, ["Phil Sunderland"], "the desk").call, "The desk expects a firm October; the view of the desk is shared by Sunderland port agents.");
  assert.equal(withoutNames(named, [], "the desk"), named);

  const head = briefHeader({ ...brief, partner: "" }, DEFAULT_DESIGN);
  assert.equal(head.subtitle, "Partnership Intelligence");
  assert.match(head.disclaimer, /^Prepared exclusively for the member\. Assessments/);
  assert.equal(briefHeader(brief, DEFAULT_DESIGN).subtitle, "Harvest Co Partnership Intelligence");
  assert.doesNotMatch(briefMarkdown(brief), /Benjamin Graham/);
  assert.equal(normalizeDesign({ quote: { text: "Q", source: "Benjamin Graham, The Intelligent Investor, 1949" } }).quote.source, "The Intelligent Investor, 1949");
  assert.match(OUTPUT_CONTRACT, /Never write the name of a person/);
});

test("a stored brief is used only when it is complete", () => {
  assert.equal(storedBrief(brief), brief);
  assert.equal(storedBrief({ ...brief, position: "text" }), null);
  assert.equal(storedBrief(undefined), null);
});
