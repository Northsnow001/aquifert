/** Questions asked once, after a mock subscription, before the dashboard opens. */

export type QuestionKind = "single" | "multi" | "countries" | "tags" | "categories";

export type OnboardingQuestion = {
  id: string;
  prompt: string;
  help: string;
  kind: QuestionKind;
  required: boolean;
  enabled: boolean;
  /** Choice lists. Country, tag and category questions take their options from the live desk lists. */
  options: string[];
};

export type InterestPick = { countries: string[]; tags: string[]; categories: string[] };

export const EMPTY_INTERESTS: InterestPick = { countries: [], tags: [], categories: [] };

export const INTEREST_KINDS: QuestionKind[] = ["countries", "tags", "categories"];

/** Fertiliser trade countries offered as interests. Tags and categories come from the desk's own flashes. */
export const TRADE_COUNTRIES = [
  "Algeria",
  "Argentina",
  "Australia",
  "Bangladesh",
  "Belgium",
  "Brazil",
  "Canada",
  "China",
  "Egypt",
  "France",
  "Germany",
  "India",
  "Indonesia",
  "Italy",
  "Japan",
  "Kazakhstan",
  "Malaysia",
  "Mexico",
  "Morocco",
  "Netherlands",
  "Nigeria",
  "Oman",
  "Pakistan",
  "Poland",
  "Qatar",
  "Russia",
  "Saudi Arabia",
  "South Africa",
  "South Korea",
  "Spain",
  "Thailand",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Vietnam",
] as const;

export const DEFAULT_QUESTIONS: OnboardingQuestion[] = [
  {
    id: "products",
    prompt: "Which products do you follow?",
    help: "The dashboard opens on this book: Telex, AQ View and the ARGUS panel.",
    kind: "multi",
    required: true,
    enabled: true,
    options: ["Urea", "Ammonia", "UAN", "Phosphates", "Potash", "Sulphur", "Freight"],
  },
  {
    id: "regions",
    prompt: "Which regions matter to your book?",
    help: "Origins and destinations you buy, sell or watch.",
    kind: "multi",
    required: true,
    enabled: true,
    options: ["Middle East", "North Africa", "West Africa", "East Africa", "Europe", "Black Sea", "Brazil", "India", "China", "Southeast Asia", "United States", "Latin America"],
  },
  {
    id: "role",
    prompt: "How do you sit in the market?",
    help: "The Aquibot briefing uses this voice.",
    kind: "single",
    required: true,
    enabled: true,
    options: ["Buyer / trader", "Importer", "Farmer / grower", "Producer", "Analyst"],
  },
  {
    id: "countries",
    prompt: "Which countries should the Telex follow for you?",
    help: "Flashes that mention these countries stay on your dashboard and in the feed.",
    kind: "countries",
    required: true,
    enabled: true,
    options: [],
  },
  {
    id: "tags",
    prompt: "Which Telex tags interest you?",
    help: "These are the tags already on published flashes.",
    kind: "tags",
    required: false,
    enabled: true,
    options: [],
  },
  {
    id: "categories",
    prompt: "Which news categories do you want?",
    help: "Nitrogen, phosphate, potash, freight and the rest of the desk's categories.",
    kind: "categories",
    required: true,
    enabled: true,
    options: [],
  },
];

const KINDS = new Set<QuestionKind>(["single", "multi", "countries", "tags", "categories"]);

const clean = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const unique = (values: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
};

function asQuestion(value: unknown): OnboardingQuestion | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<OnboardingQuestion>;
  const id = clean(row.id).slice(0, 40);
  const prompt = clean(row.prompt).slice(0, 180);
  const kind = row.kind;
  if (!id || !prompt || !kind || !KINDS.has(kind)) return null;
  const options = Array.isArray(row.options) ? unique(row.options.map(clean).filter(Boolean).slice(0, 40).map((item) => item.slice(0, 80))) : [];
  return {
    id,
    prompt,
    help: clean(row.help).slice(0, 240),
    kind,
    required: Boolean(row.required),
    enabled: row.enabled !== false,
    options: INTEREST_KINDS.includes(kind) ? [] : options,
  };
}

/** Stored questions, with the three interest questions put back if a save dropped them. */
export function parseQuestions(raw: unknown): OnboardingQuestion[] {
  const list = raw && typeof raw === "object" && Array.isArray((raw as { questions?: unknown }).questions) ? (raw as { questions: unknown[] }).questions : [];
  const stored = list.map(asQuestion).filter((item): item is OnboardingQuestion => Boolean(item));
  const base = stored.length ? stored : DEFAULT_QUESTIONS.map((item) => ({ ...item, options: [...item.options] }));
  const ids = new Set(base.map((item) => item.id));
  const missing = DEFAULT_QUESTIONS.filter((item) => INTEREST_KINDS.includes(item.kind) && !ids.has(item.id)).map((item) => ({ ...item }));
  return [...base, ...missing];
}

export function interestCatalog(input: { tags: string[]; categories: string[] }) {
  const countries = [...TRADE_COUNTRIES];
  const countryNames = new Set(countries.map((item) => item.toLowerCase()));
  const categories = unique(["Nitrogen", "Phosphate", "Potash", "Freight", "General", ...input.categories.map(clean)]);
  const categoryNames = new Set(categories.map((item) => item.toLowerCase()));
  const tags = unique(input.tags.map(clean).filter((item) => !countryNames.has(item.toLowerCase()) && !categoryNames.has(item.toLowerCase())));
  return { countries, tags, categories };
}

/** Fill country, tag and category options from the live lists. Choice questions keep the options the admin wrote. */
export function resolveQuestions(questions: OnboardingQuestion[], catalog: { countries: string[]; tags: string[]; categories: string[] }) {
  return questions
    .filter((item) => item.enabled)
    .map((item) => {
      if (item.kind === "countries") return { ...item, options: catalog.countries };
      if (item.kind === "tags") return { ...item, options: catalog.tags };
      if (item.kind === "categories") return { ...item, options: catalog.categories };
      return item;
    })
    .filter((item) => item.options.length > 0);
}

const norm = (value: string) => value.trim().toLowerCase();

export function interestsFrom(questions: OnboardingQuestion[], answers: Record<string, string[]>): InterestPick {
  const pick = (kind: QuestionKind) =>
    unique(
      questions
        .filter((item) => item.kind === kind)
        .flatMap((item) => answers[item.id] ?? []),
    );
  return { countries: pick("countries"), tags: pick("tags"), categories: pick("categories") };
}

export function answerTerms(questions: OnboardingQuestion[], answers: Record<string, string[]>) {
  return unique(questions.filter((item) => item.kind === "single" || item.kind === "multi").flatMap((item) => answers[item.id] ?? []));
}

export type FeedItem = { text: string; tags: string[]; category: string };

/** A flash matches when it shares a chosen country, tag, category, product or region. An empty selection matches everything. */
export function matchesFeed(item: FeedItem, interests: InterestPick, extra: string[] = []) {
  const countries = interests.countries.map(norm);
  const tags = interests.tags.map(norm);
  const categories = interests.categories.map(norm);
  const terms = extra.map(norm).filter(Boolean);
  if (!countries.length && !tags.length && !categories.length && !terms.length) return true;
  const hay = norm(item.text);
  const itemTags = item.tags.map(norm);
  const category = norm(item.category);
  if (categories.some((value) => value === category || hay.includes(value))) return true;
  if (itemTags.some((tag) => tags.includes(tag))) return true;
  if (countries.some((country) => hay.includes(country) || itemTags.includes(country))) return true;
  if (terms.some((term) => hay.includes(term) || itemTags.includes(term) || category === term)) return true;
  return false;
}

/** The personal feed is on only after an admin finishes the mock subscription questions. */
export function feedIsPersonal(viewer: { admin: boolean; mockPlan: string | null; onboardingDone: boolean }) {
  return viewer.admin && Boolean(viewer.mockPlan) && viewer.onboardingDone;
}

export function personaFromRole(role: string | undefined): "farmer" | "importer" | "buyer" | null {
  const value = norm(role ?? "");
  if (value.startsWith("farmer")) return "farmer";
  if (value.startsWith("importer")) return "importer";
  if (value.startsWith("buyer")) return "buyer";
  return null;
}
