import Link from "next/link";
import { BookOpen, Crown, Lock, Paperclip } from "lucide-react";
import { FeedThumb, Tag } from "@/components/hub/kit";
import { formatDay } from "@/lib/content-types";
import { AccessBadge } from "./access-badge";
import { DESK_HREF, fileFacts, fileProduct, hasValue, unlockFor, type LibraryFile } from "./model";

const btnRead =
  "inline-flex h-10 items-center gap-1.5 rounded-full bg-blue px-4 text-[14.5px] font-semibold text-white no-underline shadow-[0_6px_16px_-8px_rgb(47_111_179/0.7)] transition hover:bg-blue-dim";
const btnUnlock =
  "inline-flex h-10 items-center gap-1.5 rounded-full bg-navy-700 px-4 text-[14.5px] font-semibold text-white no-underline transition hover:bg-navy-800";

export function LibraryCard({ file, featured = false }: { file: LibraryFile; featured?: boolean }) {
  const href = `/hub/library/${file.id}`;
  const facts = fileFacts(file);
  const unlock = unlockFor(file.access);
  const LockIcon = file.access === "enterprise" ? Crown : Lock;

  return (
    <article className={`aq-card aq-lift relative ${featured ? "border-teal-200 bg-gradient-to-br from-teal-50/70 via-white to-white p-5 sm:p-7" : "p-4 sm:p-5"}`}>
      <div className="flex gap-3 sm:gap-4">
        <FeedThumb product={fileProduct(file)} size={featured ? 64 : 48} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {featured ? <Tag tone="teal">Latest</Tag> : null}
            {file.collectionNames.map((name) => (
              <Tag key={name} tone="blue">
                {name}
              </Tag>
            ))}
            {facts ? <Tag>{facts}</Tag> : null}
            <AccessBadge access={file.access} className="ml-auto" />
          </div>

          <h2 className={`mt-2.5 font-semibold leading-snug tracking-[-0.01em] text-ink ${featured ? "text-[20px] sm:text-[24px]" : "text-[17.5px]"}`}>
            <Link href={href} className="text-ink no-underline hover:text-blue hover:underline">
              {file.title}
            </Link>
          </h2>
          {hasValue(file.updated) ? <p className="mt-1 text-[13.5px] text-dim">Updated {formatDay(file.updated)}</p> : null}
          {file.summary ? (
            <p className={`mt-2 leading-relaxed text-mid ${featured ? "line-clamp-3 text-[16px]" : "line-clamp-2 text-[15px]"}`}>{file.summary}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            {file.readable ? (
              <Link href={href} className={btnRead}>
                <BookOpen className="h-4 w-4" aria-hidden />
                Read<span className="sr-only">: {file.title}</span>
              </Link>
            ) : (
              <>
                <Link href={unlock.href} className={btnUnlock}>
                  <LockIcon className="h-4 w-4" aria-hidden />
                  Unlock with {unlock.label}
                </Link>
                <Link href={DESK_HREF} className="text-[14.5px] font-semibold text-blue no-underline hover:underline">
                  Talk to the desk
                </Link>
              </>
            )}
            {file.storedName ? (
              <span className="inline-flex items-center gap-1 text-[13px] text-dim">
                <Paperclip className="h-3.5 w-3.5" aria-hidden />
                {hasValue(file.type) ? `${file.type} inside` : "File inside"}
              </span>
            ) : null}
            {hasValue(file.author) ? <span className="text-[13px] text-dim sm:ml-auto">By {file.author}</span> : null}
          </div>
        </div>
      </div>
    </article>
  );
}
