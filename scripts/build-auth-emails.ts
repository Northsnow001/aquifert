/**
 * Writes the Supabase Auth email templates from the shared email design.
 * Run: npx tsx scripts/build-auth-emails.ts, then paste each file into
 * Supabase → Authentication → Email Templates.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { supabaseAuthTemplates } from "../src/lib/email/templates";

const out = join(process.cwd(), "supabase", "templates");
mkdirSync(out, { recursive: true });
const { verification, reset } = supabaseAuthTemplates();
writeFileSync(join(out, "verification-code.html"), verification.html);
writeFileSync(join(out, "reset-password.html"), reset.html);
console.log(`Wrote verification-code.html and reset-password.html to ${out}`);
console.log(`Subjects: "${verification.subject}" and "${reset.subject}"`);
