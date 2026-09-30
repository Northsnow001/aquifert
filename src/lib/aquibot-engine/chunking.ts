export const CHUNK_SIZE = 1300;
export const CHUNK_OVERLAP = 120;
export const MIN_CHUNK_LENGTH = 80;
export const WEEKLY_CHUNK_SIZE = 450;
export const WEEKLY_CHUNK_OVERLAP = 60;

/** Weekly price files ("Week 38 2026") are dense tables, so they get small chunks. */
export const WEEKLY_FILE = /week\s*\d{1,2}[_\-\s]*20\d{2}/i;

export function normalizeText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Splits text into overlapping windows, each prefixed with `[label]`. A window ends at the
 * last paragraph break or space past its midpoint, so words and table rows stay whole.
 */
export function chunkText(text: string, options: { label: string; maxChunks: number; weekly?: boolean }) {
  const body = normalizeText(text);
  const size = options.weekly ? WEEKLY_CHUNK_SIZE : CHUNK_SIZE;
  const overlap = options.weekly ? WEEKLY_CHUNK_OVERLAP : CHUNK_OVERLAP;
  const label = options.label.replace(/[[\]]/g, "").trim();
  const chunks: string[] = [];
  let start = 0;

  while (start < body.length && chunks.length < options.maxChunks) {
    let end = Math.min(start + size, body.length);
    if (end < body.length) {
      const half = start + Math.floor(size / 2);
      const breakAt = body.lastIndexOf("\n", end);
      const spaceAt = body.lastIndexOf(" ", end);
      if (breakAt > half) end = breakAt;
      else if (spaceAt > half) end = spaceAt;
    }
    const piece = body.slice(start, end).trim();
    if (piece.length >= MIN_CHUNK_LENGTH || (chunks.length === 0 && end >= body.length && piece)) {
      chunks.push(label ? `[${label}] ${piece}` : piece);
    }
    if (end >= body.length) break;
    start = Math.max(end - overlap, start + 1);
    while (start < end && body[start] !== " " && body[start] !== "\n" && body[start - 1] !== " " && body[start - 1] !== "\n") start += 1;
  }

  return chunks;
}

/** Removes the `[label]` prefix added by `chunkText`. */
export function stripChunkLabel(chunk: string) {
  return chunk.replace(/^\[[^\]]*\]\s*/, "");
}
