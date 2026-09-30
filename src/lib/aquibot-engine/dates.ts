/**
 * Resolves date phrases in a question ("last week", "Q1 2026", "week 21", "5 May") into
 * concrete UTC windows. Desk timestamps carry no zone, so everything here is UTC.
 */

export type DateRangeKind = "day" | "week" | "month" | "quarter" | "year" | "rolling";

export type DateRange = {
  start: number;
  end: number;
  kind: DateRangeKind;
  label: string;
  phrase: string;
  ambiguous: boolean;
  assumption: string | null;
};

export type DateResolution = { ranges: DateRange[]; graceDays: number };

export const DAY_MS = 86_400_000;

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

export const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

const MONTH_ALT = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const ORDINAL: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4 };

const pad = (n: number) => String(n).padStart(2, "0");
const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);

function startOfDay(ms: number) {
  const d = new Date(ms);
  return utc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function isoWeekStart(year: number, week: number) {
  const jan4 = utc(year, 1, 4);
  const weekday = (new Date(jan4).getUTCDay() + 6) % 7;
  return jan4 - weekday * DAY_MS + (week - 1) * 7 * DAY_MS;
}

export function isoWeekOf(ms: number) {
  const day = startOfDay(ms);
  const weekday = (new Date(day).getUTCDay() + 6) % 7;
  const thursday = day - weekday * DAY_MS + 3 * DAY_MS;
  const year = new Date(thursday).getUTCFullYear();
  return { year, week: 1 + Math.floor((thursday - isoWeekStart(year, 1)) / (7 * DAY_MS)) };
}

function weeksInYear(year: number) {
  return isoWeekOf(utc(year, 12, 28)).week;
}

type RangeBase = Omit<DateRange, "phrase" | "ambiguous" | "assumption">;

export function weekRange(year: number, week: number): RangeBase | null {
  if (week < 1 || week > weeksInYear(year)) return null;
  const start = isoWeekStart(year, week);
  return { start, end: start + 7 * DAY_MS - 1000, kind: "week", label: `week_${year}_w${pad(week)}` };
}

function dayRange(y: number, m: number, d: number): RangeBase | null {
  const start = utc(y, m, d);
  const date = new Date(start);
  if (date.getUTCMonth() + 1 !== m || date.getUTCDate() !== d) return null;
  return { start, end: start + DAY_MS - 1000, kind: "day", label: `day_${y}_${pad(m)}_${pad(d)}` };
}

function monthRange(y: number, m: number): RangeBase {
  const first = new Date(utc(y, m, 1));
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth() + 1;
  return { start: first.getTime(), end: utc(year, month + 1, 1) - 1000, kind: "month", label: `month_${year}_${pad(month)}` };
}

function quarterRange(y: number, q: number): RangeBase {
  return { start: utc(y, (q - 1) * 3 + 1, 1), end: utc(y, q * 3 + 1, 1) - 1000, kind: "quarter", label: `quarter_${y}_q${q}` };
}

function yearRange(y: number): RangeBase {
  return { start: utc(y, 1, 1), end: utc(y + 1, 1, 1) - 1000, kind: "year", label: `year_${y}` };
}

function mostRecentPastDay(month: number, day: number, now: number) {
  const today = startOfDay(now);
  let year = new Date(now).getUTCFullYear();
  if (utc(year, month, day) > today) year -= 1;
  return dayRange(year, month, day);
}

function numericDate(first: number, second: number, year: number | null, now: number) {
  let day = first;
  let month = second;
  let assumption: string | null = null;
  if (first > 12 && second > 12) return null;
  if (second > 12) {
    month = first;
    day = second;
  } else if (first <= 12 && second <= 12 && first !== second) {
    assumption = "read as day/month";
  }
  const range = year === null ? mostRecentPastDay(month, day, now) : dayRange(year, month, day);
  if (!range) return null;
  if (year === null) assumption = assumption ? `${assumption}; no year given, assumed most recent past occurrence` : "no year given; assumed most recent past occurrence";
  return { range, assumption };
}

function monthNumber(token: string) {
  return MONTHS[token.toLowerCase()] ?? 0;
}

export function resolveDateRanges(message: string, graceDays: number, now = Date.now()): DateResolution {
  const text = message.trim();
  const lower = text.toLowerCase();
  const ranges: DateRange[] = [];
  const nowDate = new Date(now);
  const year = nowDate.getUTCFullYear();
  const month = nowDate.getUTCMonth() + 1;
  const today = startOfDay(now);

  const add = (range: RangeBase | null, phrase: string, extra: { ambiguous?: boolean; assumption?: string | null } = {}) => {
    if (!range || range.end < range.start) return;
    ranges.push({ ...range, phrase: phrase.toLowerCase().trim(), ambiguous: Boolean(extra.ambiguous), assumption: extra.assumption ?? null });
  };
  const taken: [number, number][] = [];
  const each = (pattern: RegExp, handle: (match: RegExpExecArray) => void) => {
    for (const match of text.matchAll(pattern)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (taken.some(([a, b]) => start < b && end > a)) continue;
      const before = ranges.length;
      handle(match as RegExpExecArray);
      if (ranges.length > before) taken.push([start, end]);
    }
  };

  each(/\b(20\d{2})-?w([0-5]?\d)\b/gi, (m) => add(weekRange(Number(m[1]), Number(m[2])), m[0]));
  each(/\b(?:week|wk)\s+(\d{1,2})\s*(?:of\s+|in\s+|\/\s*|,\s*)?(20\d{2})\b/gi, (m) => add(weekRange(Number(m[2]), Number(m[1])), m[0]));
  each(/\b(?:week|wk)\s+(\d{1,2})\b(?!\s*(?:of\s+|in\s+|\/\s*|,\s*)?20\d{2})/gi, (m) =>
    add(weekRange(year, Number(m[1])), m[0], { ambiguous: true, assumption: `no year given; assumed current year (${year})` }),
  );

  each(/\b(?:q([1-4])|(first|second|third|fourth)\s+quarter)\s*(?:of\s+)?[-/]?\s*(20\d{2})\b/gi, (m) => {
    const q = m[1] ? Number(m[1]) : ORDINAL[m[2].toLowerCase()];
    add(quarterRange(Number(m[3]), q), m[0]);
  });
  each(/\b(?:q([1-4])|(first|second|third|fourth)\s+quarter)\b(?!\s*(?:of\s+)?[-/]?\s*20\d{2})/gi, (m) => {
    const q = m[1] ? Number(m[1]) : ORDINAL[m[2].toLowerCase()];
    add(quarterRange(year, q), m[0], { ambiguous: true, assumption: `no year given; assumed current year (${year})` });
  });

  each(/\b(20\d{2})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])\b/g, (m) => add(dayRange(Number(m[1]), Number(m[2]), Number(m[3])), m[0]));
  each(new RegExp(`\\b${MONTH_ALT}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d{2})\\b`, "gi"), (m) =>
    add(dayRange(Number(m[3]), monthNumber(m[1]), Number(m[2])), m[0]),
  );
  each(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_ALT},?\\s+(20\\d{2})\\b`, "gi"), (m) =>
    add(dayRange(Number(m[3]), monthNumber(m[2]), Number(m[1])), m[0]),
  );
  each(/\b(20\d{2})[-/](0?[1-9]|1[0-2])\b(?![-/]\d)/g, (m) => add(monthRange(Number(m[1]), Number(m[2])), m[0]));
  each(/(?<![\d/.-])(\d{1,2})([/.-])(\d{1,2})\2(20\d{2})(?![\d/.-])/g, (m) => {
    const resolved = numericDate(Number(m[1]), Number(m[3]), Number(m[4]), now);
    if (resolved) add(resolved.range, m[0], { ambiguous: Boolean(resolved.assumption), assumption: resolved.assumption });
  });
  each(/(?<![\d/.-])(\d{1,2})\/(\d{1,2})(?![\d/.-])/g, (m) => {
    const resolved = numericDate(Number(m[1]), Number(m[2]), null, now);
    if (resolved) add(resolved.range, m[0], { ambiguous: true, assumption: resolved.assumption });
  });
  each(new RegExp(`\\b${MONTH_ALT}\\s*[-/]?\\s*(20\\d{2})\\b`, "gi"), (m) => add(monthRange(Number(m[2]), monthNumber(m[1])), m[0]));

  each(new RegExp(`\\b${MONTH_ALT}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?!,?\\s+20\\d{2})`, "gi"), (m) =>
    add(mostRecentPastDay(monthNumber(m[1]), Number(m[2]), now), m[0], { ambiguous: true, assumption: "no year given; assumed most recent past occurrence" }),
  );
  each(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_ALT}\\b(?!,?\\s+20\\d{2})`, "gi"), (m) =>
    add(mostRecentPastDay(monthNumber(m[2]), Number(m[1]), now), m[0], { ambiguous: true, assumption: "no year given; assumed most recent past occurrence" }),
  );
  each(new RegExp(`\\b(?:in|during|for|since|from|throughout|last|early|mid|late|(?:the\\s+)?(?:end|start|beginning|middle)\\s+of)[\\s-]+${MONTH_ALT}\\b(?![\\s,]*(?:\\d|20\\d{2}))`, "gi"), (m) => {
    const target = monthNumber(m[1]);
    add(monthRange(target > month || (target === month && /^last\b/i.test(m[0])) ? year - 1 : year, target), m[0], {
      ambiguous: true,
      assumption: "no year given; assumed most recent occurrence",
    });
  });

  const weekday = (new Date(today).getUTCDay() + 6) % 7;
  const thisMonday = today - weekday * DAY_MS;
  const weekFrom = (monday: number): RangeBase => {
    const iso = isoWeekOf(monday);
    return { start: monday, end: monday + 7 * DAY_MS - 1000, kind: "week", label: `week_${iso.year}_w${pad(iso.week)}` };
  };
  const anchoredPriorYear = /\b(?:this|same)\s+tim(?:e|er)\s+last\s+year\b|\bthis\s+week\s+last\s+year\b|\baround\s+this\s+tim(?:e|er)\s+last\s+year\b/;
  const first = (pattern: RegExp) => lower.match(pattern)?.[0];

  let phrase: string | undefined;
  if ((phrase = first(/\b(?:the\s+)?week\s+before\s+last\b/))) add(weekFrom(thisMonday - 14 * DAY_MS), phrase);
  else if ((phrase = first(/\b(?:next|coming)\s+weeks?\b/))) add(weekFrom(thisMonday + 7 * DAY_MS), phrase);
  else if ((phrase = first(/\b(?:this|current|most\s+recent)\s+week\b/)) && !/\bthis\s+week\s+last\s+year\b/.test(lower)) add(weekFrom(thisMonday), phrase);
  else if ((phrase = first(/\b(?:last|previous|past)\s+weeks?\b/))) add(weekFrom(thisMonday - 7 * DAY_MS), phrase);

  if ((phrase = first(/\b(?:next|following)\s+months?\b/))) add(monthRange(year, month + 1), phrase);
  else if ((phrase = first(/\b(?:this|current|most\s+recent)\s+month\b/))) add(monthRange(year, month), phrase);
  else if ((phrase = first(/\b(?:last|previous|past)\s+months?\b/))) add(monthRange(year, month - 1), phrase);

  const quarter = Math.ceil(month / 3);
  const quarterAt = (offset: number) => {
    const index = year * 4 + (quarter - 1) + offset;
    return quarterRange(Math.floor(index / 4), (index % 4) + 1);
  };
  if ((phrase = first(/\b(?:next|following)\s+quarters?\b/))) add(quarterAt(1), phrase);
  else if ((phrase = first(/\b(?:this|current|most\s+recent)\s+quarter\b/))) add(quarterAt(0), phrase);
  else if ((phrase = first(/\b(?:last|previous|past)\s+quarters?\b/))) add(quarterAt(-1), phrase);

  if ((phrase = first(/\b(?:next|following)\s+year\b/))) add(yearRange(year + 1), phrase);
  else if ((phrase = first(/\b(?:this|current|most\s+recent)\s+year\b/))) add(yearRange(year), phrase);
  else if ((phrase = first(/\b(?:last|previous|past)\s+year\b/)) && !anchoredPriorYear.test(lower)) add(yearRange(year - 1), phrase);

  const priorYear = lower.match(/\b(?:around\s+)?(?:this|same)\s+tim(?:e|er)\s+last\s+year\b|\bthis\s+week\s+last\s+year\b/)?.[0];
  if (priorYear) {
    const iso = isoWeekOf(now);
    const primary = weekRange(iso.year - 1, Math.min(iso.week, weeksInYear(iso.year - 1)));
    if (primary) {
      add({ ...primary, label: `prior_year_iso_week_${iso.year - 1}_w${pad(iso.week)}` }, priorYear);
      const before = weekFrom(primary.start - 7 * DAY_MS);
      const after = weekFrom(primary.start + 7 * DAY_MS);
      add({ ...before, label: `adjacent_before_${before.label.slice(5)}` }, `${priorYear} (trend context)`);
      add({ ...after, label: `adjacent_after_${after.label.slice(5)}` }, `${priorYear} (trend context)`);
    }
  }

  const dayAt = (offset: number): RangeBase => {
    const start = today + offset * DAY_MS;
    const d = new Date(start);
    return { start, end: start + DAY_MS - 1000, kind: "day", label: `day_${d.getUTCFullYear()}_${pad(d.getUTCMonth() + 1)}_${pad(d.getUTCDate())}` };
  };
  if ((phrase = first(/\b(?:the\s+)?day\s+before\s+yesterday\b/))) add(dayAt(-2), phrase);
  else if ((phrase = first(/\byesterday(?:s|'s)?\b/))) add(dayAt(-1), phrase);
  else if ((phrase = first(/\btomorrow(?:s|'s)?\b/))) add(dayAt(1), phrase);
  else if ((phrase = first(/\btoday(?:s|'s)?\b/))) add(dayAt(0), phrase);

  const rolling = lower.match(/\b(?:last|past)\s+(\d{1,3})\s+(days?|weeks?|months?)\b/);
  if (rolling) {
    const n = Math.max(1, Math.min(365, Number(rolling[1])));
    const unit = rolling[2].replace(/s$/, "");
    const from = new Date(today);
    if (unit === "month") from.setUTCMonth(from.getUTCMonth() - n);
    else from.setUTCDate(from.getUTCDate() - n * (unit === "week" ? 7 : 1));
    add({ start: from.getTime(), end: today + DAY_MS - 1000, kind: "rolling", label: `rolling_last_${n}_${unit}s` }, rolling[0]);
  }
  if ((phrase = first(/\bfortnight\b/))) add({ start: today - 14 * DAY_MS, end: today + DAY_MS - 1000, kind: "rolling", label: "rolling_last_14_days" }, phrase);

  const seen = new Set<string>();
  const unique = ranges.filter((range) => {
    const key = `${range.start}-${range.end}-${range.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { ranges: unique, graceDays };
}

export function isoDate(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

const NO_RANGE =
  "## DETECTED DATE RANGE\nNo specific date range detected. If the user uses relative phrases like 'last week' or 'this month', interpret them against the corpus using today's date above.";

export function formatDateRangeSection(resolution: DateResolution | null) {
  if (!resolution || resolution.ranges.length === 0) return NO_RANGE;
  const out = [
    "## DETECTED DATE RANGE",
    "The user's natural-language date reference has been pre-resolved to a concrete window. Use this as the primary temporal filter when matching PriceDate and weekly report dates in the corpus. If no in-window entry exists, fall back to the most recent available entry within the grace window and disclose the gap.",
  ];
  resolution.ranges.forEach((range, index) => {
    out.push(
      `  Range ${index + 1}: ${isoDate(range.start)} to ${isoDate(range.end)} (kind=${range.kind}, label=${range.label}, phrase=${range.phrase ? `"${range.phrase}"` : "(none)"})${range.ambiguous ? " [AMBIGUOUS]" : ""}${range.assumption ? ` — ${range.assumption}` : ""}`,
    );
  });
  out.push(
    `Grace window: ±${resolution.graceDays} days outside the resolved range. If no in-window entry exists, the most recent available entry within the grace window may be used as a fallback (must be disclosed).`,
  );
  if (resolution.ranges.some((range) => range.label.startsWith("adjacent_"))) {
    out.push("Note: The additional ranges above are adjacent-week trend context for the resolved prior-year window (Range 1 is the primary).");
  }
  return out.join("\n");
}

/** Month names covered by the ranges, for month-token keyword matching. */
export function rangeMonthTokens(resolution: DateResolution | null) {
  const tokens = new Set<string>();
  for (const range of resolution?.ranges ?? []) {
    if (range.end - range.start > 400 * DAY_MS) continue;
    for (let cursor = range.start; cursor <= range.end; ) {
      const d = new Date(cursor);
      const name = MONTH_NAMES[d.getUTCMonth()];
      tokens.add(name);
      tokens.add(name.slice(0, 3));
      cursor = utc(d.getUTCFullYear(), d.getUTCMonth() + 2, 1);
    }
  }
  return Array.from(tokens);
}

/** A readable label for a range, e.g. `21–27 Sep 2026` or `Sep 2026`. */
export function describeRange(range: Pick<DateRange, "start" | "end" | "kind">) {
  const fmt = (ms: number, withYear = true) =>
    new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" });
  if (range.kind === "month") return new Date(range.start).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  if (range.kind === "year") return String(new Date(range.start).getUTCFullYear());
  if (range.kind === "day") return fmt(range.start);
  const sameYear = new Date(range.start).getUTCFullYear() === new Date(range.end).getUTCFullYear();
  return `${fmt(range.start, !sameYear)} – ${fmt(range.end)}`;
}
