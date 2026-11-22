export const DESK_QUOTE_TARGET = 3;
export const DESK_QUOTE_WAIT_MS = 24 * 60 * 60 * 1000;

export type DeskCandidate = {
  supplierId: string;
  supplierName: string;
  unitPrice: number;
  currency: string;
  incoterm: string;
  quantityMt: number | null;
  loadPort: string;
  destination: string;
  receivedAt: string;
  wechatOpenid: string;
  offerCode?: string;
};

export function pickDeskShortlist(input: {
  quotes: DeskCandidate[];
  fanoutAt: string | null;
  now?: number;
}) {
  const seen = new Set<string>();
  const unique: DeskCandidate[] = [];
  const ordered = [...input.quotes].sort((a, b) => {
    const time = Date.parse(a.receivedAt || "0") - Date.parse(b.receivedAt || "0");
    if (time !== 0) return time;
    return (a.offerCode || a.supplierId).localeCompare(b.offerCode || b.supplierId);
  });
  for (const quote of ordered) {
    if (!quote.supplierId || quote.unitPrice <= 0 || seen.has(quote.supplierId)) continue;
    seen.add(quote.supplierId);
    unique.push(quote);
  }
  const now = input.now ?? Date.now();
  const start = Date.parse(input.fanoutAt || "");
  const waitOver = Number.isFinite(start) && now - start >= DESK_QUOTE_WAIT_MS;
  if (unique.length >= DESK_QUOTE_TARGET) {
    return { promote: true as const, reason: "three_quotes" as const, offers: unique.slice(0, DESK_QUOTE_TARGET) };
  }
  if (unique.length >= 1 && waitOver) {
    return { promote: true as const, reason: "wait_elapsed" as const, offers: unique.slice(0, DESK_QUOTE_TARGET) };
  }
  return { promote: false as const, reason: unique.length ? ("waiting" as const) : ("none" as const), offers: unique };
}
