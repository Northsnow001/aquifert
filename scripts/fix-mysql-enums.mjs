/**
 * Fix remaining multiline mysqlEnum(...) calls in db/schema.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "..", "db", "schema.ts");
let src = fs.readFileSync(schemaPath, "utf8");

const usedPgNames = new Set(
  [...src.matchAll(/pgEnum\("([^"]+)"/g)].map((m) => m[1]),
);
const usedVars = new Set(
  [...src.matchAll(/export const (\w+) = pgEnum/g)].map((m) => m[1]),
);

function toPgEnumName(hint) {
  let name = hint
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .toLowerCase()
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  let n = name;
  let i = 0;
  while (usedPgNames.has(n)) {
    i++;
    n = `${name}_${i}`;
  }
  usedPgNames.add(n);
  return n;
}

let tableCtx = "tbl";
const enumDecls = [];

// Walk and find multiline mysqlEnum
const re = /mysqlEnum\(\s*"([^"]+)"\s*,\s*(\[[\s\S]*?\])\s*\)/g;

// Update table context before each match by scanning
src = src.replace(re, (full, col, valuesLiteral, offset) => {
  const before = src.slice(0, offset);
  const tables = [...before.matchAll(/export const (\w+) = pgTable/g)];
  tableCtx = tables.at(-1)?.[1] ?? "tbl";

  let uniqueVar = `${tableCtx}_${col}Enum`.replace(/[^a-zA-Z0-9_]/g, "_");
  let i = 0;
  while (usedVars.has(uniqueVar)) {
    i++;
    uniqueVar = `${tableCtx}_${col}Enum_${i}`;
  }
  usedVars.add(uniqueVar);

  const pgName = toPgEnumName(`${tableCtx}_${col}`);
  enumDecls.push(`export const ${uniqueVar} = pgEnum("${pgName}", ${valuesLiteral});`);
  return `${uniqueVar}("${col}")`;
});

if (enumDecls.length === 0) {
  console.log("No remaining mysqlEnum found");
  process.exit(0);
}

// Insert new enums after the existing enum block header
const marker = "/* Postgres enums (unique type names required)                          */\n/* ------------------------------------------------------------------ */\n";
const idx = src.indexOf(marker);
if (idx === -1) throw new Error("enum marker not found");
const insertAt = idx + marker.length;
src = src.slice(0, insertAt) + enumDecls.join("\n") + "\n" + src.slice(insertAt);

fs.writeFileSync(schemaPath, src);
console.log(`Fixed ${enumDecls.length} multiline enums`);
