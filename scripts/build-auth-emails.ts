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
const { verification, reset, invite } = supabaseAuthTemplates();
writeFileSync(join(out, "verification-code.html"), verification.html);
writeFileSync(join(out, "reset-password.html"), reset.html);
writeFileSync(join(out, "invite.html"), invite.html);
console.log(`Wrote verification-code.html, reset-password.html and invite.html to ${out}`);
console.log(`Subjects: "${verification.subject}", "${reset.subject}" and "${invite.subject}"`);
