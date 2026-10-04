import { Fragment } from "react";
import type { LegalBlock, LegalDoc } from "@/lib/legal/documents";

const TOKENS = /([\w.+-]+@aquifert\.com|ico\.org\.uk)/g;

/** Links the contact emails and the ICO site; everything else stays plain text. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKENS).map((part, index) =>
        index % 2 === 1 ? (
          <a
            key={index}
            href={part.includes("@") ? `mailto:${part}` : `https://${part}`}
            {...(part.includes("@") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
            className="font-medium text-teal-700 underline decoration-teal-700/30 underline-offset-2 hover:decoration-teal-700"
          >
            {part}
          </a>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

const LABEL = /^([A-Z][^:;]{1,60}):\s([\s\S]*)$/;

function Item({ text }: { text: string }) {
  const match = LABEL.exec(text);
  if (!match) return <Rich text={text} />;
  return (
    <>
      <strong className="font-semibold text-navy-900">{match[1]}:</strong> <Rich text={match[2]} />
    </>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") {
    return (
      <p>
        <Rich text={block} />
      </p>
    );
  }
  return (
    <ul className="space-y-2 ps-1">
      {block.map((item) => (
        <li key={item} className="relative ps-5 before:absolute before:left-0 before:top-[0.6em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-teal-500">
          <Item text={item} />
        </li>
      ))}
    </ul>
  );
}

/** Numbered contents list linking to each section anchor. */
export function LegalContents({ doc, className = "" }: { doc: LegalDoc; className?: string }) {
  return (
    <ol className={`space-y-1.5 text-[14px] ${className}`}>
      {doc.sections.map((section, index) => (
        <li key={section.id}>
          <a href={`#${section.id}`} className="flex gap-2 text-slate-600 no-underline transition hover:text-teal-700">
            <span className="w-5 shrink-0 text-right tabular-nums text-slate-400">{index + 1}.</span>
            <span>{section.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

export function LegalSections({ doc }: { doc: LegalDoc }) {
  return (
    <div className="space-y-9">
      {doc.sections.map((section, index) => (
        <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-28">
          <h2 id={`${section.id}-title`} className="text-[19px] font-bold tracking-tight text-navy-900">
            <span className="me-2 tabular-nums text-teal-600">{index + 1}.</span>
            {section.title}
          </h2>
          <div className="mt-3 space-y-3 text-[15.5px] leading-[1.7] text-slate-700">
            {section.body.map((block, blockIndex) => (
              <Block key={blockIndex} block={block} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
