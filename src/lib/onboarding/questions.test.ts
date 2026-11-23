import assert from "node:assert/strict";
import test from "node:test";
import { answerTerms, interestsFrom, matchesFeed, parseQuestions, resolveQuestions, type OnboardingQuestion } from "./questions";

const interests = { countries: ["Brazil"], tags: ["urea"], categories: ["Nitrogen"] };

test("a flash matches a chosen country, tag or category", () => {
  assert.equal(matchesFeed({ text: "Brazil urea tender", tags: [], category: "General" }, interests), true);
  assert.equal(matchesFeed({ text: "Quiet week", tags: ["Urea"], category: "General" }, interests), true);
  assert.equal(matchesFeed({ text: "Potash steady", tags: ["MOP"], category: "Potash" }, interests), false);
  assert.equal(matchesFeed({ text: "Anything", tags: [], category: "General" }, { countries: [], tags: [], categories: [] }), true);
});

test("product and region answers widen the match", () => {
  assert.equal(matchesFeed({ text: "Sulphur firmer in the Middle East", tags: [], category: "General" }, { countries: [], tags: [], categories: [] }, ["Sulphur", "Middle East"]), true);
});

test("interest questions survive a save that drops them", () => {
  const parsed = parseQuestions({ questions: [{ id: "products", prompt: "Products?", kind: "multi", required: true, enabled: true, options: ["Urea"] }] });
  assert.deepEqual(
    parsed.map((item) => item.id),
    ["products", "countries", "tags", "categories"],
  );
});

test("live lists fill the interest questions and empty lists drop out", () => {
  const questions: OnboardingQuestion[] = parseQuestions(null);
  const resolved = resolveQuestions(questions, { countries: ["Brazil"], tags: [], categories: ["Nitrogen"] });
  assert.equal(resolved.find((item) => item.id === "countries")?.options[0], "Brazil");
  assert.equal(resolved.some((item) => item.id === "tags"), false);
  const answers = { countries: ["Brazil"], categories: ["Nitrogen"], products: ["Urea"] };
  assert.deepEqual(interestsFrom(resolved, answers).countries, ["Brazil"]);
  assert.deepEqual(answerTerms(resolved, answers), ["Urea"]);
});
