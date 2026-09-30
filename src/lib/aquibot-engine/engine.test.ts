import assert from "node:assert/strict";
import test from "node:test";
import { deflateRawSync } from "node:zlib";
import { chunkText, stripChunkLabel } from "./chunking";
import { describeRange, formatDateRangeSection, isoWeekOf, resolveDateRanges } from "./dates";
import { docxText, xlsxText } from "./office";
import { countKeywordHits, detectIntent, geoTerms, keywordTokens } from "./query";

const NOW = Date.UTC(2026, 8, 30, 10, 0); // Wednesday 30 Sep 2026
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const resolve = (text: string) => resolveDateRanges(text, 30, NOW).ranges.map((range) => ({ kind: range.kind, from: day(range.start), to: day(range.end), ambiguous: range.ambiguous }));

test("chunks stay under the size, overlap, keep whole words and carry the label", () => {
  const text = Array.from({ length: 400 }, (_, i) => `word${i}`).join(" ");
  const chunks = chunkText(text, { label: "Week 38 2026", maxChunks: 50 });
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) {
    assert.ok(chunk.startsWith("[Week 38 2026] "));
    assert.ok(stripChunkLabel(chunk).length <= 1300);
    assert.match(stripChunkLabel(chunk), /^word\d+/);
  }
  const firstEnd = stripChunkLabel(chunks[0]).split(" ").pop()!;
  assert.ok(stripChunkLabel(chunks[1]).includes(firstEnd), "consecutive chunks overlap");
});

test("weekly files use small chunks and short text becomes one chunk", () => {
  const text = "Urea granular Egypt FOB 420-430. ".repeat(60);
  assert.ok(chunkText(text, { label: "x", maxChunks: 100, weekly: true }).every((chunk) => stripChunkLabel(chunk).length <= 450));
  assert.deepEqual(chunkText("Short note", { label: "Telex", maxChunks: 5 }), ["[Telex] Short note"]);
  assert.equal(chunkText("a ".repeat(5000), { label: "x", maxChunks: 3 }).length, 3);
});

test("relative weeks, months and days resolve against today", () => {
  assert.deepEqual(resolve("urea prices last week"), [{ kind: "week", from: "2026-09-21", to: "2026-09-27", ambiguous: false }]);
  assert.deepEqual(resolve("what happened this week"), [{ kind: "week", from: "2026-09-28", to: "2026-10-04", ambiguous: false }]);
  assert.deepEqual(resolve("the week before last"), [{ kind: "week", from: "2026-09-14", to: "2026-09-20", ambiguous: false }]);
  assert.deepEqual(resolve("DAP last month"), [{ kind: "month", from: "2026-08-01", to: "2026-08-31", ambiguous: false }]);
  assert.deepEqual(resolve("news from yesterday"), [{ kind: "day", from: "2026-09-29", to: "2026-09-29", ambiguous: false }]);
  assert.deepEqual(resolve("last quarter"), [{ kind: "quarter", from: "2026-04-01", to: "2026-06-30", ambiguous: false }]);
});

test("explicit weeks, quarters, months and dates", () => {
  assert.deepEqual(resolve("week 21 2025"), [{ kind: "week", from: "2025-05-19", to: "2025-05-25", ambiguous: false }]);
  assert.deepEqual(resolve("2026-W01"), [{ kind: "week", from: "2025-12-29", to: "2026-01-04", ambiguous: false }]);
  assert.deepEqual(resolve("week 38"), [{ kind: "week", from: "2026-09-14", to: "2026-09-20", ambiguous: true }]);
  assert.deepEqual(resolve("Q1 2026 demand"), [{ kind: "quarter", from: "2026-01-01", to: "2026-03-31", ambiguous: false }]);
  assert.deepEqual(resolve("prices in March 2026"), [{ kind: "month", from: "2026-03-01", to: "2026-03-31", ambiguous: false }]);
  assert.deepEqual(resolve("5 May 2026"), [{ kind: "day", from: "2026-05-05", to: "2026-05-05", ambiguous: false }]);
  assert.deepEqual(resolve("2026-05-19"), [{ kind: "day", from: "2026-05-19", to: "2026-05-19", ambiguous: false }]);
  assert.deepEqual(resolve("on Dec 3"), [{ kind: "day", from: "2025-12-03", to: "2025-12-03", ambiguous: true }]);
});

test("a bare month after a time word means its most recent occurrence, and 'may' stays a verb", () => {
  assert.deepEqual(resolve("urea prices in March"), [{ kind: "month", from: "2026-03-01", to: "2026-03-31", ambiguous: true }]);
  assert.deepEqual(resolve("what happened during November"), [{ kind: "month", from: "2025-11-01", to: "2025-11-30", ambiguous: true }]);
  assert.deepEqual(resolve("DAP last September"), [{ kind: "month", from: "2025-09-01", to: "2025-09-30", ambiguous: true }]);
  assert.deepEqual(resolve("since early Aug"), [{ kind: "month", from: "2026-08-01", to: "2026-08-31", ambiguous: true }]);
  assert.deepEqual(resolve("prices may rise in the market"), []);
});

test("this time last year gives the prior-year ISO week plus trend weeks", () => {
  const ranges = resolveDateRanges("DAP India this time last year", 30, NOW).ranges;
  assert.equal(ranges.length, 3);
  assert.equal(isoWeekOf(ranges[0].start).year, 2025);
  assert.equal(isoWeekOf(ranges[0].start).week, isoWeekOf(NOW).week);
  assert.ok(ranges.every((range) => range.kind === "week"));
});

test("product grades and decimals are not read as dates", () => {
  assert.deepEqual(resolve("MAP 11-52-0 and DAP 18-46-0 specs"), []);
  assert.deepEqual(resolve("urea at 3.5 percent nitrogen loss"), []);
  assert.deepEqual(resolve("ship in 1-2 weeks"), []);
});

test("date range section matches the WordPress wording", () => {
  assert.match(formatDateRangeSection(null), /^## DETECTED DATE RANGE\nNo specific date range detected\./);
  const section = formatDateRangeSection(resolveDateRanges("last week", 30, NOW));
  assert.match(section, /Range 1: 2026-09-21 to 2026-09-27 \(kind=week, label=week_2026_w39, phrase="last week"\)/);
  assert.match(section, /Grace window: ±30 days/);
  assert.match(describeRange({ start: Date.UTC(2026, 8, 21), end: Date.UTC(2026, 8, 27, 23, 59, 59), kind: "week" }), /^21 Sept? – 27 Sept? 2026$/);
});

test("intent priority is technical, then price, then news", () => {
  assert.deepEqual(detectIntent("How is urea made and what is its purity?"), { intent: "technical", technicalSubtype: "compound_spec_and_process" });
  assert.equal(detectIntent("DAP spec sheet").intent, "technical");
  assert.equal(detectIntent("urea FOB Egypt price").intent, "price");
  assert.equal(detectIntent("latest market news").intent, "news");
  assert.equal(detectIntent("who supplies Nigeria").intent, "general");
});

test("keyword tokens drop stop words and credit phrases double", () => {
  const keywords = keywordTokens("what is the granular urea price in Egypt this week", ["this week", "week"]);
  assert.deepEqual(keywords, ["granular", "urea", "price", "egypt"]);
  assert.equal(countKeywordHits("Granular urea was offered in Egypt", keywords), 3 + 2);
  assert.deepEqual(keywordTokens("DAP CFR India", []), ["dap", "cfr", "india"]);
  assert.deepEqual(geoTerms("urea from the Black Sea to Brazil"), ["black sea", "brazil"]);
});

function zip(files: Record<string, string>) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = deflateRawSync(Buffer.from(content, "utf8"));
    const nameBuf = Buffer.from(name, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, data);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

test("xlsx sheets become Markdown tables with shared strings", () => {
  const file = zip({
    "xl/workbook.xml": '<workbook><sheets><sheet name="Prices" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/sharedStrings.xml": "<sst><si><t>Product</t></si><si><t>Price</t></si><si><r><t>Urea </t></r><r><t>Egypt</t></r></si></sst>",
    "xl/worksheets/sheet1.xml":
      '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="C2"><v>425</v></c></row></sheetData></worksheet>',
  });
  assert.equal(xlsxText(file), "## Sheet: Prices\n| Product | Price |\n| --- | --- |\n| Urea Egypt |  | 425 |");
});

test("docx paragraphs are read in order", () => {
  const file = zip({ "word/document.xml": "<w:document><w:body><w:p><w:r><w:t>DAP 18-46-0</w:t></w:r></w:p><w:p><w:r><w:t xml:space=\"preserve\">Made from </w:t></w:r><w:r><w:t>phosphoric acid &amp; ammonia</w:t></w:r></w:p></w:body></w:document>" });
  assert.equal(docxText(file), "DAP 18-46-0\nMade from phosphoric acid & ammonia");
});
