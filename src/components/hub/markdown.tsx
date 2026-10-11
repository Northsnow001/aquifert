import type { ReactNode } from "react";
import { HIGHLIGHT_HEX, TEXT_COLORS, listTrees, parseMarkdown, type Align, type Inline, type ListKind, type ListTree } from "@/lib/rich-text/markdown";

type Options = { images: boolean };

/**
 * Renders the desk's Markdown as React elements (no raw HTML): headings, emphasis, colour and highlight,
 * code, quotes, nested and lettered lists, links, rules, aligned paragraphs and pipe tables. Images
 * render only when `images` is set, so model output can never load third-party URLs.
 */
export function Markdown({ text, className = "text-[15.5px]", images = false }: { text: string; className?: string; images?: boolean }) {
  const options = { images };
  return (
    <div className={`space-y-2.5 leading-relaxed ${className}`}>
      {parseMarkdown(text).map((block, key) => {
        if (block.t === "p") {
          return (
            <p key={key} className={block.align ? ALIGN_CLASS[block.align] : undefined}>
              {inline(block.c, `p${key}`, options)}
            </p>
          );
        }
        if (block.t === "h") {
          const Tag = block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
          return (
            <Tag key={key} className={`pt-1 font-bold leading-snug text-ink ${HEADING_SIZE[block.level]}${block.align ? ` ${ALIGN_CLASS[block.align]}` : ""}`}>
              {inline(block.c, `h${key}`, options)}
            </Tag>
          );
        }
        if (block.t === "list") return listTrees(block.items).map((tree, n) => list(tree, `l${key}-${n}`, options, 0));
        if (block.t === "quote") {
          return (
            <blockquote key={key} className="border-l-2 border-border pl-3 text-mid">
              {inline(block.c, `q${key}`, options)}
            </blockquote>
          );
        }
        if (block.t === "pre") {
          return (
            <pre key={key} className="overflow-x-auto rounded-lg bg-s2 px-3 py-2 font-mono text-[13.5px]">
              {block.v}
            </pre>
          );
        }
        if (block.t === "hr") return <hr key={key} className="border-border" />;
        return (
          <div key={key} className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-[14.5px]">
              <thead className="bg-s2">
                <tr>
                  {block.head.map((cell, c) => (
                    <th key={c} className={`px-3 py-1.5 font-semibold text-ink ${ALIGN_CLASS[block.align[c] ?? "left"]}`}>
                      {inline(cell, `th${key}-${c}`, options)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {block.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td key={c} className={`px-3 py-1.5 align-top ${ALIGN_CLASS[block.align[c] ?? "left"]}`}>
                        {inline(cell, `td${key}-${r}-${c}`, options)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

const ALIGN_CLASS: Record<Align, string> = { left: "text-left", center: "text-center", right: "text-right", justify: "text-justify" };
const HEADING_SIZE = { 1: "text-[19px]", 2: "text-[17px]", 3: "text-[16px]" } as const;
const LIST_STYLE: Record<ListKind, string> = { ul: "list-disc", ol: "list-decimal", a: "list-[aq-lower-paren]", A: "list-[aq-upper-paren]" };

function list(tree: ListTree, key: string, options: Options, depth: number): ReactNode {
  const style = tree.kind === "ul" && depth > 0 ? "list-[circle]" : LIST_STYLE[tree.kind];
  const children = tree.items.map((item, n) => (
    <li key={n}>
      {inline(item.c, `${key}-${n}`, options)}
      {item.children.map((child, c) => list(child, `${key}-${n}-${c}`, options, depth + 1))}
    </li>
  ));
  if (tree.kind === "ul") {
    return (
      <ul key={key} className={`space-y-1 pl-5 ${style} marker:text-dim ${depth ? "mt-1" : ""}`}>
        {children}
      </ul>
    );
  }
  return (
    <ol key={key} start={tree.start !== 1 ? tree.start : undefined} className={`space-y-1 pl-5 ${style} marker:text-dim ${depth ? "mt-1" : ""}`}>
      {children}
    </ol>
  );
}

function inline(nodes: Inline[], keyBase: string, options: Options): ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyBase}-${index}`;
    switch (node.t) {
      case "text":
        return node.v;
      case "br":
        return <br key={key} />;
      case "code":
        return (
          <code key={key} className="rounded bg-s2 px-1 py-px font-mono text-[13.5px]">
            {node.v}
          </code>
        );
      case "img":
        return options.images ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote hosts, sized by the reader
          <img key={key} src={node.src} alt={node.alt} loading="lazy" referrerPolicy="no-referrer" className="my-1 inline-block max-h-[420px] max-w-full rounded-lg border border-border" />
        ) : (
          node.alt
        );
      case "link":
        return (
          <a key={key} href={node.href} target="_blank" rel="noreferrer noopener" className="text-blue underline underline-offset-2">
            {inline(node.c, key, options)}
          </a>
        );
      case "color":
        return (
          <span key={key} style={{ color: TEXT_COLORS[node.color].hex }}>
            {inline(node.c, key, options)}
          </span>
        );
      case "strong":
        return (
          <strong key={key} className="font-semibold text-ink">
            {inline(node.c, key, options)}
          </strong>
        );
      case "em":
        return <em key={key}>{inline(node.c, key, options)}</em>;
      case "u":
        return (
          <u key={key} className="underline-offset-2">
            {inline(node.c, key, options)}
          </u>
        );
      case "s":
        return <s key={key}>{inline(node.c, key, options)}</s>;
      case "mark":
        return (
          <mark key={key} className="rounded-[3px] px-0.5 text-[#1f2937]" style={{ backgroundColor: HIGHLIGHT_HEX }}>
            {inline(node.c, key, options)}
          </mark>
        );
      case "sup":
        return <sup key={key}>{inline(node.c, key, options)}</sup>;
      case "sub":
        return <sub key={key}>{inline(node.c, key, options)}</sub>;
    }
  });
}
