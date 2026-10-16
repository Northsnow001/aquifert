import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SITE_CONTENT } from "./defaults";
import { fillYear, isValidLink, isValidMedia, normalizePage, normalizeSiteContent, pickAnswer, splitLines, validatePage } from "./normalize";
import { SITE_PAGE_KEYS, SITE_SCHEMA, isShown, sectionOrder, type Field } from "./schema";

test("the launch wording passes validation on every page", () => {
  for (const key of SITE_PAGE_KEYS) assert.deepEqual(validatePage(key, DEFAULT_SITE_CONTENT[key]), [], key);
});

test("defaults hold exactly the fields the schema defines", () => {
  for (const key of SITE_PAGE_KEYS) {
    const page = DEFAULT_SITE_CONTENT[key] as unknown as Record<string, Record<string, unknown>>;
    for (const [sectionKey, section] of Object.entries(SITE_SCHEMA[key].sections)) {
      const fields = section.fields as Record<string, Field>;
      assert.deepEqual(Object.keys(page[sectionKey]).sort(), Object.keys(fields).sort(), `${key}.${sectionKey}`);
      for (const [fieldKey, field] of Object.entries(fields)) {
        if (field.kind !== "list") continue;
        for (const row of page[sectionKey][fieldKey] as Record<string, string>[]) assert.deepEqual(Object.keys(row).sort(), Object.keys(field.item).sort(), `${key}.${sectionKey}.${fieldKey}`);
      }
    }
  }
});

test("nothing saved means the launch wording", () => {
  assert.deepEqual(normalizeSiteContent(null), DEFAULT_SITE_CONTENT);
  assert.deepEqual(normalizeSiteContent({ home: "broken", meta: {} }), DEFAULT_SITE_CONTENT);
});

test("saved sections replace the defaults; missing ones keep them", () => {
  const home = normalizePage("home", { hero: { ...DEFAULT_SITE_CONTENT.home.hero, title: "  New headline  " } });
  assert.equal(home.hero.title, "New headline");
  assert.equal(home.hero.body, DEFAULT_SITE_CONTENT.home.hero.body);
  assert.deepEqual(home.faq, DEFAULT_SITE_CONTENT.home.faq);
});

test("an emptied optional field stays empty instead of reverting", () => {
  const home = normalizePage("home", { hero: { ...DEFAULT_SITE_CONTENT.home.hero, tertiaryLabel: "" } });
  assert.equal(home.hero.tertiaryLabel, "");
});

test("unsafe links and media fall back, lists are clipped and rows filled", () => {
  const home = normalizePage("home", {
    hero: { ...DEFAULT_SITE_CONTENT.home.hero, primaryLink: "javascript:alert(1)", video: "//evil.example/x.mp4", image: "http://insecure.example/a.jpg" },
    platform: { ...DEFAULT_SITE_CONTENT.home.platform, features: [{ title: "Only title", icon: "not-an-icon" }, "junk"] },
    faq: { ...DEFAULT_SITE_CONTENT.home.faq, items: Array.from({ length: 20 }, (_, i) => ({ q: `Q${i}`, a: "A" })) },
  });
  assert.equal(home.hero.primaryLink, DEFAULT_SITE_CONTENT.home.hero.primaryLink);
  assert.equal(home.hero.video, DEFAULT_SITE_CONTENT.home.hero.video);
  assert.equal(home.hero.image, DEFAULT_SITE_CONTENT.home.hero.image);
  assert.deepEqual(home.platform.features, [{ icon: "", title: "Only title", desc: "" }]);
  assert.equal(home.faq.items.length, 12);
});

test("paths with spaces are rejected so CMS typos like /pop up cannot 404", () => {
  assert.equal(isValidLink("/pop up"), false);
  assert.equal(isValidLink("pop up"), false);
  assert.equal(isValidLink("/hub/account/membership?plan=enterprise&from=aq-zero"), true);
  assert.equal(isValidLink("/hub/contact?topic=AQ%20Zero"), true);
  const zero = normalizePage("aqZero", {
    closing: { ...DEFAULT_SITE_CONTENT.aqZero.closing, secondaryLink: "/pop up", secondaryLabel: "Register Here" },
  });
  assert.equal(zero.closing.secondaryLink, DEFAULT_SITE_CONTENT.aqZero.closing.secondaryLink);
});

test("text is clipped to its limit and single-line fields lose line breaks", () => {
  const home = normalizePage("home", { hero: { ...DEFAULT_SITE_CONTENT.home.hero, title: `Line one\nline two ${"x".repeat(300)}` } });
  assert.ok(home.hero.title.length <= 160);
  assert.ok(!home.hero.title.includes("\n"));
});

test("validation names missing required fields, list limits and bad links", () => {
  const issues = validatePage("home", {
    ...DEFAULT_SITE_CONTENT.home,
    hero: { ...DEFAULT_SITE_CONTENT.home.hero, title: " ", primaryLink: "www.example.com" },
    faq: { ...DEFAULT_SITE_CONTENT.home.faq, items: [{ q: "Asked?", a: "" }] },
    platform: { ...DEFAULT_SITE_CONTENT.home.platform, features: [] },
  });
  assert.deepEqual(
    issues.map((issue) => [issue.section, issue.field, issue.row, issue.leaf]),
    [
      ["hero", "title", undefined, undefined],
      ["hero", "primaryLink", undefined, undefined],
      ["platform", "features", undefined, undefined],
      ["faq", "items", 0, "a"],
    ],
  );
  assert.match(issues[0].message, /Headline is required/);
});

test("sections can be hidden without losing their content", () => {
  const home = normalizePage("home", {
    faq: { ...DEFAULT_SITE_CONTENT.home.faq, title: "Kept while hidden", hidden: true },
    why: { ...DEFAULT_SITE_CONTENT.home.why, hidden: "yes" },
    seo: { ...DEFAULT_SITE_CONTENT.home.seo, hidden: true },
  });
  assert.equal(home.faq.hidden, true);
  assert.equal(home.faq.title, "Kept while hidden");
  assert.ok(!isShown(home.faq));
  assert.ok(isShown(home.why), "only a real true hides a section");
  assert.ok(!("hidden" in home.seo), "search settings cannot be hidden");
  const global = normalizePage("global", { header: { ...DEFAULT_SITE_CONTENT.global.header, hidden: true } });
  assert.ok(isShown(global.header), "the header cannot be hidden");
  assert.ok(!("hidden" in normalizePage("home", DEFAULT_SITE_CONTENT.home).hero), "visible sections carry no flag");
});

test("hidden sections are not checked until shown again", () => {
  const emptied = { ...DEFAULT_SITE_CONTENT.home.platform, title: "", features: [] };
  assert.equal(validatePage("home", { ...DEFAULT_SITE_CONTENT.home, platform: { ...emptied, hidden: true } }).length, 0);
  assert.deepEqual(
    validatePage("home", { ...DEFAULT_SITE_CONTENT.home, platform: emptied }).map((issue) => issue.field),
    ["title", "features"],
  );
});

test("menus need at least one link, and every link a name and a destination", () => {
  const header = DEFAULT_SITE_CONTENT.global.header;
  const issues = validatePage("global", {
    ...DEFAULT_SITE_CONTENT.global,
    header: { ...header, menu: [{ label: "", link: "/platform" }, { label: "News", link: "news" }] },
    footer: { ...DEFAULT_SITE_CONTENT.global.footer, firstLinks: [] },
  });
  assert.deepEqual(
    issues.map((issue) => [issue.section, issue.field, issue.row, issue.leaf]),
    [
      ["header", "menu", 0, "label"],
      ["header", "menu", 1, "link"],
    ],
  );
  assert.deepEqual(
    validatePage("global", { ...DEFAULT_SITE_CONTENT.global, header: { ...header, menu: [] } }).map((issue) => [issue.section, issue.field]),
    [["header", "menu"]],
  );
  const saved = normalizePage("global", { header: { ...header, menu: [{ label: "Prices", link: "https://example.com/prices" }] } });
  assert.deepEqual(saved.header.menu, [{ label: "Prices", link: "https://example.com/prices" }]);
  assert.deepEqual(saved.footer, DEFAULT_SITE_CONTENT.global.footer, "older saves without the menus get the launch menus");
});

test("saves from when inner pages had their own header keep only the shared header", () => {
  const older = {
    header: { ...DEFAULT_SITE_CONTENT.global.header, menu: [{ label: "AQ Suite", link: "/platform" }] },
    pageHeader: { menu: [{ label: "Membership", link: "/membership" }], signInLabel: "Sign in", startLabel: "Get started" },
    footer: { ...DEFAULT_SITE_CONTENT.global.footer, tagline: "Aquifert Ltd · London" },
  };
  const saved = normalizePage("global", older);
  assert.deepEqual(Object.keys(saved), ["header", "footer"]);
  assert.deepEqual(saved.header.menu, [{ label: "AQ Suite", link: "/platform" }]);
  assert.ok(!("tagline" in saved.footer));
  assert.equal(validatePage("global", older).length, 0);
});

test("hub plan pages keep a section order: the hero stays first, junk is dropped and new sections join the end", () => {
  assert.deepEqual(sectionOrder("aqZero"), ["hero", "notice", "programmes", "compare", "steps", "crossSell", "closing"]);
  const saved = normalizePage("aqZero", { _order: ["closing", "hero", "nope", "closing", "steps", 7] });
  assert.deepEqual(saved._order, ["closing", "steps", "notice", "programmes", "compare", "crossSell"]);
  assert.deepEqual(sectionOrder("aqZero", saved._order), ["hero", "closing", "steps", "notice", "programmes", "compare", "crossSell"]);
  assert.deepEqual(normalizePage("aqAnalytics", { _order: "plan" })._order, ["plan", "crossSell", "closing"]);
  assert.ok(!("_order" in normalizePage("home", { _order: ["faq"] })), "public pages keep their fixed layout");
});

test("the hub hero cannot be hidden, other hub sections can", () => {
  const page = normalizePage("aqZero", {
    hero: { ...DEFAULT_SITE_CONTENT.aqZero.hero, hidden: true },
    notice: { ...DEFAULT_SITE_CONTENT.aqZero.notice, hidden: true },
  });
  assert.ok(isShown(page.hero));
  assert.ok(!isShown(page.notice));
});

test("plan card defaults match the plans members can register for", () => {
  const cards = DEFAULT_SITE_CONTENT.aqZero.programmes;
  assert.equal(cards.sproutName, "AQ Zero Sprout");
  assert.ok(splitLines(cards.harvestFeatures).includes("Invoice financing up to £50k"));
  assert.equal(cards.scaleMissing, "");
  assert.equal(DEFAULT_SITE_CONTENT.aqAnalytics.plan.telexName, "AQ TELEX");
});

test("link and media rules", () => {
  for (const ok of ["", "/membership", "/membership#plans", "#plans", "mailto:desk@aquifert.com", "tel:+44 20 1234 5678", "https://www.linkedin.com/company/aquifert/"]) assert.ok(isValidLink(ok), ok);
  for (const bad of ["//evil.example", "javascript:alert(1)", "www.example.com", "mailto:nobody", "data:text/html,hi"]) assert.ok(!isValidLink(bad), bad);
  for (const ok of ["", "/media/port-terminal.mp4", "/site-media/abc-12345678.png", "https://cdn.example.com/clip.mp4"]) assert.ok(isValidMedia(ok), ok);
  for (const bad of ["/media/../secret", "/api/leads", "http://cdn.example.com/a.jpg", "javascript:alert(1)"]) assert.ok(!isValidMedia(bad), bad);
});

test("Aquibot picks the answer with the strongest keyword match", () => {
  const answers = DEFAULT_SITE_CONTENT.help.assistant.answers;
  const fallback = DEFAULT_SITE_CONTENT.help.assistant.fallback;
  assert.match(pickAnswer("How does shipment tracking work?", answers, fallback), /live shipment record/);
  assert.match(pickAnswer("What does membership cost?", answers, fallback), /flat fee/);
  assert.equal(pickAnswer("Tell me a joke", answers, fallback), fallback);
});

test("helpers", () => {
  assert.deepEqual(splitLines(" one \n\n two\r\nthree "), ["one", "two", "three"]);
  assert.equal(fillYear("© {year} Aquifert", 2031), "© 2031 Aquifert");
});
