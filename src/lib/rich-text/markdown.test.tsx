import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "@/components/hub/markdown";
import { plainText } from "@/lib/content-types";
import { markdownToEditorHtml } from "@/lib/rich-text/editor-html";
import { escapeText, isHighlight, paletteColor } from "@/lib/rich-text/from-dom";
import { inlineText, parseInline, parseMarkdown } from "@/lib/rich-text/markdown";

const html = (text: string) => renderToStaticMarkup(<Markdown text={text} />);

test("lettered items become one list, even with blank lines between them", () => {
  const out = html("Tender terms:\n\na) Closes 14 October\n\nb) Shipment by 30 November\n\nc) Both coasts");
  assert.equal(out.match(/<ol/g)?.length, 1);
  assert.match(out, /<ol class="[^"]*list-\[aq-lower-paren\]/);
  assert.equal(out.match(/<li/g)?.length, 3);
  assert.match(out, /<li[^>]*>Shipment by 30 November<\/li>/);
});

test("'A.' only starts a list when the next line is lettered too", () => {
  assert.equal(parseMarkdown("A. Smith said prices firm.")[0].t, "p");
  const list = parseMarkdown("A. First\nB. Second")[0];
  assert.equal(list.t, "list");
  assert.deepEqual(list.t === "list" ? list.items.map((item) => [item.kind, item.n]) : [], [
    ["A", 1],
    ["A", 2],
  ]);
});

test("two spaces nest a list level and numbering keeps its start", () => {
  const out = html("3. Egypt\n  - Abu Qir\n  - Damietta\n4. Algeria");
  assert.match(out, /<ol start="3"/);
  assert.match(out, /<li[^>]*>Egypt<ul class="[^"]*list-\[circle\]/);
  assert.equal(out.match(/<li/g)?.length, 4);
});

test("toolbar formatting renders for members", () => {
  const out = html("++under++ ~~gone~~ ==key== [up]{.green} P~2~O~5~ m^3^");
  assert.match(out, /<u[^>]*>under<\/u>/);
  assert.match(out, /<s>gone<\/s>/);
  assert.match(out, /<mark[^>]*>key<\/mark>/);
  assert.match(out, /<span style="color:#15803d">up<\/span>/);
  assert.match(out, /P<sub>2<\/sub>O<sub>5<\/sub>/);
  assert.match(out, /m<sup>3<\/sup>/);
});

test("alignment applies to paragraphs and headings", () => {
  const out = html("## Outlook {.center}\n\nPrices hold. {.justify}");
  assert.match(out, /<h3 class="[^"]*text-center[^"]*">Outlook<\/h3>/);
  assert.match(out, /<p class="[^"]*text-justify[^"]*">Prices hold.<\/p>/);
});

test("prices and ranges stay plain text", () => {
  for (const line of ["USD 400~410 and 420~430", "C++ and C++ code", "a == b", "2^10 bits", "snake_case_name"]) {
    assert.equal(inlineText(parseInline(line)), line, line);
  }
});

test("escaped text reads back exactly", () => {
  for (const line of ["**not bold**", "_x_ and *y*", "[text]{.red}", "H~2~O", "==no==", "++no++", "a|b", "back\\slash", "{.center}"]) {
    assert.equal(inlineText(parseInline(escapeText(line))), line, line);
  }
});

test("plain text drops the new syntax for excerpts and search", () => {
  assert.equal(plainText("## Outlook {.center}\n\na) ==Firm== [bids]{.red}\nb) ++Thin++ ~~offers~~"), "Outlook Firm bids Thin offers");
});

test("editor HTML uses the shapes the browser's editing commands produce", () => {
  const out = markdownToEditorHtml("## Head {.right}\n\na) one\nb) two\n\n==hi== [x]{.blue}\n\n| A | B |\n|:-:|--:|\n| 1 | 2 |");
  assert.match(out, /<h2 style="text-align: right">Head<\/h2>/);
  assert.match(out, /<ol type="a"><li>one<\/li><li>two<\/li><\/ol>/);
  assert.match(out, /<span style="background-color: #fde68a">hi<\/span>/);
  assert.match(out, /<span style="color: #1d4ed8">x<\/span>/);
  assert.match(out, /<th style="text-align: center">A<\/th><th style="text-align: right">B<\/th>/);
  assert.equal(markdownToEditorHtml(""), "<p><br></p>");
});

test("pasted colours snap to the palette; black and white do not count", () => {
  assert.equal(paletteColor("rgb(255, 0, 0)"), "red");
  assert.equal(paletteColor("#0070c0"), "blue");
  assert.equal(paletteColor("#00b050"), "green");
  assert.equal(paletteColor("rgb(0, 0, 0)"), null);
  assert.equal(paletteColor("#1f2937"), null);
  assert.equal(paletteColor("#16304d"), null);
  assert.equal(paletteColor("#002060"), "blue");
  assert.equal(paletteColor("#7f7f7f"), "grey");
  assert.equal(isHighlight("rgb(255, 255, 0)"), true);
  assert.equal(isHighlight("rgb(255, 255, 255)"), false);
  assert.equal(isHighlight("rgba(0, 0, 0, 0)"), false);
});
