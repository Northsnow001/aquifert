/**
 * Copies the admin data saved on this computer (data/*.json and data/library) into Supabase.
 *
 *   npm run data:push                 preview what would be copied
 *   npm run data:push -- --apply      copy it
 *   npm run data:push -- --apply --overwrite
 *                                     also replace modules Supabase already has
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment or .env.local.
 * Rows are upserted by id, so running it twice does not duplicate anything.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { LIBRARY_BUCKET, RECORD_SPECS, toRow, type DocumentKey, type RecordSpec } from "../src/lib/data/tables";

const apply = process.argv.includes("--apply");
const overwrite = process.argv.includes("--overwrite");
const dataDir = path.join(process.cwd(), "data");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in .env.local or the shell), then run again.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  zip: "application/zip",
};

function readJson(file: string): unknown {
  const full = path.join(dataDir, file);
  if (!existsSync(full)) return undefined;
  try {
    return JSON.parse(readFileSync(full, "utf8"));
  } catch {
    console.warn(`  ! ${file} is not valid JSON, skipped`);
    return undefined;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const DOCUMENTS: { key: DocumentKey; file: string; strip?: string[] }[] = [
  { key: "hub-content", file: "hub-content.json" },
  { key: "freight-desk", file: "freight-desk.json", strip: ["debug"] },
  { key: "netback-desk", file: "netback-desk.json" },
  { key: "desk-settings", file: "desk-settings.json" },
  { key: "wp-import-state", file: "wp-import/state.json" },
  { key: "wp-import-export", file: "wp-import/export.json" },
];

async function pushDocuments() {
  const { data: existing, error } = await db.from("app_documents").select("key");
  if (error) throw new Error(`app_documents: ${error.message}. Run supabase/migrations/003_app_data.sql first.`);
  const saved = new Set((existing ?? []).map((row) => row.key as string));
  console.log("\nAdmin content and settings (app_documents)");
  for (const doc of DOCUMENTS) {
    const raw = readJson(doc.file);
    if (!isRecord(raw)) {
      if (raw !== undefined) console.log(`  - ${doc.key}: ${doc.file} is not an object, skipped`);
      continue;
    }
    const value = { ...raw };
    for (const field of doc.strip ?? []) delete value[field];
    if (saved.has(doc.key) && !overwrite) {
      console.log(`  - ${doc.key}: Supabase already has it, kept (add --overwrite to replace)`);
      continue;
    }
    console.log(`  ${apply ? "✓" : "→"} ${doc.key}${saved.has(doc.key) ? " (replacing)" : ""}`);
    if (!apply) continue;
    const { error: upsertError } = await db.from("app_documents").upsert({ key: doc.key, data: value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (upsertError) throw new Error(`${doc.key}: ${upsertError.message}`);
  }
}

function localRows<T>(spec: RecordSpec<T>): T[] {
  const raw = readJson(spec.file);
  if (Array.isArray(raw)) return raw as T[];
  if (raw === undefined && spec.legacy) {
    const legacy = readJson(spec.legacy.file);
    return legacy === undefined ? [] : spec.legacy.pick(legacy);
  }
  return [];
}

async function pushRecords() {
  console.log("\nLogs, enquiries, registrations, bans and outbox");
  for (const spec of RECORD_SPECS) {
    const rows = localRows(spec).filter((item) => {
      try {
        const keys = spec.keys(item);
        return Boolean(keys.id && keys.at && Number.isFinite(Date.parse(keys.at)));
      } catch {
        return false;
      }
    });
    const kept = spec.max ? rows.slice(0, spec.max) : rows;
    if (!kept.length) continue;
    console.log(`  ${apply ? "✓" : "→"} ${spec.table}: ${kept.length.toLocaleString()} rows`);
    if (!apply) continue;
    for (let i = 0; i < kept.length; i += 500) {
      const { error } = await db.from(spec.table).upsert(kept.slice(i, i + 500).map((item) => toRow(spec, item)), { onConflict: "id" });
      if (error) throw new Error(`${spec.table}: ${error.message}`);
    }
  }
}

async function pushLibrary() {
  const root = path.join(dataDir, "library");
  if (!existsSync(root)) return;
  const files = readdirSync(root)
    .filter((id) => statSync(path.join(root, id)).isDirectory())
    .flatMap((id) => readdirSync(path.join(root, id)).filter((name) => !name.startsWith(".")).map((name) => ({ id, name })));
  if (!files.length) return;
  console.log(`\nLibrary files (bucket ${LIBRARY_BUCKET})`);
  for (const file of files) {
    const full = path.join(root, file.id, file.name);
    console.log(`  ${apply ? "✓" : "→"} ${file.id}/${file.name} (${(statSync(full).size / 1024 / 1024).toFixed(1)} MB)`);
    if (!apply) continue;
    const ext = path.extname(file.name).slice(1).toLowerCase();
    const { error } = await db.storage.from(LIBRARY_BUCKET).upload(`${file.id}/${file.name}`, readFileSync(full), { contentType: MIME[ext] ?? "application/octet-stream", upsert: true });
    if (error) throw new Error(`${file.id}/${file.name}: ${error.message}`);
  }
}

async function main() {
  console.log(`${apply ? "Copying" : "Preview of"} data/ into ${new URL(url!).host}`);
  await pushDocuments();
  await pushRecords();
  await pushLibrary();
  console.log(apply ? "\nDone. Open Admin → Settings → Data storage to check." : "\nNothing was written. Run again with --apply to copy.");
}

main().catch((error: unknown) => {
  console.error(`\nStopped: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
