import assert from "node:assert/strict";
import test from "node:test";
import { readZip } from "@/lib/aquibot-engine/office";
import type { Indicator } from "@/lib/content-types";
import { createZip } from "@/lib/zip";
import { enquiryTime, htmlToParagraphs, mapCollections, mapEnquiryPayload, mapFile, mapHedge, mapIndicators, mapTelex, parseExport, type WpExport } from "./map";

const base = { status: "publish", title: "", date: "2026-09-28 14:05:00", dateGmt: "2026-09-28 13:05:00", modified: "2026-09-28 15:00:00" };

function exportFile(extra: Record<string, unknown> = {}) {
  return { format: "aquifert-export", version: 1, site: "https://aquifert.com", download: { endpoint: "https://aquifert.com/wp-json/aquifert-export/v1/file/", token: "t", expiresAt: "2026-10-03T00:00:00Z" }, ...extra };
}

test("rejects files that are not an Aquifert export and fills gaps in partial ones", () => {
  assert.throws(() => parseExport({ hello: 1 }), /not an Aquifert export/);
  assert.throws(() => parseExport({ format: "aquifert-export", version: 2 }), /version 2/);
  const data: WpExport = parseExport(exportFile({ telex: [{ id: "5", content: "Hi", tags: ["Urea", 3] }], library: "nope" }));
  assert.equal(data.telex[0].id, 5);
  assert.deepEqual(data.telex[0].tags, ["Urea", "3"]);
  assert.deepEqual(data.library, []);
  assert.equal(data.indicators, null);
});

test("WordPress HTML becomes plain paragraphs with lists and entities intact", () => {
  const html = "<p>DAP firm &amp; steady.</p><p>Offers:<br>Brazil 410<br />India 395</p><ul><li>Urea up</li><li>MAP flat</li></ul>&nbsp;";
  assert.deepEqual(htmlToParagraphs(html), ["DAP firm & steady.", "Offers:\nBrazil 410\nIndia 395", "- Urea up\n- MAP flat"]);
  assert.deepEqual(htmlToParagraphs("Line one\r\n\r\nLine two\n| a | b |"), ["Line one", "Line two\n| a | b |"]);
  assert.deepEqual(htmlToParagraphs("<table><tr><td>DAP</td><td>410</td></tr><tr><td>MAP</td><td>395</td></tr></table>"), ["DAP | 410\nMAP | 395"]);
});

test("Telex keeps a real headline but drops the title WordPress generated from the first words", () => {
  const content = "Brazil urea enquiry returns for October laycan with firm offers from the AG.";
  const generated = mapTelex({ ...base, id: 7, title: "Brazil urea enquiry returns for October laycan with", content, author: "", tags: ["Urea"] }, "public");
  assert.equal(generated.id, "wp-telex-7");
  assert.equal(generated.headline, "");
  assert.equal(generated.publishedAt, "2026-09-28T14:05");
  assert.equal(generated.status, "published");
  assert.equal(generated.author, "Aquifert Desk");
  const titled = mapTelex({ ...base, id: 8, status: "draft", title: "Brazil returns", content, author: "Desk", tags: [] }, "growth");
  assert.equal(titled.headline, "Brazil returns");
  assert.equal(titled.status, "draft");
  assert.equal(titled.access, "growth");
});

test("hedge rows group into sections and commodities like the WordPress template", () => {
  const report = mapHedge({
    ...base,
    id: 12,
    title: "Hedge 28 Sep",
    content: "",
    data: {
      date: "2026-09-27",
      narrative: "Paper firmer.",
      rows: [
        { type: "section", label: "International" },
        { type: "commodity", label: "Urea Egypt", index: "Index 410" },
        { type: "price", period: "Oct-26", bid: "400", ask: "410", dir: "↑" },
        { type: "price", period: "Nov-26*", bid: "395", ask: "405", dir: "down" },
        { type: "section", label: "US Markets" },
        { type: "price", period: "Oct", bid: "350", ask: "360" },
      ],
    },
  });
  assert.equal(report.id, "wp-hedge-12");
  assert.equal(report.date, "2026-09-27");
  assert.equal(report.narrative, "Paper firmer.");
  assert.equal(report.sections.length, 2);
  assert.equal(report.sections[0].commodities[0].index, "Index 410");
  assert.deepEqual(
    report.sections[0].commodities[0].rows.map((row) => [row.period, row.dir]),
    [
      ["Oct-26", "up"],
      ["Nov-26", "down"],
    ],
  );
  assert.equal(report.sections[1].commodities[0].label, "Market");
});

test("indicators update the three dials and keep the hub caption", () => {
  const current: Indicator[] = [
    { name: "Nitrogen", value: 50, summary: "Caption N", note: "old" },
    { name: "Phosphate", value: 40, summary: "Caption P", note: "old" },
    { name: "Potassium", value: 30, summary: "Caption K", note: "old" },
  ];
  const next = mapIndicators({ ...base, id: 1, nitrogen: { value: 72.6, note: "Firm" }, phosphate: { value: null, note: "" }, potassium: { value: 140, note: "Tight" } }, current);
  assert.deepEqual(
    next.map((item) => [item.value, item.note, item.summary]),
    [
      [73, "Firm", "Caption N"],
      [40, "old", "Caption P"],
      [100, "Tight", "Caption K"],
    ],
  );
});

test("files map collections, MemberPress products and keep an earlier download", () => {
  const collections = mapCollections([
    { id: 3, name: "Reports &amp; Data", slug: "reports", parent: 0, description: "", private: false },
    { id: 4, name: "Weekly", slug: "weekly", parent: 3, description: "", private: true },
  ]);
  assert.equal(collections[0].name, "Reports & Data");
  assert.equal(collections[1].parentId, "wp-col-3");
  const ids = new Set(collections.map((item) => item.id));
  const file = { ...base, id: 90, title: "Week 38 AQ View", filename: "Week-38-2026.pdf", mime: "application/pdf", bytes: 2_831_155, missing: false, caption: "", description: "<p>Weekly report.</p>", collections: [4, 99], productId: 55, author: "Kayode" };
  const doc = mapFile(file, { "55": "enterprise" }, ids);
  assert.equal(doc.id, "wp-file-90");
  assert.deepEqual(doc.collectionIds, ["wp-col-4"]);
  assert.equal(doc.type, "PDF");
  assert.equal(doc.size, "2.7 MB");
  assert.equal(doc.updated, "28 Sep 2026");
  assert.equal(doc.summary, "Weekly report.");
  assert.equal(doc.access, "enterprise");
  assert.equal(doc.storedName, null);
  const again = mapFile({ ...file, productId: 0 }, {}, ids, { ...doc, storedName: "Week-38-2026.pdf", private: true });
  assert.equal(again.access, "public");
  assert.equal(again.storedName, "Week-38-2026.pdf");
  assert.equal(again.private, true);
});

test("the plugin zip holds the file under its plugin folder", () => {
  const php = Buffer.from("<?php\n/* Plugin Name: Test */\n".repeat(50));
  const archive = readZip(createZip([{ name: "aquifert-export/aquifert-export.php", data: php }]));
  assert.deepEqual(archive.names(), ["aquifert-export/aquifert-export.php"]);
  assert.equal(archive.read("aquifert-export/aquifert-export.php"), php.toString());
});

test("enquiries keep the real submission time and drop empty fields", () => {
  const item = { ...base, id: 4, content: "", payload: { user_name: "Ada", qty: "5000", notes: "" } };
  assert.equal(enquiryTime(item), "2026-09-28T13:05:00Z");
  assert.deepEqual(mapEnquiryPayload(item), { user_name: "Ada", qty: "5000", source: "WordPress" });
});
