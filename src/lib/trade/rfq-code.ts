/** Canonical Trade ID: rfq#074. Accepts rfq 74, RFQ074, #074. */
export function normalizeRfqCode(raw: string) {
  const text = String(raw || "").trim();
  const match = text.match(/rfq\s*#?\s*(\d{1,6})/i) || text.match(/^#?\s*(\d{1,6})$/);
  if (!match) return text;
  return `rfq#${match[1].padStart(3, "0")}`;
}

export function extractRfqCode(text: string) {
  const match = String(text || "").match(/rfq\s*#?\s*(\d{1,6})/i);
  return match ? `rfq#${match[1].padStart(3, "0")}` : "";
}

export function rfqLookupKeys(code: string) {
  const raw = String(code || "").trim();
  const normalized = normalizeRfqCode(raw);
  return [...new Set([raw, normalized].filter(Boolean))];
}
