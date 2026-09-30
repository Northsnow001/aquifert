import { inflateRawSync } from "zlib";

const XLSX_MAX_SHEETS = 8;
const XLSX_MAX_ROWS = 1000;
const XLSX_MAX_ROWS_PER_SHEET = 250;
const XLSX_MAX_CELL_CHARS = 200;

type ZipEntry = { method: number; size: number; offset: number };

/** Minimal ZIP reader for Office Open XML files (stored or deflated entries). */
export function readZip(buffer: Buffer) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65_557); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("The file is not a valid Office document.");
  const count = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  const entries = new Map<string, ZipEntry>();
  for (let n = 0; n < count && buffer.readUInt32LE(cursor) === 0x02014b50; n += 1) {
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const name = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    entries.set(name, { method: buffer.readUInt16LE(cursor + 10), size: buffer.readUInt32LE(cursor + 20), offset: buffer.readUInt32LE(cursor + 42) });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return {
    names: () => Array.from(entries.keys()),
    read(name: string) {
      const entry = entries.get(name);
      if (!entry) return null;
      const start = entry.offset + 30 + buffer.readUInt16LE(entry.offset + 26) + buffer.readUInt16LE(entry.offset + 28);
      const data = buffer.subarray(start, start + entry.size);
      if (entry.method === 0) return data.toString("utf8");
      if (entry.method === 8) return inflateRawSync(data).toString("utf8");
      return null;
    },
  };
}

export function decodeXml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function attributes(tag: string) {
  const out: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:]+)="([^"]*)"/g)) out[match[1]] = decodeXml(match[2]);
  return out;
}

function runText(xml: string, tag: string) {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "g");
  return Array.from(xml.matchAll(pattern), (match) => decodeXml(match[1])).join("");
}

function columnIndex(ref: string) {
  const letters = ref.replace(/\d+/g, "").toUpperCase();
  let index = 0;
  for (const char of letters) index = index * 26 + (char.charCodeAt(0) - 64);
  return index - 1;
}

export function xlsxText(buffer: Buffer) {
  const zip = readZip(buffer);
  const shared = Array.from((zip.read("xl/sharedStrings.xml") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g), (match) => runText(match[1], "t"));
  const rels = new Map<string, string>();
  for (const match of (zip.read("xl/_rels/workbook.xml.rels") ?? "").matchAll(/<Relationship\s[^>]*>/g)) {
    const attrs = attributes(match[0]);
    if (attrs.Id && attrs.Target) rels.set(attrs.Id, attrs.Target.replace(/^\/?(xl\/)?/, "xl/"));
  }
  const sheets = Array.from((zip.read("xl/workbook.xml") ?? "").matchAll(/<sheet\s[^>]*>/g), (match) => {
    const attrs = attributes(match[0]);
    return { name: attrs.name ?? "Sheet", path: rels.get(attrs["r:id"] ?? "") ?? "" };
  }).filter((sheet) => sheet.path);

  const out: string[] = [];
  let total = 0;
  for (const sheet of sheets.slice(0, XLSX_MAX_SHEETS)) {
    const xml = zip.read(sheet.path);
    if (!xml) continue;
    const lines: string[] = [];
    for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      if (lines.length >= XLSX_MAX_ROWS_PER_SHEET || total >= XLSX_MAX_ROWS) break;
      const cells: string[] = [];
      for (const cell of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = attributes(cell[1]);
        const inner = cell[2] ?? "";
        let value = "";
        if (attrs.t === "s") value = shared[Number(runText(inner, "v"))] ?? "";
        else if (attrs.t === "inlineStr") value = runText(inner, "t");
        else value = runText(inner, "v");
        value = value.replace(/\s+/g, " ").trim().slice(0, XLSX_MAX_CELL_CHARS);
        const index = attrs.r ? columnIndex(attrs.r) : cells.length;
        cells[index] = value;
      }
      const dense = Array.from(cells, (value) => value ?? "");
      if (!dense.some(Boolean)) continue;
      lines.push(`| ${dense.join(" | ")} |`);
      if (lines.length === 1) lines.push(`| ${dense.map(() => "---").join(" | ")} |`);
      total += 1;
    }
    if (lines.length) out.push(`## Sheet: ${sheet.name}\n${lines.join("\n")}`);
    if (total >= XLSX_MAX_ROWS) break;
  }
  return out.join("\n\n");
}

export function docxText(buffer: Buffer) {
  const xml = readZip(buffer).read("word/document.xml") ?? "";
  return Array.from(xml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g), (match) =>
    runText(match[1].replace(/<w:tab\/>/g, "<w:t>\t</w:t>").replace(/<w:br\/>/g, "<w:t>\n</w:t>"), "w:t").trim(),
  )
    .filter(Boolean)
    .join("\n");
}

export function pptxText(buffer: Buffer) {
  const zip = readZip(buffer);
  const slides = zip
    .names()
    .map((name) => ({ name, number: Number(name.match(/^ppt\/slides\/slide(\d+)\.xml$/)?.[1] ?? NaN) }))
    .filter((slide) => Number.isFinite(slide.number))
    .sort((a, b) => a.number - b.number);
  return slides
    .map((slide) => {
      const xml = zip.read(slide.name) ?? "";
      const paragraphs = Array.from(xml.matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g), (match) => runText(match[1], "a:t").trim()).filter(Boolean);
      return paragraphs.length ? `## Slide ${slide.number}\n${paragraphs.join("\n")}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

export function htmlText(html: string) {
  return decodeXml(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " "),
  );
}
