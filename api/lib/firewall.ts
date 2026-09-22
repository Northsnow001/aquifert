/**
 * Identity-firewall engine, the protected-entity masking core.
 *
 * Rules implemented (spine document §7–§8):
 *  - The leak set is a SET: every supplier-side name, alias, address, bank
 *    detail, contact and phone linked to a trade is screened, not one field.
 *  - Screening is body-level and multilingual: plain substring matching works
 *    for Chinese and other non-Latin scripts; we normalise case and whitespace
 *    for Latin text.
 *  - Internal carrier annotations ("Real Shipper / Real Consignee / Real
 *    Notify" working blocks) are leaks in their own right.
 *  - The engine only ever flags or masks, a human always clears.
 */

export interface ProtectedEntityInput {
  entityName: string;
  aliases?: string[] | null;
  phones?: string[] | null;
  addresses?: string[] | null;
  bankAccounts?: string[] | null;
  contacts?: string[] | null;
}

export type LeakKind = "ENTITY" | "ALIAS" | "PHONE" | "ADDRESS" | "BANK" | "CONTACT" | "ANNOTATION";

export interface LeakFinding {
  kind: LeakKind;
  match: string;
  /** ±48-char excerpt so a human sees the leak in context */
  context: string;
  entityName?: string;
}

/** Normalise Latin text for matching; leaves non-Latin scripts untouched. */
function norm(t: string) {
  return t
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[,.;:!?()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A variant of the text with all whitespace removed, catches names split across lines/spaces. */
function compact(t: string) {
  return norm(t).replace(/\s+/g, "");
}

function findAll(haystack: string, needle: string): number[] {
  const idx: number[] = [];
  if (!needle) return idx;
  let i = haystack.indexOf(needle);
  while (i !== -1) {
    idx.push(i);
    i = haystack.indexOf(needle, i + needle.length);
  }
  return idx;
}

function excerpt(raw: string, normalizedIndex: number, matchLen: number) {
  // The normalised index approximates the raw position closely enough for a
  // ±48-char human review excerpt.
  const start = Math.max(0, normalizedIndex - 48);
  const end = Math.min(raw.length, normalizedIndex + matchLen + 48);
  return `${start > 0 ? "…" : ""}${raw.slice(start, end)}${end < raw.length ? "…" : ""}`;
}

/** Detect internal routing/working annotations that must never ship. */
export function detectInternalAnnotations(raw: string): LeakFinding[] {
  const findings: LeakFinding[] = [];
  const patterns = [
    /real\s*shipper[^\n\r]*/gi,
    /real\s*consignee[^\n\r]*/gi,
    /real\s*notify(\s*party)?[^\n\r]*/gi,
    /internal\s*(use\s*)?only[^\n\r]*/gi,
    /do\s*not\s*(send|release|share)[^\n\r]*/gi,
  ];
  for (const re of patterns) {
    for (const m of raw.matchAll(re)) {
      findings.push({
        kind: "ANNOTATION",
        match: m[0].trim(),
        context: excerpt(raw, m.index ?? 0, m[0].length),
      });
    }
  }
  return findings;
}

/** Screen a document body against the trade's whole protected-entity set. */
export function scanText(raw: string, entities: ProtectedEntityInput[]): LeakFinding[] {
  const findings: LeakFinding[] = [];
  const nText = norm(raw);
  const cText = compact(raw);

  const pushMatches = (term: string, kind: LeakKind, entityName: string) => {
    const nTerm = norm(term);
    const cTerm = compact(term);
    if (nTerm.length < 3 && cTerm.length < 3) return;
    const inNorm = findAll(nText, nTerm);
    const inCompact = inNorm.length === 0 && cTerm.length >= 4 ? findAll(cText, cTerm) : [];
    for (const i of inNorm) findings.push({ kind, match: term, context: excerpt(raw, i, nTerm.length), entityName });
    for (const i of inCompact) findings.push({ kind, match: term, context: excerpt(raw, i, cTerm.length), entityName });
  };

  for (const e of entities) {
    pushMatches(e.entityName, "ENTITY", e.entityName);
    for (const a of e.aliases ?? []) pushMatches(a, "ALIAS", e.entityName);
    for (const p of e.phones ?? []) pushMatches(p, "PHONE", e.entityName);
    for (const a of e.addresses ?? []) pushMatches(a, "ADDRESS", e.entityName);
    for (const b of e.bankAccounts ?? []) pushMatches(b, "BANK", e.entityName);
    for (const c of e.contacts ?? []) pushMatches(c, "CONTACT", e.entityName);
  }

  findings.push(...detectInternalAnnotations(raw));

  // De-duplicate identical kind+match pairs
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.kind}|${norm(f.match)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Produce a masked copy of a document body: every protected term replaced with
 * a neutral placeholder. Used by the SUBSTITUTE fix path, the result is still
 * gated and requires human clearance before release.
 */
export function maskText(raw: string, entities: ProtectedEntityInput[], mask = "[PROTECTED, REMOVED BY AQUIFERT]"): string {
  let out = raw;
  const terms: string[] = [];
  for (const e of entities) {
    terms.push(e.entityName, ...(e.aliases ?? []), ...(e.phones ?? []), ...(e.addresses ?? []), ...(e.bankAccounts ?? []), ...(e.contacts ?? []));
  }
  // Longest-first so "Xiamen Moben Trading Co Ltd" masks before "Xiamen Moben"
  terms
    .filter((t) => t && t.trim().length >= 3)
    .sort((a, b) => b.length - a.length)
    .forEach((t) => {
      out = out.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), mask);
    });
  // Strip internal annotation lines wholesale
  out = out.replace(/^.*(?:real\s*shipper|real\s*consignee|real\s*notify).*$/gim, mask);
  return out;
}
