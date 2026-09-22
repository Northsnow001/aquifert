/** Minimal Markdown block parser for desk-generated reports (headings, tables, hr, paragraphs). */

export type MdBlock =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "hr" }
  | { type: "p"; text: string };

export function parseMarkdown(md: string): MdBlock[] {
  const lines = md.split("\n");
  const blocks: MdBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) { i++; continue; }
    if (t.startsWith("### ")) { blocks.push({ type: "h3", text: t.slice(4) }); i++; continue; }
    if (t.startsWith("## ")) { blocks.push({ type: "h2", text: t.slice(3) }); i++; continue; }
    if (t.startsWith("# ")) { blocks.push({ type: "h1", text: t.slice(2) }); i++; continue; }
    if (/^-{3,}$/.test(t)) { blocks.push({ type: "hr" }); i++; continue; }
    if (t.startsWith("|")) {
      const tbl: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { tbl.push(lines[i].trim()); i++; }
      const cells = (r: string) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const header = cells(tbl[0]);
      const rows = tbl.slice(1).filter((r) => !/^\|[\s\-|:]+\|$/.test(r)).map(cells);
      blocks.push({ type: "table", header, rows });
      continue;
    }
    // paragraph: gather until blank/heading/table/hr
    const para: string[] = [t];
    i++;
    while (i < lines.length) {
      const n = lines[i].trim();
      if (!n || n.startsWith("#") || n.startsWith("|") || /^-{3,}$/.test(n)) break;
      para.push(n);
      i++;
    }
    blocks.push({ type: "p", text: para.join(" ").replace(/ {2,}/g, " ") });
  }
  return blocks;
}

/** Strip Markdown emphasis markers for plain-text output (PDF). */
export function mdPlain(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`([^`]+)`/g, "$1");
}
