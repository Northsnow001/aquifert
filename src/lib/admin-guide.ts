export type GuideIcon =
  | "start"
  | "routine"
  | "telex"
  | "indicators"
  | "hedge"
  | "freight"
  | "tools"
  | "library"
  | "collections"
  | "calculator"
  | "scale"
  | "anchor"
  | "inbox"
  | "zero"
  | "aquibot"
  | "banned"
  | "settings"
  | "import";

export type GuideTask = { title: string; steps: string[] };

export type GuideSection = {
  id: string;
  group: string;
  title: string;
  icon: GuideIcon;
  href?: string;
  summary: string;
  tasks: GuideTask[];
  tips?: string[];
};

export const GUIDE: GuideSection[] = [
  {
    id: "start",
    group: "Getting started",
    title: "How the admin works",
    icon: "start",
    href: "/admin",
    summary:
      "Everything members see in the hub is published from here. Each module in the sidebar owns one part of the hub, and a save goes live straight away. There is no separate publish step unless a module says so.",
    tasks: [
      {
        title: "Find your way around",
        steps: [
          "The sidebar groups modules the way the hub does: Publishing, Library, Calculators, Desk, Assistant and Members.",
          "Badges beside a module flag what needs you: drafts waiting, stale prices, ports to review, new enquiries.",
          "The tiles at the top of each page summarise its state at a glance.",
          "Pages with several jobs split them into tabs. The tab is part of the address, so you can bookmark or share it.",
        ],
      },
      {
        title: "Save your work",
        steps: [
          "Editors with a Save bar show Unsaved changes as soon as you edit. Press Save changes, or Ctrl+S (Cmd+S on a Mac).",
          "The browser asks before you leave a page with unsaved changes.",
          "After a save the bar shows the time, and the hub serves the new version on the next page load.",
        ],
      },
    ],
    tips: [
      "Open the hub in a second tab (Open the hub, bottom of the sidebar) and refresh it after a save to see what members see.",
      "Admin access comes from the admin list set when the site is deployed. Admin accounts cannot be banned, and usage limits never apply to them.",
    ],
  },
  {
    id: "routine",
    group: "Getting started",
    title: "Daily and weekly routine",
    icon: "routine",
    summary: "A short checklist that keeps the hub current. Each item takes a few minutes.",
    tasks: [
      {
        title: "Every day",
        steps: [
          "Post the day's intel in Telex and clear any drafts.",
          "Check Enquiries for new Order Desk requests and Contact messages.",
          "Check Aquifert Zero for registrations still marked New.",
          "Glance at the Freight Calculator badge. Check means a market data source failed on its last refresh.",
        ],
      },
      {
        title: "Every week",
        steps: [
          "Import the new nitrogen price file in Netback, Benchmark prices. The badge turns stale after 14 days.",
          "Publish the week's hedge report and move the market dials if sentiment has shifted.",
          "Add verified fixtures to the Freight Calculator so quotes stay anchored to real trades.",
          "Review ports flagged in Ports, and duty records members looked up in Netback, Import duties.",
        ],
      },
    ],
  },
  {
    id: "telex",
    group: "Publishing",
    title: "Telex",
    icon: "telex",
    href: "/admin/telex",
    summary:
      "The intel feed on the hub home page. Published messages appear in order of their publish time, and each member sees the ones their plan allows.",
    tasks: [
      {
        title: "Post a message",
        steps: [
          "Press New Telex, from the Telex page or the dashboard.",
          "Write the headline and the message. Leave the headline empty to use the first words of the message.",
          "Format with Markdown: **bold**, *italic*, headings, lists, quotes, links, code, --- rules, images from an https address, and pipe tables with :--- alignment. The Hub preview shows exactly how members read it.",
          "Choose who can read it: AQ ONE, AQ Analytics and AQ ZERO members; AQ Analytics and AQ ZERO; or AQ ZERO only.",
          "Add tags. Suggestions come from tags you have used before, which keeps them consistent.",
          "Add a thumbnail: upload or drop an image (large photos are resized for you), or paste an https image link. Without one, members see the product picture. The newest flashes show beside AQ View on the hub, the Telex Feed shows the opening lines of each with Read more, and every flash opens on its own page with the picture and full message.",
          "Set the status to Published and save. Leave it as Draft to finish later, or Private to keep it from members.",
        ],
      },
      {
        title: "Edit, reuse or remove",
        steps: [
          "Filter by All, Published, Drafts or Private, and search the messages.",
          "Duplicate a message to start a new draft from it. The copy never goes live on its own.",
          "Changing the publish time moves a message in the feed, which is ordered newest first.",
        ],
      },
      {
        title: "See who read a message",
        steps: [
          "The Reads column shows how many members read each message, out of how many opened it, and the average reading time. Press it, or Reads on the edit page, to see each member.",
          "A visit counts as read once the member has spent 10 seconds on the full message. Shorter visits show as Opened.",
          "Time on page counts only while the tab is in view and the member is active; it pauses after a minute without scrolling, typing or moving the pointer. Scrolled shows how far down the message they got.",
          "Read report ranks every message by reads and lists the most engaged members, over 7, 30 or 90 days or all time. Desk team visits are left out unless you include them.",
          "Members see a Read mark on the flashes they have read in the Telex Feed.",
        ],
      },
    ],
  },
  {
    id: "indicators",
    group: "Publishing",
    title: "Market Indicators",
    icon: "indicators",
    href: "/admin/indicators",
    summary:
      "Nitrogen, phosphate and potassium sentiment. Each reading sets the direction shown in the hub's moving market ticker, with the caption beside it. The notes give Aquibot the reasoning.",
    tasks: [
      {
        title: "Move the dials",
        steps: [
          "Set each reading from 0 to 100. Above 66 reads Bullish (Firming in the ticker), 34 to 66 Neutral (Steady), and below 34 Bearish (Softening).",
          "Write the caption as one line members can take in at a glance. It scrolls past in the ticker.",
          "Use the notes for the reasoning. Aquibot uses them in its answers, and the ticker shows them when the caption is empty.",
          "Save. The dashboard shows the dials as you set them, and the hub ticker updates.",
        ],
      },
    ],
  },
  {
    id: "hedge",
    group: "Publishing",
    title: "Hedge Tables",
    icon: "hedge",
    href: "/admin/hedge",
    summary:
      "The Direct Hedge and Paper Forward Curves block on the hub home page. Members see the latest published report only, with any urea table shown first.",
    tasks: [
      {
        title: "Publish a report from a paste",
        steps: [
          "Press Paste a hedge report, or use the dashboard shortcut.",
          "Paste the report text. It is split into tables by commodity, with the direction of each price.",
          "Check the tables, correct any cell, set the report date and save.",
          "The latest published report also feeds Aquibot, so members can ask about today's hedge levels.",
        ],
      },
      {
        title: "Build or correct a report by hand",
        steps: [
          "Open a report, add a commodity section, then add rows for each period and price.",
          "Earlier reports stay available to members as older dates, so correct them rather than deleting them.",
        ],
      },
    ],
  },
  {
    id: "freight-routes",
    group: "Publishing",
    title: "Freight Routes",
    icon: "freight",
    href: "/admin/freight",
    summary:
      "Open freight enquiries shown as Freight Analytics on the hub home page. The sidebar badge counts visible rows, or reads off when the block is hidden.",
    tasks: [
      {
        title: "Keep the list current",
        steps: [
          "Add a row for each open enquiry and fill in its columns.",
          "Hide rows that are filled or on hold. Hidden rows stay here for later without members seeing them.",
          "Use the switch at the top to hide the whole board from the hub home while the list is being reworked.",
        ],
      },
    ],
  },
  {
    id: "tools",
    group: "Publishing",
    title: "AQ Trader Tools commentary",
    icon: "tools",
    href: "/admin/tools",
    summary:
      "The Commentary block beneath the Tools tabs (World Map, Cost Calculator, How It's Made, Glossary). The tabs are built in; only the commentary is edited here.",
    tasks: [
      {
        title: "Update the commentary",
        steps: [
          "Edit the text in place. Headings, lists and links keep their formatting.",
          "Save. Members see the new commentary the next time they open Tools.",
          "Clear the text and save to hide the block entirely.",
        ],
      },
    ],
    tips: ["Aquibot reads the commentary, How It's Made and the Glossary when answering, so keep the commentary factual."],
  },
  {
    id: "library",
    group: "Library",
    title: "Library files",
    icon: "library",
    href: "/admin/library",
    summary:
      "Files in the member Document Library. Access sets which plans can download a file. Private files, and files that sit only in private collections, stay hidden from members.",
    tasks: [
      {
        title: "Add files",
        steps: [
          "Press Upload files, then choose one or more files.",
          "Give each a clear title and description. Members search on both.",
          "Set access by plan and pick the collections it belongs to.",
          "Tick Private to prepare a file before members can see it.",
        ],
      },
      {
        title: "Tidy the library",
        steps: [
          "Filter by collection or access, or search, to find what needs attention.",
          "Download a file to check it, edit its details, or delete it when it is out of date. Tick several rows to act on them together.",
        ],
      },
    ],
  },
  {
    id: "collections",
    group: "Library",
    title: "Collections",
    icon: "collections",
    href: "/admin/collections",
    summary: "Collections group files in the member Document Library. They can be nested, and private collections stay out of the member view.",
    tasks: [
      {
        title: "Organise files",
        steps: [
          "Add a collection with a name and, if it belongs inside another, a parent.",
          "Mark it private while you fill it. Files that sit only in private collections stay hidden.",
          "Assign files from the Library page, in each file's Collections field.",
        ],
      },
    ],
  },
  {
    id: "freight-calculator",
    group: "Calculators",
    title: "Freight Calculator",
    icon: "calculator",
    href: "/admin/freight-calculator",
    summary:
      "The live inputs behind member freight quotes: BDI and bunker prices, verified fixtures that anchor the rate, pricing rules and usage limits, and every calculation members run.",
    tasks: [
      {
        title: "Market data",
        steps: [
          "Check the BDI and bunker prices and when they last refreshed.",
          "A check badge means a source failed on its last refresh. The last good value stays in use until it recovers.",
          "No BDI means the calculator is running on its built-in default. Enter a value or refresh the source.",
        ],
      },
      {
        title: "Fixtures",
        steps: [
          "Add verified fixtures one at a time, from a sheet import, or from an AI import of pasted text.",
          "Review imported rows before they feed benchmarks. Filter by Inactive or Not feeding benchmarks to find them.",
          "Deactivate a fixture that should stop influencing quotes instead of deleting it.",
        ],
      },
      {
        title: "Pricing, logs and debug",
        steps: [
          "Pricing holds each plan's monthly calculation limit (0 means unlimited), the cargo, origin and war-risk premiums, the premium taper and fixture blending.",
          "Calculation logs list every quote with its inputs and result. Filter, then export to CSV.",
          "Debug shows how the model reaches a rate, to explain a quote a member queries.",
        ],
      },
    ],
  },
  {
    id: "netback",
    group: "Calculators",
    title: "Netback",
    icon: "scale",
    href: "/admin/netback",
    summary:
      "The FOB benchmarks origins are ranked against, the import duty each destination carries, the trade costs in every landed price, and every calculation members run.",
    tasks: [
      {
        title: "Load the weekly prices",
        steps: [
          "Open Benchmark prices and import the week's nitrogen price file.",
          "The preview shows the price found for each origin and the series it came from. Check any change that looks large.",
          "Apply the prices, then check the Ranking preview. It uses the table, including unsaved edits.",
          "Save. The week and date appear in the hub, and the previous week is kept in the price history.",
        ],
      },
      {
        title: "Import duties",
        steps: [
          "Each record sets the rate and default duty switch for a destination country. Members can still change both.",
          "Looked up, no record lists countries members calculated for without a duty record. Add the ones that matter.",
          "Write the note as guidance, and ask members to confirm rates with local customs.",
        ],
      },
      {
        title: "Costs, limits and logs",
        steps: [
          "Costs & limits holds each plan's monthly limit, log retention, and the trade costs in every landed price.",
          "Use live values copies the Freight Calculator's current BDI and bunker price into the freight model.",
          "Calculation logs show every run with the destination, the best origin and the result. Export to CSV.",
        ],
      },
    ],
    tips: ["Origins with no price are left out of the ranking, so a missing row never produces a misleading landed cost."],
  },
  {
    id: "ports",
    group: "Calculators",
    title: "Ports",
    icon: "anchor",
    href: "/admin/ports",
    summary:
      "The port registry behind the freight and netback calculators. Every port is checked for code, region and coordinate problems, and the sidebar badge counts those to review.",
    tasks: [
      {
        title: "Keep ports accurate",
        steps: [
          "Filter to ports flagged for review and fix the code, region or coordinates shown.",
          "Add a port with its country, region and coordinates. The map in the editor confirms the position.",
          "Make a port inactive to remove it from member search without losing its history.",
        ],
      },
    ],
  },
  {
    id: "enquiries",
    group: "Desk",
    title: "Enquiries",
    icon: "inbox",
    href: "/admin/enquiries",
    summary:
      "Order Desk requests and Contact messages sent from the hub, newest first. Each entry shows the signed-in account that sent it.",
    tasks: [
      {
        title: "Handle an enquiry",
        steps: [
          "Switch between Order Desk and Contact with the tabs.",
          "Open an entry to see every field: product, quantity, packaging, shipment and arrival months, whether they take over 1,000 tonnes a year and whether they want a call.",
          "Reply from your own mailbox. The member also received the confirmation email set in Settings.",
        ],
      },
    ],
    tips: ["Each account can send five Order Desk enquiries in ten minutes. Automated form fills are dropped silently."],
  },
  {
    id: "zero",
    group: "Desk",
    title: "Aquifert Zero",
    icon: "zero",
    href: "/admin/zero",
    summary:
      "Members who registered for the Zero pilot from the Aquifert Zero tab on the Order Desk. Move each one through the stages and keep notes for the desk.",
    tasks: [
      {
        title: "Work the pipeline",
        steps: [
          "Filter by stage: New, Contacted, Slot offered and Not a fit.",
          "Open a registration to see the product, annual volume, company and their notes.",
          "Set the stage, add a desk note and save. The note is for admins only.",
          "Pilot slots this quarter counts registrations offered a slot this quarter, out of 12.",
        ],
      },
      {
        title: "Show or hide the tab",
        steps: [
          "Settings, Aquifert Zero emails holds the Show on the hub switch, the confirmation emails and the success message.",
          "Turning it off hides the tab and refuses new registrations. Existing ones stay here.",
        ],
      },
    ],
    tips: ["Export CSV gives the full pipeline, including notes, for planning outside the admin."],
  },
  {
    id: "aquibot",
    group: "Assistant",
    title: "Aquibot Trader AI",
    icon: "aquibot",
    href: "/admin/aquibot",
    summary:
      "How Aquibot answers members: the system prompt, usage limits, retrieval tuning, query vocabulary, the knowledge base and member conversations.",
    tasks: [
      {
        title: "Change the prompt safely",
        steps: [
          "Edit the test draft in Prompt and save it. Only admins using test mode in the hub chat get the draft.",
          "Ask Aquibot real questions in test mode and compare the answers.",
          "Publish when you are happy. Changes shows the difference from the published version, and Roll back restores an earlier one.",
        ],
      },
      {
        title: "Tune the answers",
        steps: [
          "Settings holds monthly message limits per plan (0 means unlimited), conversation memory, the intro message, the retrieval budget, ranking rules and models.",
          "Date fallback grace (default 14 days, up to 60): when a question names a date or month with no Telex inside it, Aquibot widens the search this far each side and marks the answer as using the nearest entries.",
          "Vocabulary rewrites members' phrases to the terms in your documents before searching. The query tester shows the rewrite with unsaved lists.",
          "Extraction rules control how prices and names are pulled out of files.",
          "Knowledge base shows what is indexed. Find text in the index to check exactly what Aquibot has stored.",
          "Retrieval debug traces a question without calling the answer model or counting usage.",
          "Sessions and Logs show member conversations and any errors.",
        ],
      },
    ],
  },
  {
    id: "banned",
    group: "Members",
    title: "Banned users",
    icon: "banned",
    href: "/admin/banned",
    summary: "Remove a member's access to Aquifert ONE and stop the address signing up again. Admin accounts are protected.",
    tasks: [
      {
        title: "Ban a member",
        steps: [
          "Start typing the email. Suggestions come from members who used the calculators, the Order Desk or Zero.",
          "Write the reason. Only admins see it.",
          "Press Ban member and confirm.",
          "On their next page load the member sees a suspended notice with a sign-out button. Every tool, download and form refuses the account.",
          "The address cannot register again. They see the general throwaway-address message, so the ban is not revealed.",
        ],
      },
      {
        title: "Reinstate",
        steps: [
          "Press Reinstate on the member's row and add a note if you want one.",
          "Access returns straight away, with their history and settings intact.",
          "History records every ban and reinstatement with who made it. Export it to CSV.",
        ],
      },
    ],
  },
  {
    id: "settings",
    group: "Members",
    title: "Settings",
    icon: "settings",
    href: "/admin/settings",
    summary: "The emails the Order Desk and Aquifert Zero send, who may register, how email leaves the platform, and where data is stored.",
    tasks: [
      {
        title: "Edit an email",
        steps: [
          "Open Order Desk emails or Aquifert Zero emails. Each has a member email and a desk email.",
          "Set the desk address, the success message members see, and whether each email is sent.",
          "Edit the subject and body. Click a tag chip to insert it at the cursor. Keep [form-details] in the body: it lists everything the member entered.",
          "The live preview follows the email you are editing. Send test to me delivers it to your address.",
          "Default restores the original wording of that email.",
        ],
      },
      {
        title: "Sign-up rules",
        steps: [
          "Require a work email to refuse free mail providers such as Gmail and Outlook. Disposable addresses are always refused.",
          "Always refuse blocks named domains or addresses. Always accept lets a named address through the work email rule.",
          "Check an address shows the verdict and the exact message the person would see, using your unsaved rules.",
        ],
      },
      {
        title: "Email delivery",
        steps: [
          "The status card shows whether the email service is connected. Until it is, emails are held here instead of sent.",
          "Set the sender name and the reply-to address members' replies go to.",
          "The outbox lists recent emails as sent, held or failed. Open one to see it exactly as it was rendered.",
        ],
      },
      {
        title: "Data storage",
        steps: [
          "Every module saves to Supabase: content and settings, calculation logs, enquiries, Zero registrations, bans, the outbox and library files.",
          "Data storage checks each table and the library bucket live. A red line names what is missing.",
          "When a table is missing, run supabase/migrations/003_app_data.sql in the Supabase SQL editor and reload the page.",
        ],
      },
    ],
    tips: ["Usage limits live with each tool: Freight Calculator, Pricing; Netback, Costs & limits; and Aquibot, Settings."],
  },
  {
    id: "import",
    group: "Moving",
    title: "Import from WordPress",
    icon: "import",
    href: "/admin/import",
    summary:
      "Brings Telex, indicators, hedge tables, freight routes, tools commentary, the library and Order Desk enquiries across from Aquifert One on WordPress.",
    tasks: [
      {
        title: "Run an import",
        steps: [
          "Download the export plugin, install it in WordPress, and download the export. The plugin only reads content.",
          "Upload the export here and choose what to bring across. The preview compares it with what this app has now.",
          "Click Import. Items update in place, so running it again never duplicates them. Library files are copied one at a time.",
          "Spot-check each module afterwards, starting with the latest Telex and hedge report.",
        ],
      },
    ],
  },
];

export const GUIDE_GROUPS = Array.from(new Set(GUIDE.map((section) => section.group)));

export function sectionText(section: GuideSection) {
  return [section.title, section.summary, ...section.tasks.flatMap((task) => [task.title, ...task.steps]), ...(section.tips ?? [])]
    .join(" ")
    .toLowerCase();
}
