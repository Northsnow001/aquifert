/**
 * The editable public website. One definition drives the admin editor, saving and validation,
 * and the shape the public pages read. Every value is a string; lists hold rows of strings.
 */

type Base = { label: string; hint?: string; required?: boolean };

export type TextField = Base & { kind: "text"; max: number };
export type LongTextField = Base & { kind: "textarea"; max: number; rows?: number };
/** One entry per line, e.g. bullet points. */
export type LinesField = Base & { kind: "lines"; max: number };
export type LinkField = Base & { kind: "link" };
export type ImageField = Base & { kind: "image" };
export type VideoField = Base & { kind: "video" };
export type IconField = Base & { kind: "icon" };
export type LeafField = TextField | LongTextField | LinesField | LinkField | ImageField | VideoField | IconField;
export type ListField = Base & { kind: "list"; item: Record<string, LeafField>; itemTitle: string; min: number; max: number };
export type Field = LeafField | ListField;

/** `hideable` sections can be switched off on the page without losing their content; `pinned` ones stay put when the rest are reordered. */
export type SectionSchema = { label: string; description?: string; hideable: boolean; pinned?: boolean; fields: Record<string, Field> };
/** `reorderable` pages store their section order in `_order`. */
export type PageSchema = { label: string; path: string | null; description: string; area?: "site" | "hub"; reorderable?: boolean; sections: Record<string, SectionSchema> };

type Opts = { hint?: string; required?: boolean };

const text = (label: string, opts: Opts & { max?: number } = {}): TextField => ({ kind: "text", label, max: opts.max ?? 160, hint: opts.hint, required: opts.required });
const long = (label: string, opts: Opts & { max?: number; rows?: number } = {}): LongTextField => ({ kind: "textarea", label, max: opts.max ?? 1200, rows: opts.rows, hint: opts.hint, required: opts.required });
const lines = (label: string, opts: Opts & { max?: number } = {}): LinesField => ({ kind: "lines", label, max: opts.max ?? 1500, hint: opts.hint ?? "One per line.", required: opts.required });
const link = (label: string, opts: Opts = {}): LinkField => ({ kind: "link", label, ...opts });
const image = (label: string, opts: Opts = {}): ImageField => ({ kind: "image", label, ...opts });
const video = (label: string, opts: Opts = {}): VideoField => ({ kind: "video", label, hint: "A direct link to an MP4 file.", ...opts });
const icon = (label = "Icon"): IconField => ({ kind: "icon", label });
function list<I extends Record<string, LeafField>>(label: string, itemTitle: keyof I & string, item: I, opts: Opts & { min?: number; max?: number } = {}) {
  return { kind: "list" as const, label, item, itemTitle, min: opts.min ?? 1, max: opts.max ?? 12, hint: opts.hint };
}
const section = <F extends Record<string, Field>>(label: string, description: string, fields: F, opts: { hideable?: boolean; pinned?: boolean } = {}) => ({
  label,
  description,
  hideable: opts.hideable ?? true,
  ...(opts.pinned ? { pinned: true } : {}),
  fields,
});

const seo = () =>
  section(
    "Search & sharing",
    "What Google, LinkedIn and WhatsApp show for this page.",
    {
      title: text("Page title", { max: 160, required: true, hint: "Shown in the browser tab and as the Google headline. Aim for under 65 characters." }),
      description: long("Description", { max: 400, rows: 3, required: true, hint: "Shown under the Google headline. Aim for under 160 characters." }),
    },
    { hideable: false },
  );

/** Menu and footer links: a name and where it goes. */
const navLinks = (label: string, opts: { min: number; max: number; hint?: string }) =>
  list(label, "label", { label: text("Name", { max: 40, required: true }), link: link("Goes to", { required: true, hint: "A page such as /platform, or a full web address." }) }, opts);

const ORDINAL = { primary: "Main", secondary: "Second", tertiary: "Third" } as const;

function button<N extends keyof typeof ORDINAL>(name: N) {
  const word = ORDINAL[name];
  return {
    [`${name}Label`]: text(`${word} button text`, { max: 80, hint: "Leave empty to hide the button." }),
    [`${name}Link`]: link(`${word} button link`),
  } as Record<`${N}Label`, TextField> & Record<`${N}Link`, LinkField>;
}

const backdrop = () => ({
  video: video("Background video", { hint: "Plays muted on a loop behind the text. Leave empty to show the still image only." }),
  image: image("Still image", { hint: "Shown while the video loads, and instead of it when there is no video." }),
  label: text("Video description", { max: 200, hint: "Read out by screen readers." }),
});

const faq = (description = "Questions and answers. Search engines read these too.") =>
  section("Questions (FAQ)", description, {
    kicker: text("Small heading", { max: 80 }),
    title: text("Heading", { max: 160, required: true }),
    sub: long("Intro", { max: 400, rows: 2 }),
    items: list("Questions", "q", { q: text("Question", { max: 200, required: true }), a: long("Answer", { max: 1200, rows: 4, required: true }) }, { min: 1, max: 12 }),
  });

const ctaBand = () =>
  section("Closing banner", "The navy banner at the bottom of the page.", {
    title: text("Heading", { max: 160, required: true }),
    subtitle: long("Text", { max: 400, rows: 2 }),
    buttonLabel: text("Button text", { max: 80, required: true, hint: "Sends visitors to sign in, or to the hub when signed in." }),
  });

const videoCard = () => ({
  tagline: text("Card statement", { max: 120, required: true }),
  cta: text("Card button text", { max: 60, required: true }),
  link: link("Card link", { required: true }),
  video: video("Video"),
  image: image("Still image"),
  label: text("Video description", { max: 200, hint: "Read out by screen readers." }),
});

const headline = () => ({
  title: text("Headline", { max: 120, required: true }),
  highlight: text("Highlighted ending", { max: 80, hint: "Shown in teal straight after the headline." }),
});

function tierCard<T extends string>(tier: T, word: string) {
  return {
    [`${tier}Name`]: text(`${word} name`, { max: 60, required: true }),
    [`${tier}Tagline`]: text(`${word} tagline`, { max: 120 }),
    [`${tier}Blurb`]: long(`${word} description`, { max: 300, rows: 2 }),
    [`${tier}Features`]: lines(`${word} included`, { max: 1200, hint: "One per line, shown with a tick." }),
    [`${tier}Missing`]: lines(`${word} not included`, { max: 800, hint: "One per line, shown greyed out. Leave empty for none." }),
  } as Record<`${T}Name` | `${T}Tagline`, TextField> & Record<`${T}Blurb`, LongTextField> & Record<`${T}Features` | `${T}Missing`, LinesField>;
}

/** Field prefixes for the AQ Analytics module cards; the page maps each module onto one. */
export const MODULE_CARD_FIELDS = {
  telex: "AQ TELEX",
  marketData: "Market Data",
  signal: "AQ Signal",
  freight: "Freight Analytics",
  supplyDemand: "Supply & Demand",
  briefing: "The Briefing",
  alerts: "Alerts & Brief",
} as const;
type ModuleCardKey = keyof typeof MODULE_CARD_FIELDS;

function moduleCards() {
  const fields: Record<string, LeafField> = {};
  for (const [key, name] of Object.entries(MODULE_CARD_FIELDS)) {
    fields[`${key}Name`] = text(`${name} card title`, { max: 60, required: true });
    fields[`${key}Pitch`] = long(`${name} card text`, { max: 300, rows: 2 });
  }
  return fields as Record<`${ModuleCardKey}Name`, TextField> & Record<`${ModuleCardKey}Pitch`, LongTextField>;
}

const crossSell = () =>
  section("Other plan", "The card pointing members to the other plan.", {
    eyebrow: text("Small heading", { max: 40 }),
    line: text("Statement", { max: 200, required: true }),
    buttonLabel: text("Button text", { max: 60, required: true }),
    buttonLink: link("Button link", { required: true }),
  });

const closingBanner = () =>
  section("Closing banner", "The navy banner at the bottom of the page.", {
    title: text("Heading", { max: 160, required: true }),
    body: long("Text", { max: 400, rows: 3 }),
    ...button("primary"),
    ...button("secondary"),
  });

export const SITE_SCHEMA = {
  home: {
    label: "Home",
    path: "/",
    description: "The landing page at aquifert.com.",
    sections: {
      seo: seo(),
      hero: section("Hero", "The full-screen video at the top of the page.", {
        title: text("Headline", { max: 160, required: true }),
        body: long("Text under the headline", { max: 900, rows: 5 }),
        ...button("primary"),
        ...button("secondary"),
        ...button("tertiary"),
        ...backdrop(),
      }),
      motion: section("AQ ONE analytics", "Heading and the moving picture cards below the hero.", {
        kicker: text("Small heading", { max: 160 }),
        title: text("Heading", { max: 160, required: true }),
        body: long("Text", { max: 600, rows: 3 }),
        cards: list("Picture cards", "tagline", videoCard(), { min: 0, max: 8 }),
        wideTagline: text("Wide card statement", { max: 120, hint: "The wide card under the grid. Leave empty to hide it." }),
        wideCta: text("Wide card button text", { max: 60 }),
        wideLink: link("Wide card link"),
        wideVideo: video("Wide card video"),
        wideImage: image("Wide card still image"),
        wideLabel: text("Wide card video description", { max: 200 }),
      }),
      platform: section("AQ ONE workspace", "The grid of platform features.", {
        kicker: text("Small heading", { max: 80 }),
        title: text("Heading", { max: 160, required: true }),
        body: long("Text", { max: 600, rows: 2 }),
        features: list("Features", "title", { icon: icon(), title: text("Title", { max: 80, required: true }), desc: long("Description", { max: 300, rows: 2 }) }, { min: 1, max: 12 }),
        ...button("primary"),
      }),
      products: section("Products & services", "The three picture cards of what Aquifert trades.", {
        kicker: text("Small heading", { max: 80 }),
        title: text("Heading", { max: 160, required: true }),
        items: list("Cards", "title", { title: text("Title", { max: 80, required: true }), desc: long("Description", { max: 400, rows: 3 }), image: image("Picture"), alt: text("Picture description", { max: 200 }) }, { min: 1, max: 6 }),
      }),
      why: section("Why Aquifert", "The reasons the trade chooses Aquifert.", {
        kicker: text("Small heading", { max: 80 }),
        title: text("Heading", { max: 160, required: true }),
        items: list("Reasons", "title", { title: text("Title", { max: 80, required: true }), desc: long("Description", { max: 500, rows: 3 }) }, { min: 1, max: 9 }),
      }),
      audiences: section("Fertiliser and analysis", "Two columns, shown as tabs on phones.", {
        kicker: text("Small heading", { max: 80 }),
        title: text("Heading", { max: 160, required: true }),
        leftTitle: text("Left column title", { max: 60, required: true }),
        leftItems: list("Left column points", "title", { title: text("Title", { max: 80, required: true }), desc: long("Description", { max: 500, rows: 3 }) }, { min: 1, max: 6 }),
        rightTitle: text("Right column title", { max: 60, required: true }),
        rightItems: list("Right column points", "title", { title: text("Title", { max: 80, required: true }), desc: long("Description", { max: 500, rows: 3 }) }, { min: 1, max: 6 }),
      }),
      zero: section("AQ ZERO banner", "The navy card promoting AQ ZERO.", {
        kicker: text("Small heading", { max: 80 }),
        title: text("Heading", { max: 160, required: true }),
        body: long("Text", { max: 600, rows: 3 }),
        ...button("primary"),
        note: text("Note beside the button", { max: 120 }),
      }),
      faq: faq(),
      closing: section("Closing banner", "The navy strip at the bottom of the page.", {
        title: text("Heading", { max: 160, required: true }),
        ...button("primary"),
        ...button("secondary"),
      }),
    },
  },
  platform: {
    label: "Platform",
    path: "/platform",
    description: "What Aquifert ONE does.",
    sections: {
      seo: seo(),
      hero: section("Hero", "The video at the top of the page.", {
        title: text("Headline", { max: 160, required: true }),
        body: long("Text under the headline", { max: 600, rows: 3 }),
        ...button("primary"),
        ...button("secondary"),
        ...backdrop(),
      }),
      blocks: section("Feature spotlights", "Text beside a video, alternating sides.", {
        items: list(
          "Spotlights",
          "title",
          {
            icon: icon(),
            kicker: text("Label", { max: 60 }),
            title: text("Heading", { max: 160, required: true }),
            body: long("Text", { max: 900, rows: 4 }),
            points: lines("Tick points", { max: 800 }),
            video: video("Video"),
            image: image("Still image"),
            label: text("Video description", { max: 200 }),
            caption: text("Caption under the video", { max: 160 }),
          },
          { min: 0, max: 6 },
        ),
      }),
      more: section("More capabilities", "The cards under the spotlights.", {
        kicker: text("Small heading", { max: 80 }),
        title: text("Heading", { max: 160, required: true }),
        sub: long("Intro", { max: 400, rows: 2 }),
        items: list("Cards", "title", { icon: icon(), title: text("Title", { max: 80, required: true }), desc: long("Description", { max: 500, rows: 3 }) }, { min: 0, max: 9 }),
      }),
      faq: faq(),
      cta: ctaBand(),
    },
  },
  why: {
    label: "Why Aquifert",
    path: "/why-aquifert",
    description: "The case for trading with Aquifert.",
    sections: {
      seo: seo(),
      hero: section("Hero", "The video at the top of the page.", {
        title: text("Headline", { max: 160, required: true }),
        highlight: text("Highlighted ending", { max: 120, hint: "Shown in teal straight after the headline." }),
        body: long("Text under the headline", { max: 600, rows: 3 }),
        ...button("primary"),
        ...button("secondary"),
        ...backdrop(),
      }),
      network: section("The network in motion", "Heading and picture cards.", {
        kicker: text("Small heading", { max: 80 }),
        title: text("Heading", { max: 160, required: true }),
        cards: list("Picture cards", "tagline", videoCard(), { min: 0, max: 6 }),
      }),
      reasons: section("The Aquifert difference", "Cards with the reasons to choose Aquifert.", {
        kicker: text("Small heading", { max: 80 }),
        title: text("Heading", { max: 160, required: true }),
        sub: long("Intro", { max: 400, rows: 2 }),
        items: list("Reasons", "title", { icon: icon(), title: text("Title", { max: 80, required: true }), desc: long("Description", { max: 500, rows: 3 }) }, { min: 1, max: 9 }),
      }),
      audiences: section("How Aquifert helps", "Buyers and suppliers, side by side.", {
        kicker: text("Small heading", { max: 80 }),
        title: text("Heading", { max: 160, required: true }),
        sub: long("Intro", { max: 400, rows: 2 }),
        buyersTitle: text("Buyers card title", { max: 80, required: true }),
        buyers: lines("Buyers points", { max: 1000 }),
        suppliersTitle: text("Suppliers card title", { max: 80, required: true }),
        suppliers: lines("Suppliers points", { max: 1000 }),
      }),
      community: section("Our growing community", "The video beside the closing statement.", {
        kicker: text("Small heading", { max: 80 }),
        title: text("Heading", { max: 160, required: true }),
        body: long("Text", { max: 900, rows: 4 }),
        points: lines("Tick points", { max: 800 }),
        video: video("Video"),
        image: image("Still image"),
        label: text("Video description", { max: 200 }),
        caption: text("Caption under the video", { max: 160 }),
      }),
      faq: faq(),
      cta: ctaBand(),
    },
  },
  membership: {
    label: "Membership",
    path: "/membership",
    description: "AQ ZERO tiers and AQ Analytics.",
    sections: {
      seo: seo(),
      hero: section("Hero", "The video at the top of the page.", {
        title: text("Headline", { max: 160, required: true }),
        highlight: text("Highlighted ending", { max: 120, hint: "Shown in teal straight after the headline." }),
        body: long("Text under the headline", { max: 600, rows: 3 }),
        ...button("primary"),
        ...button("secondary"),
        ...backdrop(),
      }),
      sprout: section("AQ ZERO Sprout card", "Plan card wording. Prices and access are set in the admin under Access & allowances.", {
        name: text("Name", { max: 60, required: true }),
        tagline: text("Tagline", { max: 120 }),
        features: lines("Included", { hint: "One per line. Leave empty to list the plan's built-in features." }),
      }),
      harvest: section("AQ ZERO Harvest card", "Shown with the Most popular badge.", {
        name: text("Name", { max: 60, required: true }),
        tagline: text("Tagline", { max: 120 }),
        features: lines("Included", { hint: "One per line. Leave empty to list the plan's built-in features." }),
      }),
      scale: section("AQ ZERO Scale card", "Plan card wording.", {
        name: text("Name", { max: 60, required: true }),
        tagline: text("Tagline", { max: 120 }),
        features: lines("Included", { hint: "One per line. Leave empty to list the plan's built-in features." }),
      }),
      analytics: section("AQ Analytics card", "Plan card wording.", {
        name: text("Name", { max: 60, required: true }),
        tagline: text("Tagline", { max: 120 }),
        features: lines("Included", { hint: "One per line. Leave empty to list the plan's built-in features." }),
      }),
      notes: section("Notes under the plans", "Three short cards.", {
        items: list("Notes", "title", { icon: icon(), title: text("Title", { max: 80, required: true }), text: long("Text", { max: 400, rows: 3 }) }, { min: 0, max: 6 }),
      }),
      wide: section("Wide picture card", "Sends visitors to sign in, or to the hub when signed in.", {
        tagline: text("Card statement", { max: 120, hint: "Leave empty to hide the card." }),
        cta: text("Card button text", { max: 60 }),
        video: video("Video"),
        image: image("Still image"),
        label: text("Video description", { max: 200 }),
      }),
      faq: faq(),
      cta: ctaBand(),
    },
  },
  contact: {
    label: "Contact",
    path: "/contact",
    description: "How to reach the desk. The form itself and where it sends are fixed.",
    sections: {
      seo: seo(),
      hero: section("Hero", "The video at the top of the page.", {
        title: text("Headline", { max: 160, required: true }),
        body: long("Text under the headline", { max: 400, rows: 2 }),
        ...backdrop(),
      }),
      channels: section("Ways to reach us", "The four options visitors pick before writing. The text also shows after they send.", {
        whatsappTitle: text("WhatsApp title", { max: 60, required: true }),
        whatsappDesc: long("WhatsApp description", { max: 240, rows: 2 }),
        callTitle: text("Book a call title", { max: 60, required: true }),
        callDesc: long("Book a call description", { max: 240, rows: 2 }),
        messageTitle: text("Message title", { max: 60, required: true }),
        messageDesc: long("Message description", { max: 240, rows: 2 }),
        callbackTitle: text("Callback title", { max: 60, required: true }),
        callbackDesc: long("Callback description", { max: 240, rows: 2 }),
      }),
      faq: faq(),
      closing: section("Look around first", "The last section of the page.", {
        title: text("Heading", { max: 160, required: true }),
        body: long("Text", { max: 400, rows: 2 }),
        ...button("primary"),
        ...button("secondary"),
      }),
    },
  },
  help: {
    label: "Help",
    path: "/help",
    description: "Help centre and the public Aquibot answers.",
    sections: {
      seo: seo(),
      hero: section("Heading", "The navy band at the top of the page.", {
        kicker: text("Small heading", { max: 80 }),
        title: text("Headline", { max: 160, required: true }),
        highlight: text("Highlighted ending", { max: 120, hint: "Shown in teal straight after the headline." }),
        body: long("Text", { max: 400, rows: 2 }),
      }),
      assistant: section("Aquibot answers", "Aquibot on this page picks the answer whose keywords best match the question.", {
        greeting: long("Opening message", { max: 400, rows: 2, required: true }),
        suggestions: lines("Suggested questions", { max: 600 }),
        answers: list(
          "Answers",
          "keywords",
          {
            keywords: text("Keywords", { max: 300, required: true, hint: "Comma separated, e.g. freight, shipping, tracking." }),
            answer: long("Answer", { max: 1000, rows: 4, required: true }),
          },
          { min: 1, max: 30 },
        ),
        fallback: long("When no answer fits", { max: 600, rows: 3, required: true }),
      }),
      topics: section("Help topics", "Links beside Aquibot.", {
        title: text("Heading", { max: 80, required: true }),
        items: list("Topics", "title", { title: text("Title", { max: 80, required: true }), body: long("Text", { max: 300, rows: 2 }), link: link("Link", { required: true }) }, { min: 0, max: 8 }),
      }),
      desk: section("Still need a human?", "The navy card under the topics.", {
        title: text("Heading", { max: 80, required: true }),
        body: long("Text", { max: 300, rows: 2 }),
        ...button("primary"),
      }),
    },
  },
  global: {
    label: "Header & footer",
    path: null,
    description: "Shown on every public page.",
    sections: {
      header: section(
        "Header",
        "The menu and buttons at the top of every public page.",
        {
          menu: navLinks("Menu links", { min: 1, max: 8, hint: "Six or fewer fit on one line." }),
          utility: navLinks("Small links", { min: 0, max: 4, hint: "Beside the search button on wide screens." }),
          loginLabel: text("Log in link text", { max: 40, required: true }),
          accessLabel: text("Request access button text", { max: 40, required: true, hint: "Opens the sign-up page." }),
        },
        { hideable: false },
      ),
      footer: section(
        "Footer",
        "Company details and links at the bottom of every public page.",
        {
          about: long("About Aquifert", { max: 500, rows: 3 }),
          handle: text("Social handle", { max: 60 }),
          linkedin: link("LinkedIn page"),
          email: text("Contact email", { max: 120, required: true }),
          firstTitle: text("First link column heading", { max: 40, hint: "Leave empty to hide the column." }),
          firstLinks: navLinks("First column links", { min: 0, max: 10 }),
          secondTitle: text("Second link column heading", { max: 40, hint: "Leave empty to hide the column." }),
          secondLinks: navLinks("Second column links", { min: 0, max: 10 }),
          copyright: text("Copyright line", { max: 160, hint: "{year} becomes the current year." }),
          disclaimer: long("Market data disclaimer", { max: 800, rows: 4 }),
        },
        { hideable: false },
      ),
    },
  },
  aqZero: {
    label: "AQ Zero",
    path: "/hub/plans/aq-zero",
    description: "The AQ Zero plan page members open from Plans in the hub.",
    area: "hub",
    reorderable: true,
    sections: {
      hero: section(
        "Hero",
        "The video banner at the top. It always stays first.",
        {
          eyebrow: text("Label above the headline", { max: 40, required: true }),
          badge: text("Badge beside the label", { max: 30, hint: "Leave empty to hide it." }),
          ...headline(),
          sub: long("Text under the headline", { max: 400, rows: 2 }),
          ...button("primary"),
          ...button("secondary"),
          ...backdrop(),
        },
        { hideable: false, pinned: true },
      ),
      notice: section("Notice strip", "The teal strip under the hero.", {
        badge: text("Badge", { max: 30, hint: "Leave empty to hide it." }),
        text: long("Text", { max: 300, rows: 2, required: true }),
      }),
      programmes: section("Programme cards", "The three AQ Zero tiers. Members register from these cards.", {
        ...tierCard("sprout", "Sprout"),
        ...tierCard("harvest", "Harvest"),
        ...tierCard("scale", "Scale"),
        popularLabel: text("Badge on the most popular card", { max: 30, required: true }),
        buttonLabel: text("Register button text", { max: 60, required: true, hint: "{name} becomes the programme name." }),
        footnote: text("Note under the cards", { max: 200, hint: "Leave empty to hide it." }),
      }),
      compare: section("Compare plans", "The table of plans. Its rows come from Access & allowances.", {
        title: text("Heading", { max: 80, required: true }),
        sub: text("Text under the heading", { max: 200 }),
      }),
      steps: section("How it works", "Numbered steps.", {
        kicker: text("Small heading", { max: 80 }),
        title: text("Heading", { max: 160, required: true }),
        items: list("Steps", "title", { icon: icon(), title: text("Title", { max: 80, required: true }), text: long("Text", { max: 400, rows: 3 }) }, { min: 1, max: 6 }),
      }),
      crossSell: crossSell(),
      closing: closingBanner(),
    },
  },
  aqAnalytics: {
    label: "AQ Analytics",
    path: "/hub/plans/aq-analytics",
    description: "The AQ Analytics plan page members open from Plans in the hub.",
    area: "hub",
    reorderable: true,
    sections: {
      hero: section(
        "Hero",
        "The video banner at the top. It always stays first.",
        {
          eyebrow: text("Label above the headline", { max: 40, required: true }),
          badge: text("Badge beside the label", { max: 30, hint: "Leave empty to hide it." }),
          ...headline(),
          sub: long("Text under the headline", { max: 400, rows: 2 }),
          registerLabel: text("Main button text, before they have the plan", { max: 60, required: true }),
          openLabel: text("Main button text, once they have the plan", { max: 60, required: true }),
          ...button("secondary"),
          ...backdrop(),
        },
        { hideable: false, pinned: true },
      ),
      plan: section("Plan and modules", "The plan card beside the modules it includes. Which modules show comes from Access & allowances.", {
        name: text("Plan name", { max: 60, required: true }),
        tagline: text("Tagline", { max: 120 }),
        features: lines("Included", { max: 1500, hint: "One per line, shown with a tick." }),
        missing: lines("Not included", { max: 800, hint: "One per line, shown greyed out. Leave empty for none." }),
        registerLabel: text("Card button text, before they have the plan", { max: 60, required: true }),
        openLabel: text("Card button text, once they have the plan", { max: 60, required: true }),
        ...moduleCards(),
      }),
      crossSell: crossSell(),
      closing: section("Closing banner", "The navy banner at the bottom of the page.", {
        title: text("Heading", { max: 160, required: true }),
        body: long("Text", { max: 400, rows: 3 }),
        ...button("primary"),
        registerLabel: text("Register button text", { max: 60, hint: "Shown only to members without the plan. Leave empty to hide it." }),
      }),
    },
  },
} satisfies Record<string, PageSchema>;

export type SitePageKey = keyof typeof SITE_SCHEMA;
export const SITE_PAGE_KEYS = Object.keys(SITE_SCHEMA) as SitePageKey[];

type LeafValue = string;
type FieldValue<F> = F extends { kind: "list"; item: infer I } ? { [K in keyof I]: LeafValue }[] : LeafValue;
/** `hidden` is only ever stored as `true`; a visible section has no flag. */
type SectionValue<S> = S extends { fields: infer F } ? { [K in keyof F]: FieldValue<F[K]> } & { hidden?: true } : never;
type PageValue<P> = P extends { sections: infer S } ? { [K in keyof S]: SectionValue<S[K]> } & { _order?: string[] } : never;

export type SiteContent = { [K in SitePageKey]: PageValue<(typeof SITE_SCHEMA)[K]> };
export type SitePage<K extends SitePageKey> = SiteContent[K];

/** False when the editor has switched the section off. */
export const isShown = (section: { hidden?: true }) => section.hidden !== true;

/** Pinned sections in schema order, then the rest in the saved order; unknown or repeated keys are dropped and new sections join the end. */
export function sectionOrder(key: SitePageKey, saved?: unknown): string[] {
  const sections = Object.entries(SITE_SCHEMA[key].sections as Record<string, SectionSchema>);
  const pinned = sections.filter(([, section]) => section.pinned).map(([name]) => name);
  const movable = sections.filter(([, section]) => !section.pinned).map(([name]) => name);
  const kept = [...new Set(Array.isArray(saved) ? saved.filter((name): name is string => typeof name === "string" && movable.includes(name)) : [])];
  return [...pinned, ...kept, ...movable.filter((name) => !kept.includes(name))];
}

/** What `_order` stores: the movable sections only. */
export const movableOrder = (key: SitePageKey, saved?: unknown) => sectionOrder(key, saved).filter((name) => !(SITE_SCHEMA[key].sections as Record<string, SectionSchema>)[name].pinned);

export type SiteContentMeta = Partial<Record<SitePageKey, { at: string; by: string }>>;
