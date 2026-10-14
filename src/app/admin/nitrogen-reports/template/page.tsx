import Link from "next/link";
import { ContentPanel } from "@/components/admin/nitrogen/content-panel";
import { DesignPanel } from "@/components/admin/nitrogen/design-panel";
import { PageHeader } from "@/components/admin/ui";
import { AQUIBOT_MODELS } from "@/lib/aquibot";
import { formatStamp } from "@/lib/content-types";
import { DEFAULT_BRIEF_PROMPT, visibleSections } from "@/lib/nitrogen/template";
import { getNitrogenTemplateForEdit } from "@/lib/nitrogen/template-store";
import { aiAvailable } from "@/lib/nitrogen/writer";

export const dynamic = "force-dynamic";
/** A sample run waits for the AI writer. */
export const maxDuration = 120;

const TABS = [
  { key: "content", label: "Content & prompt" },
  { key: "design", label: "Design" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export default async function NitrogenTemplatePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: requested } = await searchParams;
  const tab: Tab = TABS.some((item) => item.key === requested) ? (requested as Tab) : "content";
  const template = await getNitrogenTemplateForEdit();
  const { content, design, meta } = template;
  const ready = aiAvailable();
  const shown = visibleSections(design).length;
  const model = AQUIBOT_MODELS.find((item) => item.value === content.model)?.label ?? content.model;

  const stats = [
    {
      label: "Writing",
      value: !content.aiEnabled ? "Desk rules" : ready ? "AI" : "AI (needs key)",
      meta: content.aiEnabled ? model : "Fixed desk wording",
      tone: content.aiEnabled && !ready ? "text-[#9a5b00]" : "text-ink",
      href: "?tab=content",
    },
    {
      label: "Prompt",
      value: content.prompt.trim() === DEFAULT_BRIEF_PROMPT.trim() ? "Built-in" : "Custom",
      meta: meta.content ? `Saved ${formatStamp(meta.content.at)}${meta.content.by ? ` by ${meta.content.by}` : ""}` : "Not changed yet",
      tone: "text-ink",
      href: "?tab=content",
    },
    {
      label: "Design",
      value: `${shown} of ${design.sections.length} sections`,
      meta: meta.design ? `Saved ${formatStamp(meta.design.at)}${meta.design.by ? ` by ${meta.design.by}` : ""}` : "Launch design",
      tone: "text-ink",
      href: "?tab=design",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Nitrogen report template"
        description="Control what the Nitrogen report says and how it looks. Content and prompt changes apply to reports generated after you save. Design changes apply to every report, including ones already generated."
        crumbs={[{ href: "/admin/nitrogen-reports", label: "Nitrogen reports" }]}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-2xl border border-border bg-surface px-4 py-3.5 no-underline shadow-[0_1px_2px_rgba(26,58,92,0.05)] transition hover:border-blue/40">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-dim">{stat.label}</p>
            <p className={`mt-1 text-[18px] font-bold tracking-tight ${stat.tone}`}>{stat.value}</p>
            <p className="mt-0.5 text-[12px] text-mid sm:truncate">{stat.meta}</p>
          </Link>
        ))}
      </div>

      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-border" aria-label="Template sections">
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
            </Link>
          );
        })}
      </nav>

      {tab === "content" ? <ContentPanel initial={content} savedAt={meta.content?.at ?? null} aiReady={ready} design={design} /> : null}
      {tab === "design" ? <DesignPanel initial={design} savedAt={meta.design?.at ?? null} reference={content.reference} /> : null}
    </div>
  );
}
