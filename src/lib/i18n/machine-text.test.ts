import assert from "node:assert/strict";
import test from "node:test";
import { acceptTranslations, batchTexts, fillTemplate, parseTranslationArray, protectTerms, restoreTerms, toTemplate } from "./machine-text";

test("brand names and trade codes are shielded from the translator and put back", () => {
  const shielded = protectTerms("Ask Aquibot about MAP CFR Brazil at USD {0}/t, or open AQ Analytics.");
  assert.equal(shielded.text, "Ask {500} about {501} {502} Brazil at {503} {0}/t, or open {504}.");
  assert.deepEqual(shielded.terms, ["Aquibot", "MAP", "CFR", "USD", "AQ Analytics"]);
  assert.equal(restoreTerms("Demandez à {500} : {501} {502} Brésil à {0} {503}/t, ou ouvrez {504}.", shielded.terms), "Demandez à Aquibot : MAP CFR Brésil à {0} USD/t, ou ouvrez AQ Analytics.");
  assert.deepEqual(protectTerms("Mapping the desk").terms, []);
  assert.deepEqual(protectTerms("Price in USD/t").terms, ["USD/t"]);
});

test("numbers become placeholders so prices and dates share one translation", () => {
  assert.deepEqual(toTemplate("Brunei near USD 400 against USD 410 FOB."), { key: "Brunei near USD {0} against USD {1} FOB.", numbers: ["400", "410"] });
  assert.deepEqual(toTemplate("Updated 28 Sep 2026, 03:58"), { key: "Updated {0} Sep {1}, {2}", numbers: ["28", "2026", "03:58"] });
  assert.deepEqual(toTemplate("USD 1,700 per tonne"), { key: "USD {0} per tonne", numbers: ["1,700"] });
  assert.deepEqual(toTemplate("No numbers here"), { key: "No numbers here", numbers: [] });
  const prose = "MAP CFR Brazil is running USD 820–870 through August and September against a physical index of USD 890.";
  assert.deepEqual(toTemplate(prose), { key: prose, numbers: [] });
});

test("filled templates put the numbers back, even when the grammar reorders them", () => {
  assert.equal(fillTemplate("约 USD {0}，对比 USD {1} FOB。", ["400", "410"]), "约 USD 400，对比 USD 410 FOB。");
  assert.equal(fillTemplate("更新于 {1}年9月{0}日 {2}", ["28", "2026", "03:58"]), "更新于 2026年9月28日 03:58");
  assert.equal(fillTemplate("{3} stays when missing", ["1"]), "{3} stays when missing");
  assert.equal(fillTemplate("Prix \u200b\u200bà la ferme", []), "Prix à la ferme");
});

test("the model reply must be a JSON array of the same length", () => {
  assert.deepEqual(parseTranslationArray('["市场指标","运费报价"]', 2), ["市场指标", "运费报价"]);
  assert.deepEqual(parseTranslationArray('```json\n["a","b"]\n```', 2), ["a", "b"]);
  assert.equal(parseTranslationArray('["only one"]', 2), null);
  assert.equal(parseTranslationArray('{"a":"b"}', 1), null);
  assert.equal(parseTranslationArray("not json", 1), null);
  assert.equal(parseTranslationArray("[1, 2]", 2), null);
});

test("translations that lose or invent a placeholder are dropped", () => {
  const sources = ["USD {0} against USD {1}", "Market Indicators", "Updated {0}", "Empty"];
  const translated = ["USD {1} 对比 USD {0}", "市场指标", "已更新", "  "];
  assert.deepEqual(acceptTranslations(sources, translated), { "USD {0} against USD {1}": "USD {1} 对比 USD {0}", "Market Indicators": "市场指标" });
});

test("batches respect both the item count and the character budget", () => {
  assert.deepEqual(batchTexts(["a", "b", "c", "d", "e"], 2, 100), [["a", "b"], ["c", "d"], ["e"]]);
  assert.deepEqual(batchTexts(["aaaa", "bbbb", "cc"], 10, 6), [["aaaa"], ["bbbb", "cc"]]);
  assert.deepEqual(batchTexts(["longer than the budget"], 10, 5), [["longer than the budget"]]);
  assert.deepEqual(batchTexts([], 10, 5), []);
});
