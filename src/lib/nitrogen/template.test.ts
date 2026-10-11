import assert from "node:assert/strict";
import test from "node:test";
import { cleanText, mergeReply, parseReply } from "./ai-brief";
import { buildBrief, storedBrief, type NitrogenAnswers } from "./engine";
import { DEFAULT_REFERENCE } from "./reference";
import { briefMarkdown } from "./render";
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
    { key: "recommendations", heading: "What we advise", hidden: false },
    { key: "nope", heading: "x" },
    { key: "position", heading: "Our read", hidden: true },
    { key: "recommendations", heading: "Again" },
  ]);
  assert.deepEqual(
    sections.map((section) => section.key),
    ["recommendations", "position", "requirement", "pulse", "products", "logistics"],
  );
  assert.equal(sections[0].heading, "What we advise");
  assert.equal(sections[1].hidden, true);
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
      { key: "recommendations", heading: "Advice", hidden: false },
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
  assert.match(briefMarkdown(brief), /^## Market Pulse \| W41 2026$/m);
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

test("a stored brief is used only when it is complete", () => {
  assert.equal(storedBrief(brief), brief);
  assert.equal(storedBrief({ ...brief, position: "text" }), null);
  assert.equal(storedBrief(undefined), null);
});
