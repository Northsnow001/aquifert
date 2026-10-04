import Link from "next/link";
import { DebugPanel } from "@/components/admin/aquibot/debug-panel";
import { ExtractionPanel } from "@/components/admin/aquibot/extraction-panel";
import { KnowledgePanel, SetupCard } from "@/components/admin/aquibot/knowledge-panel";
import { LogsPanel } from "@/components/admin/aquibot/logs-panel";
import { PromptPanel } from "@/components/admin/aquibot/prompt-panel";
import { SessionsPanel } from "@/components/admin/aquibot/sessions-panel";
import { SettingsPanel } from "@/components/admin/aquibot/settings-panel";
import { VocabularyPanel } from "@/components/admin/aquibot/vocabulary-panel";
import { PageHeader } from "@/components/admin/ui";
import { DEFAULT_EXTRACTION, parseStopWords, parseSynonyms } from "@/lib/aquibot";
import { knowledgeInventory, knowledgeSources, type KnowledgeRow } from "@/lib/aquibot-engine/indexer";
import { chunkCount, engineStatus, getSessionRow, listLogs, listSessions, sessionMessages, sessionStats, type LogKind } from "@/lib/aquibot-engine/store";
import { formatStamp } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TABS = [
  { key: "prompt", label: "Prompt" },
  { key: "settings", label: "Settings" },
  { key: "vocabulary", label: "Vocabulary" },
  { key: "extraction", label: "Extraction rules" },
  { key: "knowledge", label: "Knowledge base" },
  { key: "sessions", label: "Sessions" },
  { key: "debug", label: "Retrieval debug" },
  { key: "logs", label: "Logs" },
] as const;

type Tab = (typeof TABS)[number]["key"];
type Params = { tab?: string; q?: string; page?: string; session?: string; kind?: string };

const SESSION_PAGE = 25;
const LOG_KINDS: LogKind[] = ["index", "connection", "chat"];

export default async function AquibotAdminPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const tab: Tab = TABS.some((item) => item.key === params.tab) ? (params.tab as Tab) : "prompt";
  const content = await getHubContent();
  const { aquibot } = content;
  const status = await engineStatus();
  const vocabularyIssues = parseSynonyms(aquibot.synonyms).issues.length;
  const customRules = (Object.keys(DEFAULT_EXTRACTION) as (keyof typeof DEFAULT_EXTRACTION)[]).filter((key) => aquibot.extraction[key].trim() !== DEFAULT_EXTRACTION[key]).length;
  const { settings } = aquibot;
  const limit = (value: number) => (value === 0 ? "∞" : value.toLocaleString());

  let inventory: { rows: KnowledgeRow[]; orphans: { id: string; title: string; chunk_count: number }[] } = { rows: [], orphans: [] };
  let inventoryError: string | null = null;
  if (status.ready) {
    try {
      inventory = await knowledgeInventory(content);
    } catch (error) {
      inventoryError = error instanceof Error ? error.message : "Could not read the index.";
    }
  }
  const needsIndexing = inventory.rows.filter((row) => row.state === "not_indexed" || row.state === "outdated" || row.state === "error").length;

  const stats = [
    {
      label: "Live prompt",
      value: aquibot.prompt.published ? "Custom" : "Built-in",
      meta: aquibot.prompt.published && aquibot.prompt.publishedAt ? `Published ${formatStamp(aquibot.prompt.publishedAt)}` : "Default Aquibot prompt",
      href: "?tab=prompt",
      tone: "text-ink",
    },
    {
      label: "Monthly limits",
      value: `${limit(settings.limitCore)} · ${limit(settings.limitGrowth)} · ${limit(settings.limitEnterprise)}`,
      meta: "AQ ONE · AQ Analytics · AQ ZERO",
      href: "?tab=settings",
      tone: "text-ink",
    },
    {
      label: "Vocabulary",
      value: `${parseSynonyms(aquibot.synonyms).entries.length} / ${parseStopWords(aquibot.stopWords).words.length}`,
      meta: vocabularyIssues ? `Synonyms / stop words · ${vocabularyIssues} to check` : "Synonyms / stop words",
      href: "?tab=vocabulary",
      tone: "text-ink",
    },
    status.ready
      ? {
          label: "Chat engine",
          value: needsIndexing ? `${needsIndexing} to index` : "Live",
          meta: `${inventory.rows.filter((row) => row.state === "indexed").length} sources indexed · ${settings.answerModel}`,
          href: "?tab=knowledge",
          tone: needsIndexing ? "text-[#9a5b00]" : "text-[#1f7a45]",
        }
      : { label: "Chat engine", value: "Needs setup", meta: status.problem ?? "Finish setup", href: "?tab=knowledge", tone: "text-[#9a5b00]" },
  ];

  const badge: Partial<Record<Tab, string>> = {
    vocabulary: vocabularyIssues ? String(vocabularyIssues) : undefined,
    extraction: customRules ? `${customRules} custom` : undefined,
    knowledge: !status.ready ? "setup" : needsIndexing ? String(needsIndexing) : undefined,
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Aquibot Trader AI" description="Control how Aquibot answers members: the system prompt, usage limits, retrieval tuning, query vocabulary, the knowledge base and member conversations." />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-2xl border border-border bg-surface px-4 py-3.5 no-underline shadow-[0_1px_2px_rgba(26,58,92,0.05)] transition hover:border-blue/40"
          >
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">{stat.label}</p>
            <p className={`mt-1 text-[18px] font-bold tracking-tight ${stat.tone}`}>{stat.value}</p>
            <p className="mt-0.5 truncate text-[12px] text-mid">{stat.meta}</p>
          </Link>
        ))}
      </div>

      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-border" aria-label="Aquibot sections">
        {TABS.map((item) => {
          const active = item.key === tab;
          return (
            <Link
              key={item.key}
              href={`?tab=${item.key}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13.5px] font-semibold no-underline transition ${
                active ? "border-blue text-blue" : "border-transparent text-mid hover:text-ink"
              }`}
            >
              {item.label}
              {badge[item.key] ? (
                <span className={`rounded-full px-1.5 py-px font-mono text-[10.5px] ${item.key === "extraction" ? "bg-blue-light text-blue" : "bg-[#fff6e5] text-[#9a5b00]"}`}>{badge[item.key]}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {tab === "prompt" ? <PromptPanel initial={aquibot.prompt} /> : null}
      {tab === "settings" ? <SettingsPanel initial={settings} /> : null}
      {tab === "vocabulary" ? <VocabularyPanel synonyms={aquibot.synonyms} stopWords={aquibot.stopWords} /> : null}
      {tab === "extraction" ? <ExtractionPanel initial={aquibot.extraction} /> : null}
      {tab === "knowledge" ? (
        inventoryError ? (
          <ErrorCard message={inventoryError} />
        ) : (
          status.ready ? (
            <KnowledgePanel status={status} rows={inventory.rows} orphans={inventory.orphans} chunkTotal={await chunkCount()} />
          ) : (
            <SetupCard status={status} sources={knowledgeSources(content).length} />
          )
        )
      ) : null}
      {tab === "sessions" ? await sessionsTab(status.ready, params) : null}
      {tab === "debug" ? status.ready ? <DebugPanel hasTestPrompt={Boolean(aquibot.prompt.test.trim())} /> : <SetupCard status={status} /> : null}
      {tab === "logs" ? await logsTab(status.ready, params) : null}
    </div>
  );
}

async function sessionsTab(ready: boolean, params: Params) {
  if (!ready) return <SetupCard status={await engineStatus()} />;
  const page = Math.max(1, Number(params.page) || 1);
  const search = (params.q ?? "").slice(0, 120);
  try {
    const [list, stats, selectedRow] = await Promise.all([
      listSessions({ search, limit: SESSION_PAGE, offset: (page - 1) * SESSION_PAGE }),
      sessionStats(),
      params.session ? getSessionRow(params.session) : Promise.resolve(null),
    ]);
    const selected = selectedRow ? { session: selectedRow, messages: await sessionMessages(selectedRow.id) } : null;
    return <SessionsPanel rows={list.rows} total={list.total} page={page} pageSize={SESSION_PAGE} search={search} stats={stats} selected={selected} />;
  } catch (error) {
    return <ErrorCard message={error instanceof Error ? error.message : "Could not load sessions."} />;
  }
}

async function logsTab(ready: boolean, params: Params) {
  if (!ready) return <SetupCard status={await engineStatus()} />;
  const kind = LOG_KINDS.find((value) => value === params.kind);
  return <LogsPanel rows={await listLogs({ kind, limit: 300 })} kind={kind ?? "all"} />;
}

function ErrorCard({ message }: { message: string }) {
  return <p className="rounded-2xl border border-[#f3c9c5] bg-[#fdf2f1] px-5 py-4 text-[13px] text-[#b42318]">{message}</p>;
}
