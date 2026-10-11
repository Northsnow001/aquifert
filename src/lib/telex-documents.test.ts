import assert from "node:assert/strict";
import test from "node:test";
import { telexView } from "./aq-modules/telex";
import { TELEX_DOC_LIMIT, checkTelexDocFile, parseTelexDocList, telexDocHref, telexDocTitle, telexDocView, type TelexItem } from "./content-types";

test("telex documents accept office files, PDFs and pictures, and refuse anything a browser could run", () => {
  assert.deepEqual(checkTelexDocFile("Urea outlook Q4.pdf", 1024), { name: "Urea outlook Q4.pdf" });
  assert.deepEqual(checkTelexDocFile("C:\\fakepath\\prices.xlsx", 10), { name: "prices.xlsx" });
  assert.deepEqual(checkTelexDocFile("tender: Nov/Dec.docx", 10), { name: "Dec.docx" });
  for (const name of ["page.html", "logo.svg", "run.exe", "notes", "script.js"]) assert.ok("error" in checkTelexDocFile(name, 10), name);
  assert.match((checkTelexDocFile("big.pdf", 51 * 1024 * 1024) as { error: string }).error, /50 MB/);
});

test("a document title reads like the file name without its extension", () => {
  assert.equal(telexDocTitle("India_urea_tender_results.pdf"), "India urea tender results");
  assert.equal(telexDocTitle(".pdf"), "Document");
});

test("documents open in the app when the browser can show them", () => {
  assert.equal(telexDocView("brief.PDF"), "pdf");
  assert.equal(telexDocView("vessel.jpeg"), "image");
  assert.equal(telexDocView("prices.xlsx"), "download");
  assert.equal(telexDocHref("tx-1", { id: "txd-abc1" }, true), "/hub/telex/tx-1/documents/txd-abc1?inline=1");
});

test("the editor's document list is cleaned before it is saved", () => {
  const raw = JSON.stringify([
    { id: "txd-abc123", name: "brief.pdf", title: "  Urea   brief " },
    { id: "txd-abc123", name: "brief.pdf", title: "repeat" },
    { id: "../etc", name: "brief.pdf", title: "bad id" },
    { id: "txd-def456", name: "../secret.pdf", title: "bad name" },
    { id: "txd-ghi789", name: "page.html", title: "bad type" },
    { id: "txd-jkl012", name: "prices.xlsx", title: "" },
    "junk",
  ]);
  assert.deepEqual(parseTelexDocList(raw), [
    { id: "txd-abc123", name: "brief.pdf", title: "Urea brief" },
    { id: "txd-jkl012", name: "prices.xlsx", title: "prices" },
  ]);
  assert.deepEqual(parseTelexDocList("not json"), []);
  const many = JSON.stringify(Array.from({ length: 9 }, (_, i) => ({ id: `txd-doc${i}0`, name: `f${i}.pdf`, title: "" })));
  assert.equal(parseTelexDocList(many).length, TELEX_DOC_LIMIT);
});

test("the hub view carries a flash's documents, and older flashes have none", () => {
  const item: TelexItem = {
    id: "tx-1",
    headline: "Urea",
    paragraphs: ["Prices firm."],
    tags: [],
    access: "growth",
    status: "published",
    author: "Desk",
    publishedAt: "2026-10-11T09:00",
    updatedAt: "2026-10-11T09:00",
  };
  assert.deepEqual(telexView(item, "core").documents, []);
  const doc = { id: "txd-abc123", name: "brief.pdf", title: "Brief", size: 2048 };
  const view = telexView({ ...item, documents: [doc] }, "core");
  assert.deepEqual(view.documents, [doc]);
  assert.equal(view.readable, false);
});
