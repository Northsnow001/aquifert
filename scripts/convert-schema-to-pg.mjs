/**
 * One-shot: convert db/schema.ts from drizzle mysql-core to pg-core.
 * Postgres requires uniquely named pgEnum types (MySQL inline enums do not).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "..", "db", "schema.ts");
let src = fs.readFileSync(schemaPath, "utf8");

const enumDecls = [];
const usedPgNames = new Set();
let counter = 0;

function toPgEnumName(hint, values) {
  const base = hint
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .toLowerCase()
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  let name = base || `enum_${++counter}`;
  if (usedPgNames.has(name)) {
    const v0 = String(values[0] ?? "x")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 12);
    name = `${base}_${v0}`;
  }
  while (usedPgNames.has(name)) {
    name = `${base}_${++counter}`;
  }
  usedPgNames.add(name);
  return name;
}

// Track table context for better enum names
let currentTable = "unknown";
src.replace(/export const (\w+) = mysqlTable/g, (_, t) => {
  currentTable = t;
  return _;
});

// Pass 1: named export enums like `export const requestStatusEnum = mysqlEnum(...)`
src = src.replace(
  /export const (\w+) = mysqlEnum\(\s*"([^"]+)"\s*,\s*(\[[\s\S]*?\])\s*\);/g,
  (_, varName, _col, valuesLiteral) => {
    const values = valuesLiteral;
    const pgName = toPgEnumName(varName.replace(/Enum$/, ""), []);
    enumDecls.push(`export const ${varName} = pgEnum("${pgName}", ${values});`);
    return `/* ${varName} declared above */`;
  },
);

// Pass 2: inline mysqlEnum("col", [...]) — need table-aware names
// Re-scan line by line for table context
const lines = src.split("\n");
let tableCtx = "tbl";
const outLines = [];
for (const line of lines) {
  const tm = line.match(/export const (\w+) = mysqlTable/);
  if (tm) tableCtx = tm[1];

  let next = line.replace(
    /mysqlEnum\(\s*"([^"]+)"\s*,\s*(\[[\s\S]*?\])\s*\)/g,
    (_, col, valuesLiteral) => {
      const varName = `${tableCtx}_${col}Enum`.replace(/[^a-zA-Z0-9_]/g, "_");
      // ensure unique var names
      let uniqueVar = varName;
      let i = 0;
      while (enumDecls.some((d) => d.includes(`export const ${uniqueVar} =`))) {
        i++;
        uniqueVar = `${varName}_${i}`;
      }
      const pgName = toPgEnumName(`${tableCtx}_${col}`, []);
      enumDecls.push(`export const ${uniqueVar} = pgEnum("${pgName}", ${valuesLiteral});`);
      return `${uniqueVar}("${col}")`;
    },
  );
  outLines.push(next);
}
src = outLines.join("\n");

// Restore named enum usages that were stubbed — requestStatusEnum etc. already
// referenced as requestStatusEnum.default(...) so the placeholder comment is fine;
// but we need the actual export. Placeholders are comments; references still use the name.

// Replace imports
src = src.replace(
  /import \{[\s\S]*?\} from "drizzle-orm\/mysql-core";/,
  `import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  integer,
  decimal,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";`,
);

// mysqlTable -> pgTable
src = src.replaceAll("mysqlTable", "pgTable");

// int( -> integer(  (pg uses integer; int also exists as alias in some versions)
src = src.replace(/\bint\(/g, "integer(");

// json( -> jsonb(
src = src.replace(/\bjson\(/g, "jsonb(");

// Remove unsigned: true from bigint options
src = src.replace(/,\s*unsigned:\s*true/g, "");

// Insert enum declarations after imports
const importEnd = src.indexOf('} from "drizzle-orm/pg-core";');
if (importEnd === -1) throw new Error("import block not found");
const insertAt = src.indexOf("\n", importEnd) + 1;
const enumBlock =
  "\n/* ------------------------------------------------------------------ */\n" +
  "/* Postgres enums (unique type names required)                          */\n" +
  "/* ------------------------------------------------------------------ */\n" +
  enumDecls.join("\n") +
  "\n";

src = src.slice(0, insertAt) + enumBlock + src.slice(insertAt);

// Remove placeholder comments for named enums (they're now declared above)
src = src.replace(/\/\* \w+ declared above \*\/\n/g, "");

fs.writeFileSync(schemaPath, src);
console.log(`Wrote ${schemaPath}`);
console.log(`Generated ${enumDecls.length} pgEnum declarations`);
