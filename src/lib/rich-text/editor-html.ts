import { HIGHLIGHT_HEX, TEXT_COLORS, listTrees, parseMarkdown, type Align, type Block, type Inline, type ListTree } from "@/lib/rich-text/markdown";

/** HTML for the admin editor's page. Plain tags with inline alignment and colour, the shapes the browser's own editing commands produce. */

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const alignAttr = (align?: Align) => (align && align !== "left" ? ` style="text-align: ${align}"` : "");

export function inlineHtml(nodes: Inline[], images = true): string {
  return nodes
    .map((node) => {
      switch (node.t) {
        case "text":
          return escape(node.v);
        case "br":
          return "<br>";
        case "code":
          return `<code>${escape(node.v)}</code>`;
        case "img":
          return images ? `<img src="${escape(node.src)}" alt="${escape(node.alt)}">` : escape(node.alt);
        case "link":
          return `<a href="${escape(node.href)}">${inlineHtml(node.c, images)}</a>`;
        case "color":
          return `<span style="color: ${TEXT_COLORS[node.color].hex}">${inlineHtml(node.c, images)}</span>`;
        case "mark":
          return `<span style="background-color: ${HIGHLIGHT_HEX}">${inlineHtml(node.c, images)}</span>`;
        default:
          return `<${node.t}>${inlineHtml(node.c, images)}</${node.t}>`;
      }
    })
    .join("");
}

function listHtml(tree: ListTree, images: boolean): string {
  const items = tree.items.map((item) => `<li>${inlineHtml(item.c, images) || "<br>"}${item.children.map((child) => listHtml(child, images)).join("")}</li>`).join("");
  if (tree.kind === "ul") return `<ul>${items}</ul>`;
  const start = tree.start !== 1 ? ` start="${tree.start}"` : "";
  const type = tree.kind === "ol" ? "" : ` type="${tree.kind}"`;
  return `<ol${type}${start}>${items}</ol>`;
}

function blockHtml(block: Block, images: boolean): string {
  switch (block.t) {
    case "p":
      return `<p${alignAttr(block.align)}>${inlineHtml(block.c, images) || "<br>"}</p>`;
    case "h":
      return `<h${block.level}${alignAttr(block.align)}>${inlineHtml(block.c, images) || "<br>"}</h${block.level}>`;
    case "list":
      return listTrees(block.items)
        .map((tree) => listHtml(tree, images))
        .join("");
    case "quote":
      return `<blockquote><p>${inlineHtml(block.c, images) || "<br>"}</p></blockquote>`;
    case "pre":
      return `<pre>${escape(block.v) || "<br>"}</pre>`;
    case "hr":
      return "<hr>";
    case "table": {
      const cell = (tag: "th" | "td", nodes: Inline[], c: number) => `<${tag}${alignAttr(block.align[c])}>${inlineHtml(nodes, images) || "<br>"}</${tag}>`;
      const width = Math.max(block.head.length, ...block.rows.map((row) => row.length));
      const pad = (row: Inline[][]) => Array.from({ length: width }, (_, c) => row[c] ?? []);
      const head = `<thead><tr>${pad(block.head)
        .map((nodes, c) => cell("th", nodes, c))
        .join("")}</tr></thead>`;
      const body = block.rows.length
        ? `<tbody>${block.rows
            .map(
              (row) =>
                `<tr>${pad(row)
                  .map((nodes, c) => cell("td", nodes, c))
                  .join("")}</tr>`,
            )
            .join("")}</tbody>`
        : "";
      return `<table>${head}${body}</table>`;
    }
  }
}

export function markdownToEditorHtml(markdown: string, images = true): string {
  const html = parseMarkdown(markdown)
    .map((block) => blockHtml(block, images))
    .join("");
  return html || "<p><br></p>";
}
