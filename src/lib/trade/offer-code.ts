/** Spreadsheet Offer IDs: OFF-20261108215039-0 */
export function formatOfferCode(at: Date, line = 0) {
  const stamp = at.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `OFF-${stamp}-${Math.max(0, line)}`;
}

export function mondayOf(at: Date) {
  const day = at.getUTCDay();
  const shift = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate() + shift));
  return monday.toISOString().slice(0, 10);
}
