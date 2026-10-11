import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "@/components/hub/markdown";

const html = (text: string) => renderToStaticMarkup(<Markdown text={text} polish />);

const FACTS = [
  "India are carrying large inventories already",
  "Weather has not been in there favour recently",
  "China and Russian Prills will be the only players in town",
  "This tender is likely to be shorted like last time time",
  "Ameropa went USD 40/Mt under China guidance last time",
  "Opportunity cost market (BRAZIL) is paying alot lot more (proving that the market has now split Prills vs Gran Urea)",
  "PAPER markets are flat and CFR Brazil is 465/490 Bid/Offer spread",
  "Extremely long shipping window (till December)",
  "China is still on holiday",
  "China prills WAS USD 340-350 FOB only 3 weeks ago and has risen to USD 360-370 FOB",
  "Cost package from China is put at USD 25/Mt",
];
const INTRO = "With the Indian Urea tender about to close rumours are starting to emerge on potential price points. so lets get some facts out of the ay first:";
const PRICING =
  "So putting all the above together a B2B offer is likely to put you at USD 390 CFR, the last tender taught us that shorters are in control of this market so we should consider USD 390 CFR as the high point and think of the game of Limbo - how low do you go without being L1. Ameropa set the benchmark at USD 40/Mt - that would put you in at USD 360 CFR ! (a USD 335 FOB China) - China cost price is put at USD 285 EXW, add on logistics is 320 FOB equiv - this means Chinese traders are liley to make only USD 10/Mt.";
const QUESTION = "A question then becomes would the chinese make more more money sending the product back in to the mainland, over there peak season?";
const GOSSIP =
  "The most recent gossip has Birla opening bid bonds totalling 1.7 mil mts (taking the whole tender!) but im told this isnt true and its just under 1 mil mts (STILL A LOT!) with the price at USD 365 CFR, again this price point has been told to be untrue, however i feel it wont be too far from the truth.";

test("an unformatted note gets a lede, a list, readable paragraphs, a callout and bold prices", () => {
  const out = html([INTRO, FACTS.join("\n") + "\n" + PRICING, QUESTION, GOSSIP].join("\n\n"));

  assert.match(out, /<p class="[^"]*font-medium[^"]*">With the Indian Urea tender about to close rumours are starting to emerge on potential price points\. So lets/);
  assert.equal(out.match(/<ul/g)?.length, 1);
  assert.equal(out.match(/<li/g)?.length, FACTS.length);
  assert.match(out, /<li>This tender is likely to be shorted like last time<\/li>/);
  assert.match(out, /<li>Ameropa went <strong[^>]*>USD 40\/Mt<\/strong> under China guidance last time<\/li>/);
  assert.match(out, /<strong[^>]*>USD 340-350 FOB<\/strong>/);
  assert.match(out, /465\/490 Bid\/Offer/);

  assert.match(out, /without being L1\.<\/p><p>Ameropa set the benchmark/);
  assert.match(out, /think of the game of Limbo – how low/);
  assert.match(out, /<strong[^>]*>USD 360 CFR<\/strong>!/);
  assert.match(out, /logistics is <strong[^>]*>320 FOB<\/strong> equiv/);

  assert.match(out, /<p class="[^"]*border-l-\[3px\][^"]*">A question then becomes would the chinese make more money/);
  assert.match(out, /however I feel it wont/);
  assert.match(out, /\(taking the whole tender!\) but/);
});

test("the a) b) c) list the author typed is kept as written", () => {
  const out = html([INTRO, FACTS.map((fact, n) => `${String.fromCharCode(97 + n)}) ${fact}`).join("\n"), PRICING].join("\n\n"));
  assert.match(out, /<ol class="[^"]*list-\[aq-lower-paren\]/);
  assert.equal(out.match(/<li/g)?.length, FACTS.length);
});

test("an author's own formatting is left alone apart from lists", () => {
  const text = "## Outlook\n\nprices are **firm** - buyers wait. i think USD 390 CFR holds?\n\nWatch:\n\nIndia\n\nBrazil";
  const out = html(text);
  assert.match(out, /prices are <strong[^>]*>firm<\/strong> - buyers wait\. i think USD 390 CFR holds\?/);
  assert.doesNotMatch(out, /border-l-\[3px\]/);
  assert.match(out, /<ul[^>]*><li>India<\/li><li>Brazil<\/li><\/ul>/);
});

test("short title lines become headings; hard-wrapped prose stays a paragraph", () => {
  const body = "Granular prices held through the week as buyers in Brazil and the US waited for the India tender to close before committing to more volume.";
  assert.match(html(`Market outlook\n\n${body}\n\nMore below.`), /<h3[^>]*>Market outlook<\/h3>/);
  const wrapped = html("Prices held through the week as buyers in Brazil\nand the US waited for the India tender to close\nbefore committing to more volume this month.");
  assert.doesNotMatch(wrapped, /<ul/);
});

test("price bolding steps back when an article is wall-to-wall numbers", () => {
  const prices = Array.from({ length: 25 }, (_, n) => `Port ${n} USD ${300 + n} CFR.`).join(" ");
  assert.doesNotMatch(html(prices), /<strong/);
});
