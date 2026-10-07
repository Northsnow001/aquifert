import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { SiteContentEditor } from "@/components/admin/site-content/editor";
import { PageHeader } from "@/components/admin/ui";
import { DEFAULT_SITE_CONTENT } from "@/lib/site-content/defaults";
import { SITE_PAGE_KEYS, SITE_SCHEMA, type SiteContentMeta, type SitePageKey } from "@/lib/site-content/schema";
import { getSiteContentForEdit } from "@/lib/site-content/store";

export const dynamic = "force-dynamic";

const stamp = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default async function SiteContentPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const pageKey: SitePageKey = SITE_PAGE_KEYS.includes(params.page as SitePageKey) ? (params.page as SitePageKey) : "home";
  const page = SITE_SCHEMA[pageKey];

  let loaded: Awaited<ReturnType<typeof getSiteContentForEdit>> | null = null;
  let loadError = "";
  try {
    loaded = await getSiteContentForEdit();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "The saved website content could not be read.";
  }
  const meta: SiteContentMeta = loaded?.meta ?? {};

  return (
    <div className="mx-auto max-w-[1440px]">
      <PageHeader
        title="Website content"
        description="Edit the wording, pictures, videos and links on the public website. Each save shows on the live site straight away."
      />

      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-border" aria-label="Website pages">
        {SITE_PAGE_KEYS.map((key) => {
          const active = key === pageKey;
          const saved = meta[key];
          return (
            <Link
              key={key}
              href={`?page=${key}`}
              aria-current={active ? "page" : undefined}
              title={SITE_SCHEMA[key].description}
              className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13.5px] font-semibold no-underline transition ${
                active ? "border-blue text-blue" : "border-transparent text-mid hover:text-ink"
              }`}
            >
              {SITE_SCHEMA[key].label}
              {saved ? <span className="rounded-full bg-[#eaf5f0] px-1.5 py-px font-mono text-[10.5px] text-[#2f6f57]">{stamp(saved.at)}</span> : null}
            </Link>
          );
        })}
      </nav>

      <p className="mb-4 text-[13px] text-mid">
        <span className="font-semibold text-ink">{page.label}</span>
        {page.path ? <span className="font-mono text-[12px] text-dim"> · {page.path}</span> : null} · {page.description}
      </p>

      {loaded ? (
        <SiteContentEditor
          key={`${pageKey}-${meta[pageKey]?.at ?? "launch"}`}
          pageKey={pageKey}
          initial={loaded.content[pageKey]}
          defaults={DEFAULT_SITE_CONTENT[pageKey]}
          savedAt={meta[pageKey]?.at ?? null}
          savedBy={meta[pageKey]?.by ?? null}
        />
      ) : (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-danger">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">The saved website content could not be loaded, so editing is paused to avoid overwriting it.</p>
            <p className="mt-0.5">{loadError} Check Settings › Data storage, then reload this page.</p>
          </div>
        </div>
      )}
    </div>
  );
}
