import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { plainText } from "@/lib/content-types";
import { Markdown } from "./markdown";

const html = (text: string, images = false) => renderToStaticMarkup(<Markdown text={text} images={images} />);

test("telex markdown renders rules, headings, quotes, code and lists", () => {
  const out = html("## Urea\n\nFirst **bold** and *soft*.\n\n---\n\n> Desk view\n\n- one\n- two\n\n```\nline 1\n\nline 2\n```");
  assert.match(out, /<p class="pt-1 font-bold[^"]*">Urea<\/p>/);
  assert.match(out, /<strong[^>]*>bold<\/strong>/);
  assert.match(out, /<em>soft<\/em>/);
  assert.match(out, /<hr/);
  assert.match(out, /<blockquote[^>]*>Desk view<\/blockquote>/);
  assert.match(out, /<ul[^>]*><li[^>]*>one<\/li><li[^>]*>two<\/li><\/ul>/);
  assert.match(out, /<pre[^>]*>line 1\n\nline 2<\/pre>/);
});

test("pipe tables honour :--- alignment", () => {
  const out = html("| Port | Price | Change |\n|:---|---:|:---:|\n| Egypt | 480 | +5 |");
  assert.match(out, /<th class="[^"]*text-left">Port<\/th><th class="[^"]*text-right">Price<\/th><th class="[^"]*text-center">Change<\/th>/);
  assert.match(out, /<td class="[^"]*text-right">480<\/td>/);
});

test("images render only when allowed and only from https", () => {
  assert.match(html("![chart](https://example.com/c.png)", true), /<img src="https:\/\/example.com\/c.png" alt="chart"/);
  assert.doesNotMatch(html("![chart](https://example.com/c.png)"), /<img/);
  assert.doesNotMatch(html("![chart](http://example.com/c.png)", true), /<img/);
});

test("plain text drops markdown syntax for headlines and excerpts", () => {
  assert.equal(plainText("## **Urea** firms\n\n- [Egypt](https://x.io) up\n\n| A | B |\n|---|---|\n| 1 | 2 |"), "Urea firms Egypt up A B 1 2");
});
