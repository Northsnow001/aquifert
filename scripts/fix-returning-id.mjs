/**
 * Replace MySQL-only .$returningId() with Postgres .returning({ id: table.id })
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === "dist") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(ts|tsx|mts)$/.test(ent.name)) files.push(p);
  }
}
walk(root);

let total = 0;
for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes("$returningId")) continue;

  // Match insert(EXPR). ... .$returningId()
  // EXPR can be s.foo, schema.users, getDb().insert(s.x) already has insert before
  const re =
    /\.insert\(([^)]+)\)([\s\S]*?)\.\$returningId\(\)/g;

  let next = src.replace(re, (full, tableExpr, middle) => {
    total++;
    // tableExpr is like s.quotes or schema.users
    return `.insert(${tableExpr})${middle}.returning({ id: ${tableExpr}.id })`;
  });

  if (next !== src) {
    fs.writeFileSync(file, next);
    console.log("updated", path.relative(root, file));
  }
}
console.log("replacements:", total);
