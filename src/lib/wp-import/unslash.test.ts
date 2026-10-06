import assert from "node:assert/strict";
import { test } from "node:test";
import { buildVocabulary, isUnslashedText, repairUnslashedText } from "./unslash";

const DAMAGED =
  "The paper market is not giving anything away this week. The forward curve on urea is flat across all tenors and allnbenchmarks: no contango, no backwardation, no direction. In a week where physical Egypt has moved over USDn100 per tonne, paper sitting on its hands is itself a signal. The shorts that needed to cover have covered. Whatncomes next requires real demand to show up, and real demand is on holiday.nEgypt FOB at index 508.5 with August bid at USD 500 against an offer of USD 530 captures the uncertaintynperfectly. The bid reflects where the market was earlier in the week, the offer reflects where Abu Qir just sold.nPaper buyers and paper sellers cannot agree on which end of that range is right.nBrazil CFR August at USD 465/475 is the most instructive benchmark. Paper is pricing August CFR materially aboventhe current physical index of USD 442.5, which tells you the market expects Brazil to pay up when it comes backnproperly. Whether physical business confirms that in the next three to four weeks is the number to watch.nMAP CFR Brazil running USD 820-870 through August and September against a physical index of USD 890 suggestsnthe paper market expects modest softening.";

test("the WordPress-stripped hedge commentary gets its paragraphs and spaces back", () => {
  const fixed = repairUnslashedText(DAMAGED, buildVocabulary([]));
  const paragraphs = fixed.split("\n\n");
  assert.equal(paragraphs.length, 5);
  assert.match(paragraphs[0], /^The paper market .* all benchmarks: no contango/);
  assert.match(paragraphs[0], /moved over USD 100 per tonne/);
  assert.match(paragraphs[0], /What comes next requires real demand to show up, and real demand is on holiday\.$/);
  assert.match(paragraphs[1], /^Egypt FOB at index 508\.5 with August bid .* the uncertainty perfectly\. .* Abu Qir just sold\.$/);
  assert.equal(paragraphs[2], "Paper buyers and paper sellers cannot agree on which end of that range is right.");
  assert.match(paragraphs[3], /materially above the current physical index of USD 442\.5, .* comes back properly\. Whether/);
  assert.match(paragraphs[4], /^MAP CFR Brazil running USD 820-870 .* USD 890 suggests the paper market/);
  assert.doesNotMatch(fixed, /[a-z]n[A-Z]|\bn\b/);
});

test("ordinary words with an n stay whole", () => {
  const text = "Tonnage is running against the contango.nAnother planting window in Indonesia, sentiment unchanged on the 22nd.";
  const fixed = repairUnslashedText(text, buildVocabulary(["Tonnage running planting window sentiment unchanged Another Indonesia"]));
  assert.equal(fixed, "Tonnage is running against the contango.\n\nAnother planting window in Indonesia, sentiment unchanged on the 22nd.");
});

test("clean text, and text that already has line breaks, is left alone", () => {
  const clean = "Urea firmed. Nothing else moved.";
  assert.equal(isUnslashedText(clean), false);
  assert.equal(repairUnslashedText(clean, buildVocabulary([])), clean);
  const edited = "First paragraph.nSecond\n\nThird.";
  assert.equal(repairUnslashedText(edited, buildVocabulary([])), edited);
});
