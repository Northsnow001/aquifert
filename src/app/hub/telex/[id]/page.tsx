import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";
import { btnPrimary } from "@/components/app/form";
import { Disclaimer, FeedThumb, ProductChip, StoryImage, Tag, ToneBadge } from "@/components/hub/kit";
import { Markdown } from "@/components/hub/markdown";
import { getHubAccess } from "@/lib/aq-modules/access";
import { publishedTelex, telexView } from "@/lib/aq-modules/telex";
import { FILE_ACCESS_LABEL, formatStamp, telexHeadline } from "@/lib/content-types";
import { getHubContent } from "@/lib/hub-content";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/hub/telex/[id]">): Promise<Metadata> {
  const { id } = await params;
  const item = (await getHubContent()).telex.find((entry) => entry.id === id);
  return { title: item?.status === "published" ? telexHeadline(item) : "TELEX" };
}

const STATUS_NOTE = { draft: "Draft. Members do not see this yet.", private: "Private. Only admins can see this." } as const;

export default async function TelexStoryPage({ params }: PageProps<"/hub/telex/[id]">) {
  const { id } = await params;
  const [{ user, admin }, content] = await Promise.all([getHubAccess(), getHubContent()]);
  const source = content.telex.find((entry) => entry.id === id);
  if (!source || (source.status !== "published" && !admin)) notFound();

  const plan = admin ? "all" : user.plan;
  const published = publishedTelex(content.telex, plan);
  const item = published.find((entry) => entry.id === source.id) ?? telexView(source, plan);
  const more = published
    .filter((entry) => entry.id !== item.id && entry.readable)
    .slice(0, 4);
  const edited = item.updatedAt > item.publishedAt && item.updatedAt.slice(0, 16) !== item.publishedAt.slice(0, 16);

  return (
    <div className="mx-auto max-w-4xl pb-2">
      <Link href="/hub" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-blue no-underline hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to the hub
      </Link>

      <article className="aq-card aq-rise mt-3 overflow-hidden">
        <div className="relative aspect-[16/9] bg-s2 sm:aspect-[21/9]">
          <StoryImage product={item.product} src={item.thumb} pick={item.pick} sizes="(min-width: 1024px) 900px, 100vw" priority />
        </div>
        <div className="p-5 sm:p-7">
          {source.status !== "published" ? (
            <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] font-medium text-amber-800">{STATUS_NOTE[source.status]}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-1.5">
            <ProductChip product={item.product} />
            <ToneBadge tone={item.tone} />
            {item.access !== "public" ? <Tag tone="blue">{FILE_ACCESS_LABEL[item.access]}</Tag> : null}
            {item.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-border px-2 py-0.5 text-[11.5px] font-medium text-mid">
                {tag}
              </span>
            ))}
          </div>
          <h1 className="mt-3 text-[24px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[30px]">{item.headline}</h1>
          <p className="mt-2 text-[13.5px] text-dim">
            {item.author || "Aquifert Desk"} · {formatStamp(item.publishedAt)} desk time
            {edited ? <> · Updated {formatStamp(item.updatedAt)}</> : null}
          </p>

          {item.readable ? (
            <Markdown text={item.paragraphs.join("\n\n")} images className="mt-5 text-[16px] leading-relaxed text-ink" />
          ) : (
            <div className="mt-5 flex flex-col items-start gap-3 rounded-xl border border-blue/20 bg-blue-light/50 p-5">
              <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <Lock className="h-4 w-4 text-blue" /> This is an {FILE_ACCESS_LABEL[item.access]} flash
              </p>
              <p className="text-[14.5px] leading-relaxed text-mid">Your plan shows the headline. Upgrade to read the full story and everything else the desk files for this tier.</p>
              <Link href="/hub/account/membership" className={btnPrimary}>
                Compare plans
              </Link>
            </div>
          )}

          <div className="mt-6 border-t border-border pt-4">
            <Disclaimer />
          </div>
        </div>
      </article>

      {more.length ? (
        <section className="mt-6" aria-labelledby="more-telex">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="more-telex" className="text-[17px] font-semibold text-ink">
              More from TELEX
            </h2>
            <Link href="/hub/telex" className="inline-flex items-center gap-1 text-[14px] font-semibold text-blue no-underline hover:underline">
              Full feed <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {more.map((entry) => (
              <Link key={entry.id} href={`/hub/telex/${entry.id}`} className="aq-card aq-lift group flex gap-3 p-3.5 no-underline">
                <FeedThumb product={entry.product} src={entry.thumb} pick={entry.pick} size={64} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ProductChip product={entry.product} small />
                    <span className="font-mono text-[11.5px] tabular-nums text-dim">{formatStamp(entry.publishedAt)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[14.5px] font-semibold leading-snug text-ink group-hover:text-blue">{entry.headline}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
